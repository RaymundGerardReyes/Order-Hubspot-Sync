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

## 3. Remote Protocol: Mandatory SSH Usage
- **Requirement**: Always configure and use SSH URLs for git remotes (`git@github.com:RaymundGerardReyes/Order-Hubspot-Sync.git`).
- **Rationale**: Bypasses Windows Credential Manager HTTPS OAuth token collisions between local accounts (e.g., `RaymundGerardEstaca` vs `RaymundGerardReyes`), utilizing the machine's pre-configured, authenticated SSH key.

## 4. Take-Home Brief & Payload Contract Alignment
- **Canonical Payload Acceptance**:
  - The webhook receiver, backend request validators, and DTOs must always support the canonical Stage 2 brief payload:
    - Top-level: `event`, `order_id`, `created_at`, `currency`, `total`
    - Customer block: `email`, `first_name`, `last_name`, `phone`
    - Items array: `sku`, `name`, `qty`, `price`
  - While camelCase variants (`orderId`, `totalAmount`, `quantity`, `unitPrice`) may be supported for internal compatibility, the brief's sample payload must never be rejected.

## 5. CRM Contact Upsert Lifecycle (Requirement 23)
- When syncing orders to HubSpot:
  - Search for existing contact by email.
  - If found: **Update** the contact's properties (`PATCH /crm/v3/objects/contacts/{id}`) with the incoming order's name and phone.
  - If not found: **Create** the contact (`POST /crm/v3/objects/contacts`).
  - Always link the created/found deal to the contact.

## 6. Durable Sync Attempt Storage (Requirement 26)
- Every sync attempt record in the database (`sync_attempts`) must store:
  - `order_id`, `status`, `hubspot_deal_id`, `hubspot_contact_id`, `failure_code`, `failure_message`, `retry_of`, `attempt_number`, `started_at`, `completed_at`.
  - Storing CRM IDs directly on the attempt guarantees that sales operators can audit which specific deal and contact were associated with each sync attempt.

## 7. Single-Service Integration Architecture & Language B Component Boundary
- **Core Requirements (22–27)**:
  - All core integration requirements (webhook receiver, HMAC signature check, schema validation, HubSpot deal/contact synchronization, SQLite persistence, and dashboard endpoints) must be implemented within the single Node.js/TypeScript service (`receiver/`).
  - Do NOT split the core integration across microservice boundaries or introduce auxiliary web backends (such as Laravel/Django).
- **Language B Component (Requirement 28)**:
  - The second-language requirement is strictly a standalone script (`exporter/export-deals.php`) for 7-day CSV deal export.
  - It must remain independent and lightweight without requiring a heavyweight web framework or external daemon.

## 8. Two-Tier Idempotency Guard (Local PK + HubSpot External Property)
- **Local DB Layer**:
  - `orders.order_id` must be defined as `PRIMARY KEY` (or `UNIQUE`).
  - Ingestion must insert the order atomically (`INSERT ... ON CONFLICT DO NOTHING`) to prevent concurrent race conditions.
  - Sequential duplicates must return HTTP `200 OK` with `duplicate: true` and the existing canonical state, without enqueuing a duplicate sync.
- **HubSpot CRM Layer**:
  - Deals must store the order ID in a custom unique identifier property (`external_order_id`).
  - Prior to creating a deal, the sync engine must search for an existing deal with `external_order_id = :orderId`.
  - If found (e.g., recovery after an unrecorded crash), the existing deal is associated with the contact and reused rather than duplicated.

## 9. Multi-Path Environment Resolution & Diagnostic Resilience
- **Multi-Path Environment Resolution**:
  - Services and CLI scripts running in subfolders (`receiver/`, `scripts/`, `exporter/`) must resolve `.env` across candidate paths (both current working directory and parent repository root).
  - In developer mode, missing `.env` files must automatically bootstrap from `.env.example` with working local testing defaults (`WEBHOOK_SECRET=stage2_secret_key_super_secure_99`) rather than crashing immediately.
- **HubSpot Service Key Compatibility**:
  - All HubSpot integrations must document and support modern HubSpot Service Keys (which superseded deprecated legacy Private Apps on new developer accounts) using standard HTTP `Authorization: Bearer <token>` authentication with the 4 required CRM scopes:
    - `crm.objects.contacts.read`
    - `crm.objects.contacts.write`
    - `crm.objects.deals.read`
    - `crm.objects.deals.write`
- **Zero-Dependency CLI Tooling & Actionable Diagnostics**:
  - Standalone utility and mock scripts (such as `scripts/mock-webhook.ts`) must rely exclusively on Node.js built-ins or zero external dependencies so they execute reliably across all working directories.
  - Connection failures (`ECONNREFUSED`) must be trapped and display actionable instructions directing the developer to start the receiver service first (`cd receiver && npm run dev`).

## 10. Design System & Modern Responsive UI Patterns (web/src)
- **Centralized Design System**:
  - All styling for the Next.js monitoring dashboard must use CSS custom properties defined in `web/src/app/globals.css` (tokens for colors, spacing, typography, borders, shadows, and keyframes) rather than ad-hoc inline styles.
  - Zero-layout-shift font rendering must be applied using `next/font/google` (`Inter`) with CSS variable injection.
- **Container Queries for Data Tables**:
  - Tabular data representations (`SyncTable`) must use CSS Container Queries (`@container synctable (max-width: 680px)`) to transform into responsive stacked card layouts without duplicate DOM structures, utilizing `data-label` attribute injection for accessible field labeling.
- **Accessible Visual States & Loading UX**:
  - Live polling indicators must visually display activity with subtle pulse animations.
  - Initial table loading states must render shimmer skeleton rows to prevent layout shift.
  - Action buttons (`RetryButton`) must use SVG icons, animated inline CSS spinners during flight, and proper accessibility attributes (`aria-label`, `aria-busy`).

## 11. Cross-Origin Protocol, Viewport Metadata & Dual Responsive Architecture
- **CORS Preflight Configuration**:
  - The API service (`receiver/`) must enable `@fastify/cors` (v9 for Fastify 4.x) with origin reflection (`origin: true`), credentials, and allowlisted headers (`Content-Type`, `Authorization`, `Accept`, `X-Webhook-Signature`, `X-Signature`) so browser dashboards on distinct ports (e.g., Next.js on port 3000) can interact without preflight CORS rejection.
  - Next.js development configurations (`web/next.config.js`) should provide complementary proxy rewrites (`/api/:path*` to the API port) for defense-in-depth.
- **App Router Viewport & Icon Standards**:
  - All Next.js App Router layouts (`web/src/app/layout.tsx`) must explicitly export `viewport: Viewport` with `width: 'device-width', initialScale: 1` to guarantee proper mobile device scaling.
  - Brand icons must be provided via `src/app/icon.svg` and `public/favicon.ico` to eliminate browser 404 noise.
- **Dual Container & Media Query Responsive Tables**:
  - Data tables (`SyncTable`) must implement dual responsiveness: `@container` queries for layout containment and `@media (max-width: 768px)` for viewport-level card transformations.
  - On mobile, table rows must transform into discrete cards displaying key-value pairs with `data-label` pseudo-elements, wrapping long strings with `word-break: break-word`, and providing 40px+ touch targets for action buttons.



