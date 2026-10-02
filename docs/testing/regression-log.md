# Regression Test Log

This document indexes all active regression tests in the codebase. Every regression test represents a critical edge case, candidate brief invariant, or caught defect that is permanently locked to prevent future regressions.

---

## API & Sync Engine Regression Suite (`receiver/test/regression/`)

| Test ID | Test File | Risk / Defect Description | Date Locked |
|---|---|---|---|
| **REG-001** | `REG-001-raw-body-signature.test.ts` | HMAC signature must be computed on raw incoming bytes, not re-serialized JSON | 2026-10-02 |
| **REG-002** | `REG-002-header-prefix.test.ts` | Header prefix handling: accepts both `sha256=<hex>` and raw `<hex>` | 2026-10-02 |

---

## Web Regression Suite (`web/tests/regression/`)

| Test ID | Test File | Risk / Defect Description | Date Locked |
|---|---|---|---|
| **REG-001** | `REG-001-retry-only-failed.test.tsx` | Retry button is exclusively rendered on rows with status `failed` | 2026-10-02 |
| **REG-002** | `REG-002-polling-pauses-hidden-tab.test.tsx` | Polling timers are properly unregistered on component unmount | 2026-10-02 |
| **REG-003** | `REG-003-error-keeps-last-data.test.tsx` | Temporary polling network failure preserves last fetched sync attempts | 2026-10-02 |
| **REG-004** | `REG-004-double-click-retry.test.tsx` | Rapid double-clicks on Retry button trigger API call exactly once | 2026-10-02 |
