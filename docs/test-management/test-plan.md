# Level test plan — Toolshop regression, release 1.x

Structured after the test plan template in ISO/IEC/IEEE 29119-3 and the ISTQB
Foundation Level syllabus. The [test strategy](test-strategy.md) is the master
plan; this document applies it to the current release cycle.

| Field           | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Identifier      | TP-TOOLSHOP-1.x                                                           |
| Test basis      | [Requirements](requirements.json), Toolshop OpenAPI, WCAG 2.1 AA          |
| Test object     | Practice Software Testing Toolshop (Angular UI + Laravel API), sprint 5   |
| Test levels     | Component (framework), integration (API/contract), system, acceptance     |
| Status evidence | [Live dashboard](https://carlosg-g.github.io/Toolshop-Hybrid-Automation/) |

## 1. Context

Toolshop is a third-party e-commerce sample application. The test team
(one SDET, the author) owns the automation and the quality evidence, not the
product code. Defects are therefore reported, encoded and tracked, but never
fixed in the SUT. The goal of each cycle is an evidence-based answer to:
_"Do the high-risk customer journeys still behave as specified?"_

## 2. Test items and features

| Requirement | Feature                                  | Product risk | Planned depth                                   |
| ----------- | ---------------------------------------- | ------------ | ----------------------------------------------- |
| REQ-CAT-01  | Browse and search the catalog            | High         | API, UI, mobile, performance, resilience, a11y  |
| REQ-AUTH-01 | Authentication and profile               | High         | API, E2E, JWT tampering, visual, a11y           |
| REQ-REG-01  | Registration with validated data         | High         | BVA, EP, client/server parity, BDD, a11y        |
| REQ-CART-01 | Cart management                          | Medium       | API, hybrid Vibium journey                      |
| REQ-PAY-01  | Payment methods                          | High         | EP across 5 methods, BDD scenario outlines, E2E |
| REQ-CHK-01  | Checkout                                 | High         | State transitions in API, BDD and E2E           |
| REQ-API-01  | API contract                             | Medium       | OpenAPI schema validation                       |
| REQ-SEC-01  | Security                                 | High         | Authorization, injection, headers, ZAP DAST     |
| REQ-NFR-01  | Non-functional (performance, a11y, load) | Medium       | k6 thresholds, Lighthouse budgets, axe          |

**Out of scope:** third-party postcode and payment providers (avoided by
design), production capacity, real-user performance, penetration testing,
mobile native apps and browsers other than Chromium, Firefox and WebKit.

## 3. Test approach

| Level / type         | Tooling                        | Design techniques                        | Gate              |
| -------------------- | ------------------------------ | ---------------------------------------- | ----------------- |
| Framework unit       | Playwright test runner         | Statement/decision coverage of utilities | Blocking          |
| Mocked UI (hermetic) | Playwright + route fixtures    | Error guessing, state transition         | Blocking          |
| API functional       | Playwright request + Ajv       | EP, BVA, error guessing                  | Blocking          |
| API contract         | OpenAPI schema validation      | Specification-based                      | Blocking          |
| Security             | Playwright request, OWASP ZAP  | Error guessing, OWASP Top 10 checklist   | Blocking / triage |
| E2E UI               | Playwright, sharded            | Use cases, state transition              | Blocking          |
| BDD acceptance       | playwright-bdd (Gherkin)       | Example mapping, scenario outlines       | Blocking          |
| Accessibility        | axe-core (WCAG 2.1 AA)         | Checklist-based                          | Blocking          |
| Visual               | Playwright snapshots           | Baseline comparison                      | Blocking          |
| Hybrid / AI-assisted | Vibium (WebDriver BiDi, MCP)   | Exploratory charters, cross-tool oracle  | Blocking          |
| Performance and load | k6, Lighthouse                 | Thresholds and budgets                   | Nightly           |
| Public diagnostics   | Read-only suites on public env | Smoke                                    | Informational     |

Regression selection is risk-based: every pull request runs all blocking
suites; the nightly cycle adds the cross-browser matrix, the stable versus
with-bugs comparison, load, DAST and Lighthouse.

### Non-functional budgets

Budgets were derived from the five successful nightly-quality runs between
2026-11-09 and 2026-11-11 (25 Lighthouse samples per page). Each Lighthouse
budget is the largest 0.05 step at least 0.04 below the lowest observed score,
and no budget was loosened.

| Check                        | Observed range | Previous budget | Budget   |
| ---------------------------- | -------------- | --------------- | -------- |
| Lighthouse home performance  | 0.60?0.64      | 0.60            | 0.60     |
| Lighthouse login performance | 0.74?0.76      | 0.60            | 0.70     |
| Lighthouse accessibility     | 0.94?0.96      | 0.80            | 0.90     |
| Lighthouse best practices    | 0.96           | 0.80            | 0.90     |
| k6 `http_req_duration` p95   | 10.0?16.4 ms   | < 1500 ms       | < 100 ms |

Home performance stays at 0.60 because the observed median already touches it.
The k6 budget keeps about six times headroom over the worst observed p95 to
absorb hosted-runner variance. Revisit the budgets when the SUT version or the
runner image changes.

## 4. Test environment and data

- **Blocking:** a disposable SUT started on the CI runner (`npm run sut:up`)
  and torn down afterwards. Each test creates unique data through API fixtures.
- **Informational:** public `stable` and `with-bugs` environments, read-only.
- **Hermetic:** mocked fixtures with no network for fast feedback and demos.
- Browsers: Chromium for every run; Firefox and WebKit in the nightly matrix
  using a digest-pinned Playwright image.

## 5. Criteria

| Criterion  | Definition                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry      | Typecheck, lint and format pass; SUT health check passes; requirement traceability regenerates without diffs.                                  |
| Exit       | 100 % of blocking suites pass; expected failures match open defects; 100 % requirement design and execution coverage; no open Critical defect. |
| Suspension | SUT health check fails, or more than 10 % of cases in one suite fail for an infrastructure reason.                                             |
| Resumption | Root cause recorded in the run summary and the health check passes again.                                                                      |

## 6. Deliverables

| Deliverable                  | Where                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Test cases (`TC-*`)          | `tests/` (code is the specification) and Gherkin features in `tests/features`                                                                  |
| Traceability matrix          | [traceability-matrix.md](traceability-matrix.md), regenerated and checked in CI                                                                |
| Defect reports               | [defect-log.md](defect-log.md) and GitHub issues labelled `defect`                                                                             |
| Test logs and evidence       | Workflow artifacts: Playwright HTML report, traces, screenshots, k6, ZAP and Lighthouse reports                                                |
| Test progress and completion | [Dashboard](https://carlosg-g.github.io/Toolshop-Hybrid-Automation/), generated exit report and [completion report](test-completion-report.md) |
| Exploratory charters         | [`charters/`](../../charters)                                                                                                                  |

## 7. Project risks

| Risk                                           | Mitigation                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Public environments change or block CI traffic | Blocking gate uses only the disposable SUT; public suites are informational |
| Shared data makes tests order-dependent        | Unique identities per test, no writes to public environments                |
| Flaky UI timing                                | Web-first assertions, retries reported as _flaky_, never as passes          |
| Third-party action or dependency compromise    | SHA-pinned actions, Dependabot, dependency review, CodeQL, Scorecard        |
| Single maintainer                              | Documented workflows, conventional commits and reproducible commands        |

## 8. Roles

| Role                    | Responsibility                                                          |
| ----------------------- | ----------------------------------------------------------------------- |
| Test manager / SDET     | Plan, risk analysis, automation, triage and completion report           |
| CI (GitHub Actions)     | Execution, evidence collection, gate decisions and dashboard publishing |
| Reviewer (pull request) | Checks test intent, traceability and evidence before merge              |

## 9. Approval

The plan is approved through the pull request that changes it. A release tag
(`v*.*.*`) is created only when the exit criteria are met on `main`.
