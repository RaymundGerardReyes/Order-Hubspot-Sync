# Order to HubSpot Synchronization System

A high-reliability, 3-tier integration pipeline that receives incoming order webhooks, verifies HMAC signatures, deduplicates records, syncs deals and contacts to HubSpot CRM with exponential backoff and rate-limit handling, and provides a real-time Next.js monitoring dashboard.

Current Version: `v0.1.0` (SemVer 2.0.0)

---

## Architecture Overview

```
                                  [ Incoming Webhook ]
                                           │
                                           ▼ (HMAC-SHA256 verified)
                        ┌─────────────────────────────────────┐
                        │   Receiver Service (Language A)     │
                        │       Node.js / Fastify / TS        │
                        └──────────────────┬──────────────────┘
                                           │ (X-Internal-Token)
                                           ▼
                        ┌─────────────────────────────────────┐
                        │     Backend Core (Language B)       │
                        │        Laravel 11 / PHP 8.4         │
                        ├──────────────────┬──────────────────┤
                        │  ReceiveOrder    │   RetryAttempt   │
                        │  Action (Dedupe) │   Action         │
                        └────────┬─────────┴─────────▲────────┘
                                 │                   │
                                 ▼                   │
                        ┌──────────────────┐         │ (Retry)
                        │ SyncOrderJob     │         │
                        │ (DB Queue / Lock)│         │
                        └────────┬─────────┘         │
                                 │                   │
                                 ▼                   │
                        ┌──────────────────┐         │
                        │ HubspotGateway   │         │
                        │ (Client+Backoff) │         │
                        └────────┬─────────┘         │
                                 │                   │
                                 ▼                   │
                        ┌──────────────────┐         │
                        │   HubSpot CRM    │         │
                        │ (Deals+Contacts) │         │
                        └──────────────────┘         │
                                                     │
                                 ┌───────────────────┴────────┐
                                 │  Monitoring Dashboard      │
                                 │      Next.js 15 / React    │
                                 └────────────────────────────┘
```

---

## Engineering Guidelines & Invariants

### 1. PascalCase Naming Invariant
- **Classes, Types, and Interfaces (All Languages)**:
  - Strictly use `PascalCase` for all object and type declarations:
    - Classes: `ReceiveOrderAction`, `HubspotClient`, `DealMapper`, `OrderSyncService`, `SyncOrderJob`.
    - Types & Interfaces: `SyncAttempt`, `OrderPayload`, `CustomerProfile`, `UseSyncsReturn`.
    - DTOs and Enums: `OrderData`, `SyncStatus`.
    - React Components: `SyncDashboard`, `SyncTable`, `StatusBadge`, `RetryButton`.
- **Prohibited**: Never use `PascalCase` for everyday variables, function names, properties, or methods (`camelCase` in TS, `camelCase`/`snake_case` in PHP).

### 2. Semantic Versioning Protocol
- Starting point: `v0.1.0`.
- Format: `vMAJOR.MINOR.PATCH` (SemVer 2.0.0).
- Every update, bugfix, or feature must increment the version via `scripts/bump-version.sh` or `scripts/bump-version.ps1`, updating `VERSION`, `CHANGELOG.md`, and creating an annotated git tag pushed to GitHub.

---

## Automated Scaffolding

To regenerate or verify the template infrastructure:

### Linux / macOS / Git Bash:
```bash
./scaffold.sh
```

### Windows PowerShell:
```powershell
.\scaffold.ps1
```

---

## Requirement Coverage Matrix

| Req | Description | Implementation File | Status |
|---|---|---|---|
| **22** | Receiver + HMAC Verification + Schema Validation | `receiver/src/server.ts`, `hmac.ts`, `schema.ts`, `forward.ts` | Completed |
| **23** | HubSpot Sync (Contact, Deal, Association) | `backend/app/Services/Hubspot/*`, `OrderData.php` | Completed |
| **24** | Idempotency & Deduplication | `backend/app/Models/Order.php`, `ReceiveOrderAction.php`, `IdempotencyTest.php` | Completed |
| **25** | Reliability, Retry-After & Exception Classification | `HubspotClient.php`, `UpstreamUnavailableException.php`, `UpstreamRejectedException.php` | Completed |
| **26** | Audit Storage & State Machine | `backend/app/Models/SyncAttempt.php`, `SyncStatus.php`, migrations | Completed |
| **27** | Real-Time Monitoring Dashboard & Retries | `backend/app/Http/Controllers/SyncAttemptController.php`, `web/src/features/syncs/*` | Completed |
| **28** | Language B Export (HubSpot Deals to CSV) | `backend/app/Console/Commands/ExportHubspotDeals.php`, `ExportTest.php` | Completed |
| **29** | Documentation, Environment & Mock Script | `README.md`, `.env.example`, `scripts/mock-webhook.ts` | Completed |
| **Bonus** | Docker Compose & n8n Workflow | `docker-compose.yml`, `n8n/order-to-hubspot.json` | Completed |

---

## Versioning Commands

To increment versioning:

```bash
# Bump patch for bugfixes (e.g. 0.1.0 -> 0.1.1)
./scripts/bump-version.sh patch --push

# Bump minor for new features (e.g. 0.1.0 -> 0.2.0)
./scripts/bump-version.sh minor --push

# Bump major for breaking changes (e.g. 0.1.0 -> 1.0.0)
./scripts/bump-version.sh major --push
```