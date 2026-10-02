# Raw Scaffold – Empty Files and Why Each Exists

All files below are intentionally **empty (0 bytes)**. This document justifies each file against the brief's requirements (22–29 + bonus) so any engineer can see why it exists before it is filled in.

> Language split: Node/TS receiver satisfies req. 22 (Language A); Laravel/PHP owns the backend logic (23–27) and the CSV export (28, Language B); Next.js is the dashboard (27).

## 1. Create the Empty Scaffold

Run from the folder where you want the repo. `touch` never overwrites existing files, so it is safe after you create the Laravel and Next.js projects.

```bash
mkdir integration && cd integration
composer create-project laravel/laravel backend
npx create-next-app@latest web --ts --app --src-dir --no-tailwind --eslint
mkdir receiver && cd receiver && npm init -y && cd ..
cd backend && php artisan install:api && php artisan queue:table && php artisan cache:table && cd ..

mkdir -p backend/app/Actions backend/app/Console/Commands backend/app/DTOs backend/app/Enums backend/app/Exceptions backend/app/Http/Controllers backend/app/Http/Middleware backend/app/Http/Requests backend/app/Http/Resources backend/app/Jobs backend/app/Models backend/app/Services/Hubspot backend/config backend/routes backend/tests/Feature backend/tests/Unit n8n receiver/src receiver/test scripts web/src/app web/src/features/syncs web/src/features/syncs/components web/src/features/syncs/hooks web/src/lib

touch receiver/src/main.ts \
  receiver/src/config.ts \
  receiver/src/hmac.ts \
  receiver/src/schema.ts \
  receiver/src/forward.ts \
  receiver/src/server.ts \
  receiver/test/hmac.test.ts \
  receiver/test/schema.test.ts \
  backend/app/Actions/ReceiveOrderAction.php \
  backend/app/Actions/RetryAttemptAction.php \
  backend/app/Console/Commands/ExportHubspotDeals.php \
  backend/app/DTOs/OrderData.php \
  backend/app/Enums/SyncStatus.php \
  backend/app/Exceptions/UpstreamUnavailableException.php \
  backend/app/Exceptions/UpstreamRejectedException.php \
  backend/app/Http/Controllers/InternalOrderController.php \
  backend/app/Http/Controllers/SyncAttemptController.php \
  backend/app/Http/Controllers/HealthController.php \
  backend/app/Http/Middleware/VerifyInternalToken.php \
  backend/app/Http/Requests/OrderWebhookRequest.php \
  backend/app/Http/Resources/SyncAttemptResource.php \
  backend/app/Jobs/SyncOrderJob.php \
  backend/app/Models/Order.php \
  backend/app/Models/SyncAttempt.php \
  backend/app/Services/Hubspot/HubspotClient.php \
  backend/app/Services/Hubspot/HubspotGateway.php \
  backend/app/Services/Hubspot/DealMapper.php \
  backend/app/Services/Hubspot/OrderSyncService.php \
  backend/config/services.php \
  backend/routes/api.php \
  backend/routes/console.php \
  backend/tests/Unit/DealMapperTest.php \
  backend/tests/Feature/IdempotencyTest.php \
  backend/tests/Feature/RetryTest.php \
  backend/tests/Feature/ExportTest.php \
  web/src/app/layout.tsx \
  web/src/app/page.tsx \
  web/src/features/syncs/components/SyncDashboard.tsx \
  web/src/features/syncs/components/SyncTable.tsx \
  web/src/features/syncs/components/StatusBadge.tsx \
  web/src/features/syncs/components/RetryButton.tsx \
  web/src/features/syncs/hooks/useSyncs.ts \
  web/src/features/syncs/hooks/useRetry.ts \
  web/src/features/syncs/api.ts \
  web/src/features/syncs/types.ts \
  web/src/lib/http.ts \
  scripts/mock-webhook.ts \
  n8n/order-to-hubspot.json \
  docker-compose.yml \
  .env.example \
  README.md
```

**Warning:** `backend/config/services.php`, `backend/routes/api.php`, `backend/routes/console.php`, `web/src/app/layout.tsx` and `web/src/app/page.tsx` are created by the framework installers. Do not blank them; edit them in place. The file `routes/api.php` only exists after `php artisan install:api`.

Create the migrations with artisan so they get timestamps and stay out of the empty list:

```bash
cd backend
php artisan make:migration create_orders_table
php artisan make:migration create_sync_attempts_table
```

## 2. File Justification Tables

### Receiver (Node/TS, Language A)

