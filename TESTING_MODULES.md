# Testing Modules – Unit, Integration, E2E, Regression

Scope: receiver (Node/TS), backend (Laravel 13), web (Next.js), plus a root full-stack E2E suite. All files in the companion ZIP are **empty (0 bytes)**.

This supersedes the earlier `receiver/test/{hmac,schema}.test.ts` and `backend/tests/Feature/*` placement: they move into `unit/` and `Integration/` below.

## 1. Four Layers, One Definition Each

| Layer | What it proves | Boundaries it may cross | Speed target |
|---|---|---|---|
| Unit | One function/class is correct | None (no DB, network, filesystem) | Whole suite under 30 s |
| Integration | Several classes work together | Real SQLite and framework; HubSpot faked (`Http::fake`, MSW) | Under 2 min |
| E2E | A user or system journey works | Running services; fake HubSpot server by default, real sandbox optional | Under 5 min |
| Regression | A past bug or guarantee never returns | Any layer, but named and logged | Runs on every push |

Regression is not a separate technology. It is a **named, permanent test** for each bug or critical guarantee, stored in `regression/` and indexed in `docs/testing/regression-log.md`.

## 2. Scalable Rules (apply to all three apps)

- **Mirror the source tree** inside `unit/` (e.g. `Services/Hubspot/DealMapperTest.php` mirrors `app/Services/Hubspot/DealMapper.php`). A new module adds a folder in each layer, nothing else.
- **One file = one behavior group.** Split a file once it passes about 200 lines.
- **Shared code lives only in `support/` (`Support/` in PHP)**: builders, fakes, fixtures, page objects. Tests never import from other tests.
- **Fixtures are data, not code**: JSON files with descriptive names, one scenario each.
- **Regression naming:** `REG-<3-digit>-<kebab-slug>`; every file starts with a comment holding the bug description and date. Never delete or renumber.
- **Determinism:** inject time, jitter and IDs; no real sleeps (fake timers in Vitest, `Sleep::fake()` in Laravel); no real HubSpot except the opt-in E2E sandbox test.
- **Pyramid proportions:** roughly 60-70% unit, 20-30% integration, under 10% E2E; regression files reuse the cheapest layer that can reproduce the bug.
- **Layer tags** for filtering: Pest `->group('unit'|'integration'|'e2e'|'regression')`, Vitest/Playwright by folder path.

## 3. Directory Trees

