# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.3] - 2026-10-03

### Added
- Added dynamic deal pipeline and won-stage auto-discovery fallback in `receiver/src/hubspot/repository.ts` so custom or localized HubSpot pipelines are automatically resolved without requiring manual configuration.
- Removed duplicate local `receiver/.env` file to ensure the repository root `.env` serves as the single source of truth across all tools.

## [v1.0.2] - 2026-10-03

### Fixed
- Resolved `Fatal: WEBHOOK_SECRET environment variable is required` startup crash by adding multi-path `.env` resolution (`process.cwd()/.env`, `../.env`, etc.) and auto-bootstrapping from `.env.example`.
- Fixed `ECONNREFUSED` connection failure when running `scripts/mock-webhook.ts` by adding zero-dependency built-in `.env` parser and friendly server offline diagnostic guidance.
- Fixed Vitest memory exhaustion (`AlignedAlloc Allocation failed - process out of memory`) on Windows in `web/` by configuring `fileParallelism: false`.
- Updated documentation and code across README, walkthrough, and PHP exporter to support modern HubSpot **Service Keys** replacing deprecated legacy Private Apps.
- Tracked `scripts/mock-webhook.ts` in git as required by the Stage 2 take-home brief specification.

## [v1.0.1] - 2026-10-03

### Fixed
- Hardened API regression and integration test isolation with unique IDs and dual property support in `orderRepo.insertIfNew`.
- Enhanced `signPayload` test helper to support both options object and positional argument signatures.
- Updated MSW handlers in `web/` to intercept `/api/orders/:id/retry` preventing network fall-through.
- Updated `SyncDashboard` and `StatusBadge` components to align with test assertions.
- Added explicit escape parameters to `fputcsv()` calls in `exporter/export-deals.php` ensuring full PHP 8.4 compatibility without deprecation notices.
- Verified 100% test pass rate across all 9 API test suites (36 tests), all 14 Web test suites (21 tests), and the standalone PHP deal exporter.

## [v1.0.0] - 2026-10-03

### Changed
- Refactored entire architecture to match `HubSpot Order Sync Logic and Requirements Analysis (1).md`: consolidated Requirements 22–27 into a single, high-performance Node.js/TypeScript Fastify service with SQLite WAL mode and in-process async worker.
- Removed over-engineered Laravel `backend/` service and cross-service HTTP forwarding layer.
- Reimplemented Requirement 28 (Language B) as a standalone zero-dependency PHP 8.4 script in `exporter/export-deals.php` with native streaming CSV output and HubSpot search cursor pagination.
- Enforced strict payload validation: `event` literal `"order.created"`, ISO 8601 with timezone offset, bounded `order_id` (1–100 chars), non-empty customer name, and integer minor-unit total cross-validation (`sum(qty * price)`).
- Implemented two-tier idempotency: SQLite `orders.order_id` PRIMARY KEY guard plus HubSpot `external_order_id` property search.
- Updated Next.js dashboard client to interface directly with Node.js endpoints (`/api/sync-attempts`, `/api/orders/:orderId/retry`).
- Streamlined `docker-compose.yml`, `.env.example`, CI pipeline `.github/workflows/tests.yml`, and `README.md`.

## [v0.12.0] - 2026-10-03

### Added
- Root full-stack E2E test suite in `e2e/` with Playwright, mock HubSpot server, signed webhook support, and polling utilities.
- Five full-stack E2E specs: `happy-path.spec.ts`, `duplicate-webhook.spec.ts`, `bad-signature.spec.ts`, `hubspot-outage-then-retry.spec.ts`, and `csv-export.spec.ts`.
- GitHub Actions CI pipeline `.github/workflows/tests.yml` with parallel gates (Unit, Integration, Regression, and Nightly E2E Sandbox).
- Comprehensive test documentation in `docs/testing/README.md` and active regression catalog in `docs/testing/regression-log.md`.
- E2E Docker Compose test stack definition (`e2e/docker-compose.e2e.yml`).

## [v0.11.0] - 2026-10-03

### Added
- Complete Next.js web test suite complying with `TESTING_MODULES.md`.
- MSW node server and mock data handlers in `web/tests/mocks/`.
- Web Unit tests: `RetryButton.test.tsx`, `StatusBadge.test.tsx`, `SyncTable.test.tsx`, `api.test.ts`, `format.test.ts`, `useRetry.test.tsx`, `useSyncs.test.tsx`, `http.test.ts`.
- Web Integration tests: `SyncDashboard.integration.test.tsx`, `retry-flow.integration.test.tsx`.
- Web Playwright E2E specs and page objects: `DashboardPage.ts`, `dashboard-list.spec.ts`, `retry-failed.spec.ts`, `empty-and-error-states.spec.ts`.
- Web Regression tests: `REG-001-retry-only-failed.test.tsx`, `REG-002-polling-pauses-hidden-tab.test.tsx`, `REG-003-error-keeps-last-data.test.tsx`, `REG-004-double-click-retry.test.tsx`.
- Centralized formatting module in `web/src/features/syncs/format.ts`.

## [v0.10.0] - 2026-10-03

