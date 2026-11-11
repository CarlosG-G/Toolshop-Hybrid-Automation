# Improvement roadmap

Planned work for the next test cycle, prioritised by product risk (see the
[test strategy](test-management/test-strategy.md#8-product-risk-analysis)) and
by the lessons in the
[test completion report](test-management/test-completion-report.md).

Baseline at v1.1.0: all CI workflows green on `main`, six open defects
(DEF-001 to DEF-006), mutation score 70.14% (break threshold 65%), two visual
baselines (mocked catalog, live login page).

Status values: `planned`, `in progress`, `done`.

## Phase 1: quick wins

| ID    | Improvement                                                                                            | Why                                                                                                  | Acceptance criteria                                                                                                                                           | Effort | Status |
| ----- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| RM-01 | Add exact-birthday boundary tests for age 18 and 75 in [`auth.spec.ts`](../tests/api/auth.spec.ts)     | Current BVA uses 18 years minus one day and 75 years plus one day; the exact boundaries are untested | New TC IDs cover the 18th and 75th birthdays; the expected result follows the documented rule or is marked as a known defect; traceability matrix regenerated | S      | done   |
| RM-02 | Run the [registration charter](../charters/registration.md) against the local SUT                      | Registration holds four of the seven open defects                                                    | Session notes and evidence stored; new findings logged as `defect` issues or turned into automated checks                                                     | S      | done   |
| RM-03 | Publish a reviewer-friendly summary of all known defects with links to their frozen failure signatures | Makes the value of the suite visible in under a minute                                               | README quick tour links each DEF ID to its issue and test                                                                                                     | S      | done   |

RM-01 result: TC-API-068 and TC-API-069 cover the exact 18th and 75th birthdays.
TC-API-068 found [DEF-007](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19):
the API rejects customers on their 18th birthday.

RM-02 result: the [session notes](test-management/sessions/2026-11-11-registration.md)
record 30 inputs across the UI and the API. DEF-001, DEF-004, DEF-006 and DEF-007
reproduced with their recorded signatures. Three new defects were logged and
automated: DEF-009 ([#29](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/29), TC-API-070), DEF-010
([#28](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/28), TC-E2E-025) and DEF-011 ([#30](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/30), TC-E2E-026).

## Phase 2: mid-term

| ID    | Improvement                                                                                  | Why                                                                                         | Acceptance criteria                                                                                                        | Effort | Status |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| RM-04 | Run the live local SUT suite (`npm run test:local`) in a CI job using Docker Compose         | The public sites return 403 on GitHub-hosted runners, so live checks are informational only | A workflow starts the SUT, runs the `api`, `e2e` and `bdd` projects with writes enabled, uploads the report and tears down | M      | done   |
| RM-05 | Raise the mutation score from 70.14% to at least 75% and the break threshold from 65% to 70% | Surviving mutants show assertions that do not detect real changes                           | Weekly mutation run reports at least 75%; `stryker.config.json` break threshold updated                                    | M      | done   |
| RM-06 | Extend visual baselines to checkout, registration and product detail on the local SUT        | Only two visual baselines exist today                                                       | Three new `toHaveScreenshot` checks with masked dynamic content and stable reruns                                          | M      | done   |
| RM-07 | Extend the axe-core scan to product detail, cart and checkout                                | TC-A11Y-001 to 004 cover home, login, registration and contact only; checkout has risk 9    | New TC-A11Y IDs for the three pages; any critical finding logged as a defect and frozen with `markKnownDefect`             | S      | done   |

RM-04 review: already in place before this roadmap. The `SUT / <suite>` jobs in
[`ci.yml`](../.github/workflows/ci.yml) start the SUT with Docker Compose
(`npm run sut:up`) and run the `api`, `ui-1`/`ui-2` (e2e), `bdd`, `visual`,
`nonfunctional` and `vibium` suites against it with writes enabled. They upload
reports, and the SUT is discarded with the runner. These jobs are the blocking
gate on every pull request.

RM-07 result: TC-A11Y-005 (product detail), TC-A11Y-006 (cart) and TC-A11Y-007
(checkout payment step) were added to
[`accessibility.spec.ts`](../tests/nonfunctional/accessibility.spec.ts). The
first run against the local SUT found no critical WCAG 2.1 AA violations on
these pages, so no new defect was logged.

RM-06 result: TC-VIS-002 (registration form), TC-VIS-003 (product detail) and
TC-VIS-004 (checkout payment step with the credit card fields) were added to
[`sut.spec.ts`](../tests/visual/sut.spec.ts). Each check captures one stable
region instead of the full page, so headers, notifications and chat widgets stay
out of the image and no masks are needed. Baselines were generated in the pinned
CI Playwright image against a fresh local SUT and passed two repeated runs.

RM-05 result: new unit tests pin every validation branch in
[`history.ts`](../src/reporting/history.ts) and the edge cases of
[`openapi-contract.ts`](../src/api/openapi-contract.ts): `load()`, the version,
operation listing, `int32` handling, JSON pointer escaping and incomplete
operations. A full local Stryker run scored 80.22% (446 of 556 mutants killed),
up from 70.14%. The break threshold is now 70%. Most remaining survivors are in
[`quality.ts`](../src/reporting/quality.ts) or are equivalent mutants, such as
the validator cache or OpenAPI formats that Ajv treats as annotations.

RM-09 result: five successful nightly-quality runs (25 Lighthouse samples per
page) set the new budgets. Lighthouse budgets are now per page: accessibility
and best practices rise from 0.80 to 0.90, login performance from 0.60 to 0.70,
and home performance stays at 0.60 because its median already reaches it. The
k6 p95 threshold drops from 1500 ms to 100 ms against an observed 10.0–16.4 ms.
The derivation is in the
[test plan](test-management/test-plan.md#non-functional-budgets).

## Phase 3: long-term

| ID    | Improvement                                                                 | Why                                                                    | Acceptance criteria                                                                               | Effort | Status  |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | ------- |
| RM-08 | Report DEF-001 to DEF-011 upstream to the Practice Software Testing project | Closes the loop with the product owner instead of only logging locally | Upstream issues linked from each local defect issue; status mirrored in the defect log            | S      | planned |
| RM-09 | Tighten Lighthouse and k6 budgets using the nightly-quality history         | Current budgets were set before enough trend data existed              | Budgets derived from recorded runs and documented in the test plan                                | M      | done    |
| RM-10 | Broaden contract coverage to every endpoint used by the UI flows            | Contract risk score is 6; uncovered endpoints can drift silently       | Coverage list in the traceability matrix; schema validation for each endpoint used by e2e and BDD | L      | done    |

RM-10 result: the endpoints were captured from the nginx access log of a local
run of the e2e and BDD projects. The new
[contract coverage list](test-management/traceability-matrix.md#contract-coverage-of-ui-flow-endpoints)
maps all 17 operations: 15 are schema-validated by TC-CON-002 to TC-CON-013.
`GET /product-specs/names` documents no response schema and `GET /postcode-lookup`
proxies a third-party service, so both are listed with a justification instead.
TC-CON-013 found DEF-008 ([#26](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/26)):
`POST /invoices` returns an undocumented 201 and a null number field.

## Out of scope

- Testing third-party services (postcode lookup, payment providers) directly.
- Running write-heavy or load tests against the shared public environments.

## Review

Revisit this roadmap at each release tag and move finished items into the
[changelog](../CHANGELOG.md).
