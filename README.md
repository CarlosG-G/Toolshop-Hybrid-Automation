# Toolshop Hybrid Automation

Playwright + Vibium automation against [Practice Software Testing Toolshop](https://practicesoftwaretesting.com).
The project demonstrates where each tool fits best rather than duplicating the
same locator strategy everywhere.

## Why both tools?

- **Playwright** is the regression gate: API reads, hermetic network mocking,
  accessible UI locators, traces, and axe accessibility checks.
- **Vibium** adds a focused semantic smoke using WebDriver BiDi and role/text
  locators.
- The **hybrid flow** searches for a product with Playwright, passes its detail
  URL to a separate Vibium browser, and verifies the product heading.
- The intentional-bugs target treats the known missing accessible heading as an
  expected defect (`WB-01`). The report counts those observations as detected,
  separately from unexpected failures.
- Vibium MCP can expose browser controls to a separately configured AI client;
  CI does not invoke an LLM or execute generated code.

See [ADR 001](docs/adr/001-tool-selection.md) for the trade-offs.

## Requirements

- Node.js 20+
- npm
- Playwright Chromium for the local regression suite
- Vibium Chrome for Vibium tests

## Quick start

```bash
npm ci
npx playwright install chromium
npx vibium install
npm run typecheck
npm run test:hermetic
npm run test:hybrid:hermetic
```

Hermetic tests run against a local fixture and deterministic mocked API. They
do not depend on Toolshop being available. Playwright is the always-on gate;
the separate hybrid smoke also exercises Vibium and is informational in CI.
CI runs the Vibium and hybrid smokes on Windows and the Playwright gate on
Linux, keeping Chrome's sandbox enabled. Hybrid test evidence and the combined
report are uploaded as artifacts.

## Live tests

Live tests are read-only by default. They do not register users, submit orders,
or create persistent data in the shared demo environment.

```bash
npm run healthcheck
npm run test:stable
npm run test:with-bugs
```

The workflow health-gates API and UI suites independently; a failure in one
target does not suppress checks against the other. The UI health check uses
Playwright Chromium, matching the live browser tests, and runs separately on
Linux and Windows for their respective UI suites. The cross-browser command
checks the UI before it starts.

Some hosted runners receive HTTP 403 from the public site. The report marks the
affected site's check as unavailable and skips that runner's live UI checks;
the hermetic hybrid smoke still runs. Run live tests locally where access is
allowed or use an authorized compatible deployment.

The `stable` and `with-bugs` targets can also be selected with
`TOOLSHOP_TARGET`. Live tests use the public catalog only; do not add write
operations without an explicit disposable-data and cleanup strategy.

Set `TOOLSHOP_SITE_URL` and `TOOLSHOP_API_URL` to use another compatible
environment for both health checks and tests. Invalid target names fail
explicitly.

## Test suites

| Suite                          | Owner               | Default behavior                                                                            |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------- |
| `tests/unit`, `tests/mocked`   | Playwright          | Hermetic; runs in CI                                                                        |
| `tests/hermetic`               | Playwright + Vibium | Hermetic; informational in CI                                                               |
| `tests/api`, `tests/contract`  | Playwright          | Blocking regression on the disposable SUT; public checks are informational                  |
| `tests/e2e`                    | Playwright          | Registration and checkout on the disposable SUT; public catalog comparison is informational |
| `tests/vibium`, `tests/hybrid` | Vibium + Playwright | Live; informational in CI                                                                   |
| `tests/security`               | Playwright          | OWASP API Top 10 checks (authN/authZ, JWT tampering, injection, data exposure) on the SUT   |
| `tests/nonfunctional`          | Playwright + axe    | Accessibility, performance budgets, mobile layout and fault-injection resilience on the SUT |

`tests/mocked` also runs axe-core against the deterministic fixture. Playwright
traces, screenshots, and HTML reports are retained as CI artifacts.

The [checkout E2E matrix](tests/e2e/checkout.spec.ts) covers bank transfer, cash on
delivery, credit card, buy-now-pay-later, and gift card (`TC-E2E-010` to `TC-E2E-014`).
Each case starts with a fresh browser/cart, checks payment, confirms the order,
and verifies that the UI displays the invoice number returned by the API.
Writes are restricted to `TOOLSHOP_TARGET=local`; no public demo accounts are modified.

### Test types and design techniques

| Type                          | Where                                                        | ISTQB technique / standard                         |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Positive functional (API, UI) | `tests/api`, `tests/e2e`                                     | Use-case testing, data-driven equivalence classes  |
| Negative and validation       | `tests/api/robustness.spec.ts`, `tests/e2e/negative.spec.ts` | Equivalence partitioning, BVA, error guessing      |
| Payment rule partitions       | `src/data/payments.ts` (shared by API and UI)                | Invalid partitions per field, client/server parity |
| Contract                      | `tests/contract`                                             | OpenAPI schema validation                          |
| Security                      | `tests/security`                                             | OWASP API Security Top 10                          |
| Accessibility                 | `tests/nonfunctional/accessibility.spec.ts`                  | WCAG 2.1 AA with axe-core                          |
| Performance                   | `tests/nonfunctional/performance.spec.ts`                    | p95 latency budget, concurrency smoke              |
| Mobile / responsive           | `tests/nonfunctional/responsive.spec.ts`                     | Viewport overflow and navigation usability         |
| Resilience                    | `tests/nonfunctional/resilience.spec.ts`                     | Fault injection (latency, 5xx, connection refused) |

Defects found by these suites are tracked in the [defect log](docs/test-management/defect-log.md);
their detecting tests use `test.fail()` so the pipeline turns red as soon as behaviour changes.

With Docker Compose available, run the same suite locally:

```bash
npm run sut:up
npm run test:local -- tests/e2e
npm run sut:down
```

Docker is not required on your workstation when running the workflow in GitHub Actions.

## Reporting and GitHub Actions

- `ci.yml` runs typecheck, hermetic tests, API/contract and checkout E2E regression
  against a seeded Docker SUT, health-gated public checks, and informational
  Vibium/hybrid smokes on Windows.
- `nightly.yml` compares the stable and intentionally buggy Toolshop targets.
- The unified JSON/Markdown report appears in the Actions Summary and artifacts.
- When Pages is enabled for the repository, a dashboard can be published from
  the on-demand workflow or a push to `main`. It lists reports not produced
  separately from skipped test cases and requests fresh data on each load.
- No AI or application secrets are required.

For manual Vibium exploration, follow [the catalog charter](charters/catalog.md).
Start Vibium's MCP server with `npx vibium mcp` for an external compatible agent,
or use `npx vibium map` and `npx vibium record` for manual exploration evidence.

The nightly workflow runs the Playwright UI suites in Chromium, Firefox, and
WebKit, plus a pixel baseline on Windows Chromium to keep the visual environment
consistent. To run those locally, install the additional browsers with
`npx playwright install firefox webkit`, then run `npm run test:cross-browser`
and `npm run test:visual`. The visual test skips other platforms and browsers
instead of comparing against an incompatible baseline.
