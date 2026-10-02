# Workspace Engineering Guidelines & Invariants

## 1. Naming Conventions: Strict PascalCase Invariant
- **PascalCase (Classes, Types, Interfaces across All Languages)**:
  - **Mandatory Usage**: Strictly applied to object and type declarations:
    - Classes (e.g., `ReceiveOrderAction`, `HubspotClient`, `DealMapper`, `OrderSyncService`)
    - TypeScript Types & Interfaces (e.g., `SyncAttempt`, `OrderPayload`, `HubspotDealProperties`)
    - PHP DTOs and Enums (e.g., `OrderData`, `SyncStatus`)
    - React Components (e.g., `SyncDashboard`, `SyncTable`, `StatusBadge`, `RetryButton`)
  - **Strictly Prohibited**: Do NOT use PascalCase for everyday variables, function names, object properties, or method names.
  - **Variables & Functions**:
    - TypeScript/JavaScript: Standard `camelCase` (e.g., `fetchSyncs`, `useSyncs`, `verifySignature`, `isPending`).
    - PHP: Standard `camelCase` for methods (e.g., `handle()`, `findOrCreateContact()`) and `snake_case` or `camelCase` for internal variables and database columns (e.g., `$orderId`, `sync_status`).

## 2. Semantic Versioning Protocol
- **Baseline Version**: `v0.1.0`
- **Format**: `vMAJOR.MINOR.PATCH` compliant with SemVer 2.0.0.
- **Increment Rules**:
  - `PATCH` (`v0.1.0` -> `v0.1.1`): Bug fixes, hotfixes, refactors, documentation updates without API changes.
  - `MINOR` (`v0.1.0` -> `v0.2.0`): New backward-compatible features, new webhook handlers, new endpoints, or schema extensions.
  - `MAJOR` (`v0.1.0` -> `v1.0.0`): Breaking changes, major architectural overhauls, incompatible payload contract modifications.
- **Release Requirements**:
  - Any version bump must update `VERSION` at the repository root.
  - Changelog must be updated in `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/).
  - A corresponding annotated git tag `vMAJOR.MINOR.PATCH` must be created and pushed to the upstream GitHub repository.