| File | Responsibility | Req | Why it exists |
|---|---|---|---|
| `receiver/src/main.ts` | Process entry point: load config, build server, listen, handle shutdown | 22 | Single boot point keeps startup order obvious and testable |
| `receiver/src/config.ts` | Read and validate env (WEBHOOK_SECRET, INTERNAL_TOKEN, BACKEND_URL, PORT) | 22 | Fail fast on missing secrets; env is read in one place only |
| `receiver/src/hmac.ts` | verifySignature(raw, header, secret) with constant-time compare | 22 | Security-critical logic isolated so it is unit-testable |
| `receiver/src/schema.ts` | Zod schema for the order.created payload | 22 | One source of truth for payload shape |
| `receiver/src/forward.ts` | POST verified order to Laravel with internal token and request ID | 22 | Separates transport to backend from HTTP route code; maps failures to 502 |
| `receiver/src/server.ts` | Fastify instance, raw-body parser, POST /webhooks/orders route | 22 | Thin HTTP layer: verify, validate, forward, nothing else |
| `receiver/test/hmac.test.ts` | Tests: valid, tampered, missing header, wrong length | 22, Bonus (tests) | Proves signature verification is correct |
| `receiver/test/schema.test.ts` | Tests: valid sample payload, bad email, qty 0, missing fields | 22, Bonus (tests) | Proves validation rules match the brief |

### Backend (Laravel 13, PHP)

| File | Responsibility | Req | Why it exists |
|---|---|---|---|
| `backend/app/Actions/ReceiveOrderAction.php` | Dedupe check, create pending attempt, dispatch job | 24, 26 | Use case separated from controller; first idempotency layer |
| `backend/app/Actions/RetryAttemptAction.php` | Create new pending attempt from a failed one (retry_of) and dispatch | 27, 26 | Retry reuses the same pipeline; history stays append-only |
| `backend/app/Console/Commands/ExportHubspotDeals.php` | Artisan command exporting last-7-days deals to CSV | 28 | Language B component; thin command, reuses HubspotClient |
| `backend/app/DTOs/OrderData.php` | Typed immutable order object built from validated payload | 23 | Avoids passing loose arrays through the pipeline |
| `backend/app/Enums/SyncStatus.php` | pending, processing, success, failed + allowed transitions | 26, 27 | Central state machine; prevents illegal status changes |
| `backend/app/Exceptions/UpstreamUnavailableException.php` | HubSpot 429/5xx/network after retries (retryable) | 25 | Lets the dashboard distinguish transient from permanent failures |
| `backend/app/Exceptions/UpstreamRejectedException.php` | HubSpot 4xx (not retryable) | 25 | Signals config/data bugs instead of wasting retries |
| `backend/app/Http/Controllers/InternalOrderController.php` | Receives verified order from Node and calls ReceiveOrderAction | 22, 24 | Thin controller; returns 200 duplicate or 202 accepted |
| `backend/app/Http/Controllers/SyncAttemptController.php` | GET last 50 attempts; POST retry for failed | 27 | Backend contract for the dashboard |
| `backend/app/Http/Controllers/HealthController.php` | Health: DB reachable, pending/failed counts | Quality: Trackable | Operational visibility without extra tooling |
| `backend/app/Http/Middleware/VerifyInternalToken.php` | Checks X-Internal-Token between Node and Laravel | 22, 23 | Stops anyone bypassing the HMAC check by calling Laravel directly |
| `backend/app/Http/Requests/OrderWebhookRequest.php` | Second validation of the payload (defense in depth) | 22 | Backend never trusts input blindly |
| `backend/app/Http/Resources/SyncAttemptResource.php` | API shape for attempts; hides payload/PII | 27 | Stable contract; mirrors web types.ts |
| `backend/app/Jobs/SyncOrderJob.php` | Claim attempt, lock per order, run sync, record result | 23, 24, 25, 26 | Asynchronous pipeline using the database queue; no Redis |
| `backend/app/Models/Order.php` | Synced orders; order_id primary key | 24, 26 | Idempotency ledger |
| `backend/app/Models/SyncAttempt.php` | Attempt history with status transition method | 26 | Append-only audit trail of every sync attempt |
| `backend/app/Services/Hubspot/HubspotClient.php` | Only class making HubSpot HTTP calls; retry, backoff, Retry-After, logging | 25 | All reliability logic in one place |
| `backend/app/Services/Hubspot/HubspotGateway.php` | HubSpot operations: find/create/update contact, find/create deal, associate | 23 | Hides API paths and payload shapes from business logic |
| `backend/app/Services/Hubspot/DealMapper.php` | Pure mapping: order to contact and deal properties | 23, Bonus (tests) | Pure code is easy to unit test |
| `backend/app/Services/Hubspot/OrderSyncService.php` | Orchestrates contact, deal, association, final transaction | 23, 24, 26 | One readable place describing the workflow |
| `backend/config/services.php` | Add hubspot token, pipeline, dealstage and internal token entries | 23 | Config read via config(), not env(), in app code (already exists in Laravel) |
| `backend/routes/api.php` | Routes: internal/orders, syncs, retry, healthz | 22, 27 | Entry map of the HTTP surface (create with php artisan install:api) |
| `backend/routes/console.php` | Scheduled/console registrations (e.g., stuck-attempt recovery) | 25, 26 | Crash recovery hook (already exists in Laravel) |
| `backend/tests/Unit/DealMapperTest.php` | Mapping assertions: name, amount, closedate UTC, stage | 23, Bonus (tests) | Mapping logic is explicitly required in the bonus |
| `backend/tests/Feature/IdempotencyTest.php` | Same order_id twice gives one deal and one orders row | 24, Bonus (tests) | Proves requirement 24 |
| `backend/tests/Feature/RetryTest.php` | 429, 503 then 200; 400 not retried; retry endpoint 409/202 | 25, 27 | Proves reliability and retry behavior |
| `backend/tests/Feature/ExportTest.php` | Paginated deals produce correct CSV | 28 | Proves exporter |

