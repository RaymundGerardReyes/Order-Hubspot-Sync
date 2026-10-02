# Testing Architecture & Verification Guide

This repository implements a 4-tier testing hierarchy across the stack in strict accordance with the Stage 2 requirements and [TESTING_MODULES.md](../../TESTING_MODULES.md).

---

## 1. Testing Tiers Overview

| Tier | Scope | Speed | Isolation Level |
|---|---|---|---|
| **Unit** | Individual functions, schemas, mappers, repositories, pure components | < 50ms | No network, in-memory SQLite |
| **Integration** | Service boundaries, HTTP Fastify endpoints, database queries | 100ms - 500ms | SQLite WAL mode, MSW, Fastify inject |
| **E2E** | Multi-service flows, Playwright browser sessions, mock HubSpot CRM | 1s - 10s | Real HTTP sockets, Playwright, Sandbox |
| **Regression** | Dedicated reproducible tests for every known bug/risk | < 200ms | Hard gate before any push |

---

## 2. Test Execution Commands

### API & Sync Engine (Node.js / TypeScript / Vitest)
```bash
cd receiver
npm test             # Runs unit, integration, and regression suites
npm run test:unit
npm run test:integration
npm run test:regression
```

### Standalone PHP Exporter (Language B - PHP 8.4)
```bash
# Lint & syntax validation
php -l exporter/export-deals.php

# Live / mock execution
php exporter/export-deals.php --days=7 --output=deals_export.csv
```

### Web Dashboard (Next.js / Vitest / Playwright / MSW)
```bash
cd web
npm test             # Runs unit, integration, and regression suites
npm run test:unit
npm run test:integration
npm run test:regression
npm run test:e2e     # Playwright browser tests
```

---

## 3. Regression Test Convention

Every regression test follows the naming convention:
`REG-<3-digit-id>-<kebab-slug>` (e.g., `REG-001-raw-body-signature.test.ts`).

Each regression test file contains a header comment with:
1. Regression ID
2. Exact symptom / bug description
3. Date reproduced and locked