```text
# receiver (Node/TS, Vitest)
receiver/
  test/
    e2e/
      receiver-to-fake-backend.e2e.test.ts
    fixtures/
      orders/
        invalid-email.json
        missing-customer.json
        valid-order.json
        zero-qty.json
    integration/
      backend-unreachable.test.ts
      webhook-route.test.ts
    regression/
      REG-001-raw-body-signature.test.ts
      REG-002-header-prefix.test.ts
    setup/
      vitest.setup.ts
    support/
      buildTestApp.ts
      fakeBackend.ts
      signPayload.ts
    unit/
      config.test.ts
      forward.test.ts
      hmac.test.ts
      schema.test.ts
  vitest.config.ts

# backend (Laravel 13, Pest or PHPUnit)
backend/
  tests/
    E2E/
      OrderToHubspotSandboxTest.php
      QueueWorkerFlowTest.php
    Integration/
      Console/
        ExportHubspotDealsTest.php
      Http/
        HealthEndpointTest.php
        InternalOrderEndpointTest.php
        RetryEndpointTest.php
        SyncAttemptsEndpointTest.php
        VerifyInternalTokenTest.php
      Idempotency/
        IdempotencyTest.php
      Jobs/
        SyncOrderJobTest.php
      Services/
        Hubspot/
          HubspotClientRetryTest.php
          HubspotGatewayTest.php
          OrderSyncServiceTest.php
    Pest.php
    Regression/
      REG-001-duplicate-order-single-deal.php
      REG-002-retry-after-header.php
      REG-003-closedate-timezone.php
      REG-004-stuck-processing-recovery.php
      REG-005-retry-non-failed-409.php
      REG-006-missing-phone.php
    Support/
      Builders/
        OrderPayloadBuilder.php
        SyncAttemptBuilder.php
      Concerns/
        InteractsWithInternalToken.php
      Fakes/
        FakeHubspot.php
      Fixtures/
        hubspot/
          contact-found.json
          contact-not-found.json
          deal-created.json
          deals-search-page-1.json
          deals-search-page-2.json
    TestCase.php
    Unit/
      DTOs/
        OrderDataTest.php
      Enums/
        SyncStatusTest.php
      Exceptions/
        UpstreamExceptionsTest.php
      Models/
        SyncAttemptTransitionTest.php
      Services/
        Hubspot/
          DealMapperTest.php

# web (Next.js, Vitest + Testing Library + Playwright + MSW)
web/
  playwright.config.ts
  tests/
    e2e/
      dashboard-list.spec.ts
      empty-and-error-states.spec.ts
      pages/
        DashboardPage.ts
      retry-failed.spec.ts
    integration/
      SyncDashboard.integration.test.tsx
      retry-flow.integration.test.tsx
    mocks/
      data/
        syncAttempts.ts
      handlers.ts
      server.ts
    regression/
      REG-001-retry-only-failed.test.tsx
      REG-002-polling-pauses-hidden-tab.test.tsx
      REG-003-error-keeps-last-data.test.tsx
      REG-004-double-click-retry.test.tsx
    setup/
      vitest.setup.ts
    support/
      renderWithProviders.tsx
    unit/
      components/
        RetryButton.test.tsx
        StatusBadge.test.tsx
        SyncTable.test.tsx
      features/
        api.test.ts
        format.test.ts
      hooks/
        useRetry.test.tsx
        useSyncs.test.tsx
      lib/
        http.test.ts
  vitest.config.mts

# root (full-stack E2E, regression index, CI)
.github/
  workflows/
    tests.yml
docs/
  testing/
    README.md
    regression-log.md
e2e/
  docker-compose.e2e.yml
  fixtures/
    order-ORD-10482.json
  mocks/
    hubspot-mock-server.ts
  playwright.config.ts
  specs/
    bad-signature.spec.ts
    csv-export.spec.ts
    duplicate-webhook.spec.ts
    happy-path.spec.ts
    hubspot-outage-then-retry.spec.ts
  support/
    signedWebhook.ts
    waitForSync.ts

```

## 4. File Justification

### receiver (Node/TS, Vitest)

| File | Purpose |
|---|---|
| `receiver/vitest.config.ts` | Vitest config: include globs per suite, coverage, setup file |
| `receiver/test/setup/vitest.setup.ts` | Global setup: env vars, fake timers defaults |
| `receiver/test/support/signPayload.ts` | Helper: sign raw body with HMAC for tests |
| `receiver/test/support/buildTestApp.ts` | Helper: build Fastify app with injected config and backend URL |
| `receiver/test/support/fakeBackend.ts` | Helper: local fake Laravel server (200/202/500/timeout modes) |
| `receiver/test/fixtures/orders/valid-order.json` | Sample payload from the brief |
| `receiver/test/fixtures/orders/invalid-email.json` | Bad email |
| `receiver/test/fixtures/orders/zero-qty.json` | qty = 0 |
| `receiver/test/fixtures/orders/missing-customer.json` | No customer block |
| `receiver/test/unit/hmac.test.ts` | valid, tampered, missing header, wrong length, prefix handling |
| `receiver/test/unit/schema.test.ts` | Zod rules against fixtures |
| `receiver/test/unit/config.test.ts` | Missing or malformed env fails fast |
| `receiver/test/unit/forward.test.ts` | Header building, timeout, 502 mapping (fetch mocked) |
| `receiver/test/integration/webhook-route.test.ts` | Route with real Fastify inject: 401/400/forwarded status |
| `receiver/test/integration/backend-unreachable.test.ts` | Backend down returns 502; request ID forwarded |
| `receiver/test/e2e/receiver-to-fake-backend.e2e.test.ts` | Real HTTP socket: signed POST reaches fake backend unchanged |
| `receiver/test/regression/REG-001-raw-body-signature.test.ts` | Signature must be computed on raw bytes, not re-serialized JSON |
| `receiver/test/regression/REG-002-header-prefix.test.ts` | Header with and without sha256= prefix |

### backend (Laravel 13, Pest or PHPUnit)