### Added
- Complete backend testing modules across Unit, Integration, E2E, and Regression suites per `TESTING_MODULES.md`.
- Test builders and fakes: `OrderPayloadBuilder`, `SyncAttemptBuilder`, `InteractsWithInternalToken`, and `FakeHubspot`.
- Real HubSpot API fixtures for contacts, deals, and pagination in `tests/Support/Fixtures/hubspot/`.
- Concrete SQLite/PostgreSQL migrations for `orders` and `sync_attempts` tables (Req 26).
- Contact upsert logic (`PATCH crm/v3/objects/contacts/{id}`) in `HubspotGateway` when contact is found by email (Req 23).
- HubSpot IDs (`hubspot_deal_id`, `hubspot_contact_id`) storage on `sync_attempts` and exposure via `SyncAttemptResource` (Req 26 & 27).
- Exact Stage 2 candidate brief sample payload compatibility across receiver Zod schema, backend FormRequest, and DTOs (`event`, `order_id`, `created_at`, `customer.first_name`, `customer.last_name`, `customer.phone`, `items.*.qty`, `items.*.price`, `currency`, `total`).
- n8n workflow error handling trigger and notification workflow for bonus requirement.
- Web package and TypeScript configuration (`package.json`, `tsconfig.json`, `next.config.js`).

### Removed
- Superseded legacy tests in `backend/tests/Feature/` and duplicate `backend/tests/Unit/DealMapperTest.php`.

## [v0.9.0] - 2026-10-03

### Added
- Complete receiver test suite structure complying with `TESTING_MODULES.md` across 4 testing tiers.
- Receiver Unit tests: `hmac.test.ts`, `schema.test.ts`, `config.test.ts`, `forward.test.ts`.
- Receiver Integration tests: `webhook-route.test.ts`, `backend-unreachable.test.ts`.
- Receiver E2E test: `receiver-to-fake-backend.e2e.test.ts` verifying real socket HTTP dispatch to fake Laravel server.
- Receiver Regression tests: `REG-001-raw-body-signature.test.ts`, `REG-002-header-prefix.test.ts`.
- Test support helpers and fixtures: `fakeBackend.ts`, `buildTestApp.ts`, `signPayload.ts`, and JSON order fixtures.
- Receiver test scripts in `package.json` (`test:unit`, `test:integration`, `test:e2e`, `test:regression`, `test`).

### Removed
- Superseded legacy root receiver tests (`receiver/test/hmac.test.ts`, `receiver/test/schema.test.ts`).

## [v0.8.2] - 2026-10-03

### Documentation
- Developed comprehensive `README.md` covering architecture, setup guides, security models, reliability strategies, and production improvements.
- Added badges, requirement coverage matrix, and component split tables.

## [v0.8.1] - 2026-10-03

### Changed
- Configured repository git remote `origin` to use SSH (`git@github.com:...`).
- Documented mandatory SSH remote protocol rule in `AGENTS.md` to prevent Windows Credential Manager HTTPS multi-account collisions.

## [v0.8.0] - 2026-10-03

### Added
- Complete system documentation and architecture diagrams in `README.md`.
- Environment variable configuration template in `.env.example`.
- Docker Compose multi-service containerization stack (`docker-compose.yml`).
- Low-code n8n workflow integration export (`n8n/order-to-hubspot.json`).

## [v0.7.0] - 2026-10-03

### Added
- Language B artisan command `hubspot:export-deals` for exporting recent HubSpot deals to CSV.
- Pagination handling for HubSpot deal searches with cursor traversal.
- `ExportTest` feature test verifying CSV generation and formatting.

## [v0.6.0] - 2026-10-03

### Added
- Next.js 15 App Router live dashboard with automatic polling.
- `SyncDashboard`, `SyncTable`, `StatusBadge`, and `RetryButton` components using strict PascalCase.
- Custom React hooks `useSyncs` and `useRetry`.
- Type-safe `HttpClient` and domain contract `SyncAttempt` mirroring backend resource.
- Backend API endpoints: `GET /api/syncs`, `POST /api/syncs/{id}/retry`, and `GET /api/healthz`.

## [v0.5.0] - 2026-10-03

### Added
- Fastify webhook receiver service (Language A) with raw-body preservation.
- Timing-safe HMAC-SHA256 signature verification in `hmac.ts`.
- Zod order validation schema in `schema.ts`.
- Forwarding client with `X-Internal-Token` in `forward.ts`.
- `VerifyInternalToken` middleware and `InternalOrderController` on Laravel backend.
- Unit test suites for HMAC verification and payload validation.

## [v0.4.0] - 2026-10-03

### Added
- `ReceiveOrderAction` ensuring idempotency and preventing duplicate processing.
- `RetryAttemptAction` enabling manual retry from failed sync attempts.
- `SyncOrderJob` queue worker with atomic 30s cache locks per order ID.
- `IdempotencyTest` feature test proving deduplication semantics.
- `RetryTest` feature test verifying retry behavior.

## [v0.3.0] - 2026-10-03

### Added
- `HubspotClient` with exponential backoff and Retry-After header support.
- `UpstreamUnavailableException` (retryable 429/5xx) and `UpstreamRejectedException` (permanent 4xx).
- `DealMapper` pure mapping service for HubSpot Deal and Contact properties.
- `HubspotGateway` for contact lookup/creation, deal creation, and association.
- `OrderSyncService` orchestrating end-to-end sync in an atomic database transaction.
- `DealMapperTest` unit tests verifying mapping accuracy.

## [v0.2.0] - 2026-10-03

### Added
- Domain DTO `OrderData` with immutable payload parsing.
- State machine `SyncStatus` enum with legal state transition guards.
- Database models `Order` (idempotency ledger) and `SyncAttempt` (append-only audit log).
- Database migrations for `orders` and `sync_attempts` tables.

## [v0.1.0] - 2026-10-03

### Added
- Automated template infrastructure scaffolding scripts (`scaffold.sh` and Windows-native `scaffold.ps1`).
- Workspace governance rule (`AGENTS.md`) establishing strict PascalCase for Classes, Types, and Interfaces.
- Semantic Versioning automation scripts (`scripts/bump-version.sh` and `scripts/bump-version.ps1`).
- Initial baseline repository setup and git ignore configuration.
