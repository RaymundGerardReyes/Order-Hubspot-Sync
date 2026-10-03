# HubSpot Order Sync: Integration Pipeline

[![Version](https://img.shields.io/badge/version-v1.1.0-blue.svg)](VERSION)
[![SemVer](https://img.shields.io/badge/SemVer-2.0.0-green.svg)](https://semver.org)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20%7C%2022-339933.svg?logo=node.js)](receiver/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-black.svg?logo=fastify)](receiver/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57.svg?logo=sqlite)](receiver/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg?logo=next.js)](web/)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B%20%7C%208.4-777BB4.svg?logo=php)](exporter/)

A robust, production-grade HubSpot e-commerce synchronization system implementing **at-least-once webhook delivery with an exactly-once business effect**. The architecture implements all core integration requirements (Req 22–27) within a single Node.js/TypeScript service, an operational Next.js dashboard, and a standalone PHP script for 7-day HubSpot deal CSV export (Language B, Req 28).

---

## Table of Contents
- [Architecture Overview & Technology Split](#architecture-overview--technology-split)
- [End-to-End Sequence & State Machine](#end-to-end-sequence--state-machine)
- [Requirements Coverage Matrix](#requirements-coverage-matrix)
- [HubSpot Setup Guide](#hubspot-setup-guide)
  - [1. App Scopes](#1-app-scopes)
  - [2. Unique Identifier Property: `external_order_id`](#2-unique-identifier-property-external_order_id)
  - [3. Discover Pipeline & Stage IDs](#3-discover-pipeline--stage-ids)
- [Local Installation & Setup](#local-installation--setup)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running the Services](#running-the-services)
- [Testing the Pipeline](#testing-the-pipeline)
  - [Mock Webhook Sender](#mock-webhook-sender)
  - [Automated Tests](#automated-tests)
- [Language B CSV Exporter (Req 28)](#language-b-csv-exporter-req-28)
- [Webhook Security & Verification](#webhook-security--verification)
- [Two-Tier Idempotency Architecture](#two-tier-idempotency-architecture)
- [Reliability & Retry Strategy](#reliability--retry-strategy)
- [Design Assumptions](#design-assumptions)
- [Future Improvements & Production Hardening](#future-improvements--production-hardening)

---

## Architecture Overview & Technology Split

```mermaid
flowchart LR
    Store["Online Store / Mock Sender"]
    Receiver["Node.js + TypeScript API (:3001)"]
    DB[("SQLite Database")]
    Worker["In-Process Async Worker"]
    HS["HubSpot CRM REST API"]
    UI["Next.js Dashboard (:3000)"]
    Exporter["PHP 8.4 Exporter"]
    CSV[("deals_export.csv")]

    Store -->|"POST /webhooks/orders\nraw JSON + HMAC"| Receiver
    Receiver -->|"verify HMAC + validate schema"| Receiver
    Receiver -->|"insert order (PK) & attempt"| DB
    Receiver -->|"202 Accepted"| Store
    Worker -->|"claim pending attempt"| DB
    Worker -->|"contact search & upsert"| HS
    Worker -->|"deal lookup (external_order_id) / create"| HS
    Worker -->|"record success / failure + IDs"| DB
    UI -->|"GET /api/sync-attempts?limit=50"| Receiver
    UI -->|"POST /api/orders/:orderId/retry"| Receiver
    Exporter -->|"search deals (last 7 days + pagination)"| HS
    Exporter --> CSV
```

### Component Breakdown

| Component | Language & Tools | Role & Coverage |
|---|---|---|
| **API & Sync Engine** | Node.js 22, TypeScript, Fastify, better-sqlite3 | **Requirements 22–27**: Webhook reception, raw HMAC-SHA256 verification, strict schema validation, SQLite persistence, contact upsert, deal idempotency, error retry/backoff, and dashboard REST API. |
| **Operational Dashboard** | Next.js 15, React 19, TypeScript | **Requirement 27**: Live operational dashboard displaying recent 50 sync attempts, status badges, HubSpot CRM IDs, and manual retry button. |
| **Accounting Exporter** | PHP 8.4, Native cURL, CLI | **Requirement 28 (Language B)**: Standalone zero-dependency script querying HubSpot deals created in the last 7 days with automatic cursor pagination streaming to CSV. |
| **Workflow Automation** | n8n low-code workflow | **Bonus Requirement**: Ingestion, HMAC verification, contact upsert, and error notification workflow export. |

---

## End-to-End Sequence & State Machine

```mermaid
sequenceDiagram
    autonumber
    participant S as Store / Mock Sender
    participant N as Node.js API (:3001)
    participant D as SQLite (WAL)
    participant H as HubSpot CRM
    participant U as Sales Operator / UI

    S->>N: POST /webhooks/orders + X-Webhook-Signature + raw JSON
    N->>N: Verify HMAC against raw buffer (timing-safe)
    alt Signature Missing / Invalid
        N-->>S: 401 Unauthorized
    else Signature Valid
        N->>N: Validate payload schema (event, ISO offset, minor-unit totals)
        alt Payload Invalid
            N-->>S: 422 Unprocessable Entity
        else Payload Valid
            N->>D: INSERT INTO orders (order_id) PRIMARY KEY
            alt New Order
                N->>D: INSERT INTO sync_attempts (status='pending')
                N-->>S: 202 Accepted (orderId, attemptId)
                N->>D: Atomically claim attempt (status='processing')
                N->>H: Search contact by email
                alt Contact Exists
                    N->>H: PATCH contact firstname, lastname, phone
                else Contact Absent
                    N->>H: POST contact
                end
                N->>H: Search deal by external_order_id
                alt Deal Exists
                    N->>H: Ensure contact association
                else Deal Absent
                    N->>H: POST deal with contact association
                end
                N->>D: Mark attempt succeeded (save deal & contact IDs)
                N->>D: Mark order succeeded (save canonical IDs)
            else Duplicate order_id (Req 24)
                N->>D: Read existing canonical order state
                N-->>S: 200 OK (duplicate=true, status, existing IDs)
            end
        end
    end

    U->>N: POST /api/orders/:orderId/retry
    N->>D: Check latest state is 'failed' (reject 409 if in-flight or succeeded)
    N->>D: INSERT INTO sync_attempts (trigger='manual_retry', status='pending')
    N-->>U: 202 Accepted (attemptId)
    N->>N: Dispatch idempotent sync worker using original orders.payload_json
```

---

## Requirements Coverage Matrix

| Requirement | Brief Specification | Architecture Implementation | Verification Evidence |
|:---:|---|---|---|
| **22** | Webhook Receiver (Language A: Node.js/TS) | Fastify server with raw-body preservation, HMAC-SHA256 timing-safe comparison, and strict Zod validation. | `receiver/src/server.ts`, `hmac.ts`, `schema.ts` |
| **23** | HubSpot Sync (Contact + Deal + Association) | Contact search by email, PATCH if found, POST if absent; Deal created with contact association in one call. | `receiver/src/hubspot/repository.ts`, `domain/sync.service.ts` |
| **24** | Idempotency | Dual-tier: SQLite `order_id` PRIMARY KEY + HubSpot unique `external_order_id` property search. | `receiver/src/db/repositories.ts`, `server.ts` |
| **25** | Reliability & Backoff | Retries `429` (respects `Retry-After`) and `5xx` with exponential backoff & jitter (max 4 attempts). Never retries permanent `4xx`. | `receiver/src/hubspot/client.ts` |
| **26** | Durable Storage | SQLite WAL mode with `orders` and append-only `sync_attempts` tables storing CRM IDs, error codes, and timestamps. | `receiver/src/db/migrations.ts`, `repositories.ts` |
| **27** | Dashboard | Next.js table displaying recent 50 sync attempts with live polling and selective retry button for failed attempts. | `web/src/features/syncs/*`, `receiver/src/server.ts` |
| **28** | Second Language (Language B: PHP) | Standalone PHP 8.4 script traversing HubSpot CRM Search API with cursor pagination, streaming results to CSV. | `exporter/export-deals.php` |
| **29** | Complete README | Full architectural guide, setup instructions, assumptions, and future scaling path. | `README.md` |
| **Bonus** | Docker Compose Stack | Multi-container setup for API and Next.js frontend with SQLite persistent volumes. | `docker-compose.yml` |
| **Bonus** | n8n Low-Code Workflow | Visual workflow with HMAC check, contact upsert, deal creation, and error notification flow. | `n8n/order-to-hubspot.json` |

---

## HubSpot Setup Guide

### 1. API Authentication: Service Keys (or Legacy Private Apps)
HubSpot has sunset legacy private app creation for new accounts in favor of **Service Keys** for direct API integrations from code:
- **For New Accounts (Service Keys)**:
  1. Click **Create a service key** on the migration banner or navigate to *Settings (⚙️) → Integrations → Service Keys* (direct URL: `https://app-na2.hubspot.com/service-keys/<YOUR_ACCOUNT_ID>`).
  2. Click **Create service key** and enter the name: `Order Sync Pipeline`.
  3. Grant the required 4 CRM scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`
  4. Generate and copy the bearer token into `.env` as `HUBSPOT_ACCESS_TOKEN`.
- **For Existing/Legacy Portals (Private Apps)**:
  If your portal still supports legacy private apps, create one under *Settings → Integrations → Private Apps* with the identical 4 scopes above. Both formats use standard HTTP `Authorization: Bearer <token>` authentication.

### 2. Unique Identifier Property: `external_order_id`
To ensure deal idempotency on the CRM layer (closing crash windows):
1. In HubSpot, navigate to *Settings → Data Management → Properties*.
2. Select **Deal properties** from the dropdown.
3. Click **Create property**:
   - **Label**: `External Order ID`
   - **Internal Name**: `external_order_id`
   - **Field Type**: Single-line text
   - **Uniqueness**: Select **Require unique values for this property** (or check *Unique value*).

### 3. Discover Pipeline & Stage IDs
Do not hardcode UI labels (like "Closed Won"). Retrieve your portal's internal pipeline and stage IDs:
```bash
curl -X GET "https://api.hubapi.com/crm/v3/pipelines/deals" \
  -H "Authorization: Bearer YOUR_HUBSPOT_ACCESS_TOKEN"
```
Look for:
- `id` under `results[0]` (e.g. `default`) → assign to `HUBSPOT_PIPELINE_ID`
- `id` under `stages` (e.g. `closedwon` or `1234567`) → assign to `HUBSPOT_DEAL_STAGE_ID`

---

## Local Installation & Setup

### Prerequisites
- **Node.js**: v20+ or v22 LTS
- **PHP**: v8.2+ or v8.4 (for Language B exporter) with `curl`
- **Git**: Configured with SSH access

### Environment Configuration
```bash
cp .env.example .env
```
Fill in `.env`:
```env
PORT=3001
DATABASE_URL=file:./data/order-sync.sqlite
WEBHOOK_SECRET=your_hmac_signing_secret_here

HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_PIPELINE_ID=default
HUBSPOT_DEAL_STAGE_ID=closedwon
HUBSPOT_ORDER_ID_PROPERTY=external_order_id

NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Running the Services

#### 1. Integration API (Node.js/TypeScript)
```bash
cd receiver
npm install
npm run dev
# Server listening on http://localhost:3001
```

#### 2. Web Dashboard (Next.js)
```bash
cd web
npm install
npm run dev
# Dashboard running at http://localhost:3000
```

#### 3. Docker Compose (Alternative)
```bash
docker compose up --build -d
```

---

## Testing the Pipeline

### Mock Webhook Sender
A test utility in `scripts/mock-webhook.ts` generates valid HMAC-SHA256 signatures over raw JSON bytes and dispatches to the receiver:

```bash
npx tsx scripts/mock-webhook.ts
```

Or test using `curl`:
```bash
BODY='{"event":"order.created","order_id":"ORD-10482","created_at":"2026-09-20T14:32:00+08:00","customer":{"email":"maria.santos@example.com","first_name":"Maria","last_name":"Santos","phone":"+639171234567"},"items":[{"sku":"TSH-BLK-M","name":"Black Tee (M)","qty":2,"price":450.00}],"currency":"PHP","total":900.00}'

SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "replace-with-a-long-random-secret" | awk '{print $2}')

curl -X POST http://localhost:3001/webhooks/orders \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY"
```

### Automated Tests
Run comprehensive test suites covering unit, integration, and regression tiers:
```bash
# In receiver/ directory:
npm test

# In web/ directory:
npm test
```

---

## Language B CSV Exporter (Req 28)

The second-language component is implemented in **standalone PHP 8.4** (`exporter/export-deals.php`). It requires no Laravel or Composer installation and uses native streaming with `fputcsv()`.

```bash
# Export all deals from the last 7 days:
php exporter/export-deals.php --days=7 --output=deals_export.csv
```

Features:
- Traverses the HubSpot Deals Search API with `createdate >= cutoff`.
- Exhausts all pagination cursors (`paging.next.after`).
- Memory-efficient streaming directly to disk.
- Writes header even when 0 deals match.
- Exits non-zero with diagnostic output on failure.

---

## Webhook Security & Verification

1. **Exact Raw-Body Verification**: In `receiver/src/server.ts`, Fastify's content type parser receives the raw payload as a `Buffer`. Verification occurs **before** JSON parsing to prevent discrepancies caused by key order or spacing.
2. **Timing-Safe Equality**: Verification in `receiver/src/hmac.ts` uses `crypto.timingSafeEqual()`, protecting against timing-attack vulnerabilities.
3. **Prefix Flexibility**: Accepts both `sha256=<hex>` and raw lowercase 64-character hexadecimal digests.

---

## Two-Tier Idempotency Architecture

To guarantee that duplicate webhooks never create duplicate deals in HubSpot:
1. **Local SQLite Guard**: The `orders` table defines `order_id TEXT PRIMARY KEY`. Simultaneous duplicate webhook posts hit SQLite's atomic uniqueness constraint via `INSERT ... ON CONFLICT DO NOTHING`, returning the canonical order state immediately.
2. **HubSpot Guard**: Before deal creation, the sync engine searches HubSpot for deals where `external_order_id = :orderId`. If a crash occurred after HubSpot deal creation but before local SQLite update, the retry finds the existing deal, associates it with the contact, and updates the local database.

---

## Reliability & Retry Strategy

HubSpot API requests (`receiver/src/hubspot/client.ts`) execute with automated retry:
- **Retryable Errors**: `429 Too Many Requests` (honors `Retry-After` header when provided) and `5xx Server Errors`.
- **Backoff Algorithm**: Exponential backoff (500ms, 1000ms, 2000ms) with random jitter (0–250ms). Maximum 4 total attempts.
- **Terminal Errors**: `400 Bad Request`, `401 Unauthorized`, and `422 Unprocessable Entity` immediately fail without looping to conserve quota.

---

## Design Assumptions

1. **HMAC Header**: Defaults to `X-Webhook-Signature` (with `X-Signature` supported as fallback).
2. **Close Date**: Mapped to midnight UTC of the order's `created_at` timestamp.
3. **Minor-Unit Validation**: Order totals are cross-checked against the sum of items (`sum(qty * price)`) in integer minor units (centavos) to reject corrupted payloads.
4. **Manual Retry Source**: Retries re-read the original payload from `orders.payload_json`; client-supplied request bodies on retry are discarded to prevent tampering.

---

## Future Improvements & Production Hardening

- **Timestamp & Nonce Replay Guard**: Require `X-Webhook-Timestamp` within a 5-minute validity window.
- **Dedicated Queue Broker**: Swap in-process `setImmediate` for BullMQ/Redis when sustaining >500 webhook deliveries/sec.
- **Multi-Tenant OAuth**: Expand authentication from private app tokens to HubSpot OAuth 2.0 flow.
- **Prometheus Metrics**: Export `/metrics` measuring ingestion latencies and upstream rate-limit occurrences.