| File | Purpose |
|---|---|
| `backend/tests/Pest.php` | Pest bootstrap: bind TestCase and RefreshDatabase per suite folder |
| `backend/tests/TestCase.php` | Base test case |
| `backend/tests/Support/Builders/OrderPayloadBuilder.php` | Fluent builder for order payload arrays |
| `backend/tests/Support/Builders/SyncAttemptBuilder.php` | Builder for attempts in any status |
| `backend/tests/Support/Fakes/FakeHubspot.php` | Http::fake presets: happy path, 429, 503, 400, existing contact/deal |
| `backend/tests/Support/Concerns/InteractsWithInternalToken.php` | Trait: send requests with valid internal token |
| `backend/tests/Support/Fixtures/hubspot/contact-found.json` | HubSpot search response with a contact |
| `backend/tests/Support/Fixtures/hubspot/contact-not-found.json` | Empty search response |
| `backend/tests/Support/Fixtures/hubspot/deal-created.json` | Deal create response |
| `backend/tests/Support/Fixtures/hubspot/deals-search-page-1.json` | Export page 1 with paging.next.after |
| `backend/tests/Support/Fixtures/hubspot/deals-search-page-2.json` | Export last page |
| `backend/tests/Unit/Enums/SyncStatusTest.php` | Allowed and forbidden transitions |
| `backend/tests/Unit/DTOs/OrderDataTest.php` | Construction from payload array |
| `backend/tests/Unit/Models/SyncAttemptTransitionTest.php` | transitionTo throws on illegal change |
| `backend/tests/Unit/Services/Hubspot/DealMapperTest.php` | name, amount string, closedate UTC, stage, optional phone |
| `backend/tests/Unit/Exceptions/UpstreamExceptionsTest.php` | Context payload and retryable flags |
| `backend/tests/Integration/Http/InternalOrderEndpointTest.php` | 202 accepted, 200 duplicate, 401 token, 422 invalid |
| `backend/tests/Integration/Http/SyncAttemptsEndpointTest.php` | Last 50 newest first, resource shape, no payload leak |
| `backend/tests/Integration/Http/RetryEndpointTest.php` | 202 for failed, 409 for others, retry_of set |
| `backend/tests/Integration/Http/HealthEndpointTest.php` | Counts and DB check |
| `backend/tests/Integration/Http/VerifyInternalTokenTest.php` | Missing and wrong token rejected |
| `backend/tests/Integration/Services/Hubspot/HubspotClientRetryTest.php` | 429 then 503 then 200; Retry-After honored; 400 not retried |
| `backend/tests/Integration/Services/Hubspot/HubspotGatewayTest.php` | Request paths and bodies per operation |
| `backend/tests/Integration/Services/Hubspot/OrderSyncServiceTest.php` | Full pipeline with Http::fake and real SQLite |
| `backend/tests/Integration/Jobs/SyncOrderJobTest.php` | Claim, lock, success and failed recording |
| `backend/tests/Integration/Idempotency/IdempotencyTest.php` | Same order_id twice and racing attempts yield one deal |
| `backend/tests/Integration/Console/ExportHubspotDealsTest.php` | 7-day filter, pagination, CSV columns |
| `backend/tests/E2E/OrderToHubspotSandboxTest.php` | Real HubSpot test account; skipped unless HUBSPOT_E2E=1 |
| `backend/tests/E2E/QueueWorkerFlowTest.php` | Dispatch via endpoint, run worker, assert final DB state |
| `backend/tests/Regression/REG-001-duplicate-order-single-deal.php` | Locks the idempotency guarantee |
| `backend/tests/Regression/REG-002-retry-after-header.php` | 429 waits for Retry-After |
| `backend/tests/Regression/REG-003-closedate-timezone.php` | +08:00 converts correctly to UTC |
| `backend/tests/Regression/REG-004-stuck-processing-recovery.php` | Old processing rows return to pending |
| `backend/tests/Regression/REG-005-retry-non-failed-409.php` | Retry on success or pending returns 409 |
| `backend/tests/Regression/REG-006-missing-phone.php` | Payload without phone still syncs |

### web (Next.js, Vitest + Testing Library + Playwright + MSW)

