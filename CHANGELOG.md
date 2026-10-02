# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
