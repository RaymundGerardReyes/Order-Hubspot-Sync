# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