| File | Purpose |
|---|---|
| `web/vitest.config.mts` | Vitest config: jsdom, react plugin, tsconfig paths, setup file |
| `web/playwright.config.ts` | Playwright config: baseURL, webServer, projects, reporters |
| `web/tests/setup/vitest.setup.ts` | jest-dom matchers, MSW lifecycle, cleanup |
| `web/tests/mocks/handlers.ts` | MSW handlers for /api/syncs and retry |
| `web/tests/mocks/server.ts` | MSW node server for Vitest |
| `web/tests/mocks/data/syncAttempts.ts` | Factories: success, failed, pending rows, 50-row list |
| `web/tests/support/renderWithProviders.tsx` | Render helper |
| `web/tests/unit/components/StatusBadge.test.tsx` | Text and styling per status |
| `web/tests/unit/components/SyncTable.test.tsx` | Rows, empty state, columns |
| `web/tests/unit/components/RetryButton.test.tsx` | Visibility, disabled while in flight, click callback |
| `web/tests/unit/hooks/useSyncs.test.tsx` | Polling interval, error keeps last data |
| `web/tests/unit/hooks/useRetry.test.tsx` | Success, 409 handling, loading flag |
| `web/tests/unit/features/api.test.ts` | URL, method, error mapping |
| `web/tests/unit/features/format.test.ts` | Date and text helpers |
| `web/tests/unit/lib/http.test.ts` | Error normalization |
| `web/tests/integration/SyncDashboard.integration.test.tsx` | Dashboard with MSW: load, refresh, error banner |
| `web/tests/integration/retry-flow.integration.test.tsx` | Click retry, POST sent, list refetched |
| `web/tests/e2e/pages/DashboardPage.ts` | Page object for the dashboard |
| `web/tests/e2e/dashboard-list.spec.ts` | Browser: lists up to 50 attempts with statuses |
| `web/tests/e2e/retry-failed.spec.ts` | Browser: retry only on failed rows |
| `web/tests/e2e/empty-and-error-states.spec.ts` | Browser: empty list and API failure |
| `web/tests/regression/REG-001-retry-only-failed.test.tsx` | Retry never appears on success, pending or processing |
| `web/tests/regression/REG-002-polling-pauses-hidden-tab.test.tsx` | No requests while tab hidden |
| `web/tests/regression/REG-003-error-keeps-last-data.test.tsx` | Failed poll does not blank the table |
| `web/tests/regression/REG-004-double-click-retry.test.tsx` | Second click ignored while in flight |

### root (full-stack E2E, regression index, CI)

| File | Purpose |
|---|---|
| `e2e/playwright.config.ts` | Full-stack Playwright config |
| `e2e/docker-compose.e2e.yml` | Stack with fake HubSpot instead of real one |
| `e2e/mocks/hubspot-mock-server.ts` | Deterministic fake HubSpot API with 429/5xx injection |
| `e2e/support/signedWebhook.ts` | Send signed webhook to receiver |
| `e2e/support/waitForSync.ts` | Poll dashboard API until attempt reaches a status |
| `e2e/fixtures/order-ORD-10482.json` | Brief sample payload |
| `e2e/specs/happy-path.spec.ts` | Webhook, deal and contact created, dashboard shows success |
| `e2e/specs/duplicate-webhook.spec.ts` | Same order twice yields one deal |
| `e2e/specs/hubspot-outage-then-retry.spec.ts` | Injected 503 gives failed row; retry succeeds |
| `e2e/specs/bad-signature.spec.ts` | 401 and nothing stored |
| `e2e/specs/csv-export.spec.ts` | Artisan export contains created deal |
| `docs/testing/README.md` | Testing guide: layers, commands, conventions |
| `docs/testing/regression-log.md` | Index of every REG-xxx test, bug, date, fix |
| `.github/workflows/tests.yml` | CI: unit, integration, regression, e2e stages |

## 5. Requirement-to-Test Traceability

| Req | Unit | Integration | E2E | Regression |
|---|---|---|---|---|
| 22 HMAC + validation | `hmac.test.ts`, `schema.test.ts` | `webhook-route.test.ts`, `VerifyInternalTokenTest` | `bad-signature.spec.ts` | receiver REG-001, REG-002 |
| 23 HubSpot sync | `DealMapperTest` | `HubspotGatewayTest`, `OrderSyncServiceTest` | `happy-path.spec.ts`, `OrderToHubspotSandboxTest` | backend REG-003, REG-006 |
| 24 Idempotency | `SyncStatusTest` | `IdempotencyTest`, `SyncOrderJobTest` | `duplicate-webhook.spec.ts` | backend REG-001, REG-004 |
| 25 Reliability | `UpstreamExceptionsTest` | `HubspotClientRetryTest` | `hubspot-outage-then-retry.spec.ts` | backend REG-002 |
| 26 Storage | `SyncAttemptTransitionTest` | `SyncAttemptsEndpointTest`, `QueueWorkerFlowTest` | `happy-path.spec.ts` | backend REG-004 |
| 27 Dashboard | component and hook tests | `SyncDashboard.integration`, `RetryEndpointTest` | `dashboard-list`, `retry-failed` specs | web REG-001 to REG-004, backend REG-005 |
| 28 CSV export | (mapper reuse) | `ExportHubspotDealsTest` | `csv-export.spec.ts` | add REG when a bug appears |
| Bonus tests | mapping + idempotency covered above | | | |