### Frontend (Next.js, React, TS)

| File | Responsibility | Req | Why it exists |
|---|---|---|---|
| `web/src/app/layout.tsx` | Root layout, metadata, global styles | 27 | Next.js App Router requirement |
| `web/src/app/page.tsx` | Server component shell rendering SyncDashboard | 27 | Keeps page thin; logic lives in the feature |
| `web/src/features/syncs/components/SyncDashboard.tsx` | Client container: polling state, errors, refresh | 27 | Single owner of dashboard state |
| `web/src/features/syncs/components/SyncTable.tsx` | Presentational table of up to 50 attempts | 27 | Rendering only, easy to change |
| `web/src/features/syncs/components/StatusBadge.tsx` | Status label with text and colour | 27 | Reusable and accessible |
| `web/src/features/syncs/components/RetryButton.tsx` | Retry button shown only for failed rows | 27 | Isolates mutation UI and in-flight state |
| `web/src/features/syncs/hooks/useSyncs.ts` | Polling hook for GET /api/syncs | 27 | Data fetching separated from UI |
| `web/src/features/syncs/hooks/useRetry.ts` | Mutation hook for POST retry, handles 409 | 27 | Retry logic separated from UI |
| `web/src/features/syncs/api.ts` | fetchSyncs(), retrySync(id) | 27 | Only file in the feature that knows endpoint URLs |
| `web/src/features/syncs/types.ts` | SyncAttempt and SyncStatus types mirroring the API resource | 27 | Contract between backend and frontend |
| `web/src/lib/http.ts` | fetch wrapper with error normalization | 27 | Shared error handling |

### Root and support files

| File | Responsibility | Req | Why it exists |
|---|---|---|---|
| `scripts/mock-webhook.ts` | Signs and posts the sample payload to the receiver | 22, 29 | Reproducible demo and test for reviewers |
| `n8n/order-to-hubspot.json` | Exported n8n workflow plus error workflow | Bonus (n8n) | Bonus deliverable (export from n8n; do not hand-write) |
| `docker-compose.yml` | receiver, backend, worker, web services | Bonus (Compose) | One command to run the stack |
| `.env.example` | All env variable names without secrets | 29 | Setup documentation and safe sharing |
| `README.md` | Setup, architecture, assumptions, improvements | 29 | Required deliverable |

## 3. Requirement Coverage Check

| Req | Files that deliver it | Status in scaffold |
|---|---|---|
| 22 Receiver + HMAC + validation | receiver/src/*, VerifyInternalToken, OrderWebhookRequest | File present (empty) |
| 23 HubSpot sync | HubspotGateway, DealMapper, OrderSyncService, OrderData | File present (empty) |
| 24 Idempotency | Order model, ReceiveOrderAction, SyncOrderJob, IdempotencyTest | File present (empty) |
| 25 Reliability | HubspotClient, both Upstream exceptions, RetryTest | File present (empty) |
| 26 Storage | SyncAttempt, Order, migrations, SyncStatus | File present (empty) |
| 27 Dashboard | SyncAttemptController, SyncAttemptResource, web/src/features/syncs/* | File present (empty) |
| 28 Language B export | ExportHubspotDeals, ExportTest | File present (empty) |
| 29 README | README.md, .env.example, mock-webhook.ts | File present (empty) |
| Bonus n8n / Compose / tests | n8n/order-to-hubspot.json, docker-compose.yml, all test files | File present (empty) |

## 4. Rules for Filling the Files Later

- Controllers, routes and components contain no business logic; they call Actions, hooks or services.
- Only `HubspotClient` makes HubSpot HTTP calls; only `api.ts` knows frontend endpoint URLs.
- `DealMapper`, `hmac.ts` and `SyncStatus` stay pure, so tests need no network or database.
- Never log tokens or the HMAC secret; keep customer payloads in the database only.
- Fill order: migrations, `SyncStatus`, models, `DealMapper` plus test, `HubspotClient`, `HubspotGateway`, `OrderSyncService`, job, action, controllers, receiver, dashboard, export, README.
- Backend and frontend share one contract: `SyncAttemptResource` must match `types.ts`.

Total empty files in scaffold: 51.