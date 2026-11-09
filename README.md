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
If that smoke fails, CI logs Chrome startup and shared-library diagnostics.
On restricted Ubuntu runners, CI uses the preinstalled Chrome sandbox helper
instead of disabling the browser sandbox.

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
Playwright Chromium, matching the live browser tests. The cross-browser command
checks the UI before it starts.

Some hosted runners receive HTTP 403 from the public site. The report marks the
site unavailable and skips live UI and Vibium checks in that case; the local
hybrid smoke still runs. Run live tests locally where access is allowed or use
an authorized compatible deployment.

The `stable` and `with-bugs` targets can also be selected with
`TOOLSHOP_TARGET`. Live tests use the public catalog only; do not add write
operations without an explicit disposable-data and cleanup strategy.

Set `TOOLSHOP_SITE_URL` and `TOOLSHOP_API_URL` to use another compatible
environment for both health checks and tests. Invalid target names fail
explicitly.

## Test suites

| Suite | Owner | Default behavior |
| --- | --- | --- |
| `tests/unit`, `tests/mocked` | Playwright | Hermetic; runs in CI |
| `tests/hermetic` | Playwright + Vibium | Hermetic; informational in CI |
| `tests/api`, `tests/e2e` | Playwright | Live; runs only after a successful health check |
| `tests/vibium`, `tests/hybrid` | Vibium + Playwright | Live; informational in CI |

`tests/mocked` also runs axe-core against the deterministic fixture. Playwright
traces, screenshots, and HTML reports are retained as CI artifacts.

## Reporting and GitHub Actions

- `ci.yml` runs typecheck, hermetic tests, a health-gated read-only live suite,
  and an informational Vibium/hybrid smoke.
- `nightly.yml` compares the stable and intentionally buggy Toolshop targets.
- The unified JSON/Markdown report appears in the Actions Summary and artifacts.
- When Pages is enabled for the repository, a dashboard can be published from
  the on-demand workflow or a push to `main`.
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