## 6. Setup and Commands

### Receiver
```bash
cd receiver
npm i -D vitest
npx vitest run test/unit
npx vitest run test/integration
npx vitest run test/e2e
npx vitest run test/regression
```

### Backend (Pest; PHPUnit works with the same layout)
```bash
cd backend
composer require pest/pest pest/pest-plugin-laravel --dev --with-all-dependencies
php artisan pest:install
php artisan test --testsuite=Unit
php artisan test --testsuite=Integration
php artisan test --testsuite=Regression
HUBSPOT_E2E=1 php artisan test --testsuite=E2E
```

Register the suites in `backend/phpunit.xml`, replacing the default `Feature` suite:

```xml
<testsuites>
  <testsuite name="Unit"><directory>tests/Unit</directory></testsuite>
  <testsuite name="Integration"><directory>tests/Integration</directory></testsuite>
  <testsuite name="E2E"><directory>tests/E2E</directory></testsuite>
  <testsuite name="Regression"><directory>tests/Regression</directory></testsuite>
</testsuites>
```

In `tests/Pest.php` bind the base case and database refresh to the right folders, for example `pest()->extend(Tests\TestCase::class)->use(Illuminate\Foundation\Testing\RefreshDatabase::class)->in('Integration', 'E2E', 'Regression');` and `pest()->extend(Tests\TestCase::class)->in('Unit');`. Use an in-memory SQLite database in `phpunit.xml` (`DB_DATABASE=:memory:`). Regression files named `REG-...php` do not end in `Test.php`, so add `<directory suffix=".php">` for that suite or name them `REG-001-...Test.php`.

### Web
```bash
cd web
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths msw
npm init playwright@latest
npx vitest run tests/unit
npx vitest run tests/integration
npx vitest run tests/regression
npx playwright test tests/e2e
```

### Full stack
```bash
docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml up -d --build
npx playwright test -c e2e/playwright.config.ts
```

Suggested `package.json` scripts (web and receiver): `test:unit`, `test:integration`, `test:regression`, `test:e2e`, `test` (runs unit, integration, regression).

## 7. CI Pipeline (`.github/workflows/tests.yml`)

1. **Fast gate (parallel jobs):** receiver unit, backend unit, web unit.
2. **Integration (parallel):** receiver, backend, web.
3. **Regression (parallel):** all three apps. Fail the build on any failure.
4. **E2E (after the above pass):** start the E2E compose stack with the fake HubSpot server, run Playwright.
5. **Nightly only:** `HUBSPOT_E2E=1` sandbox test against the real HubSpot test account.

Splitting by suite means a logic failure never waits behind a browser job.

## 8. Regression Workflow

1. Bug found: write a failing test that reproduces it in `regression/` as `REG-00N-slug`.
2. Fix the code until it passes.
3. Add a row to `docs/testing/regression-log.md`: ID, symptom, root cause, fix commit, layer.
4. The file stays forever and runs on every push.

Seed regression tests already planned from the design's known risks: raw-body signature, duplicate orders, `Retry-After`, `+08:00` close-date conversion, stuck `processing` recovery, retry on a non-failed attempt (409), missing phone, retry-button visibility, hidden-tab polling, and double-click retry.

## 9. Adding a New Module Later (example: another CRM)

1. `tests/Unit/Services/<Crm>/...` mirrors the new service classes.
2. `tests/Integration/Services/<Crm>/...` uses a new `Support/Fakes/Fake<Crm>.php`.
3. One new E2E spec reuses the existing mock-server pattern.
4. Regression files are added only when bugs occur.
5. No existing test or config changes.


Total empty files in the scaffold: 92.