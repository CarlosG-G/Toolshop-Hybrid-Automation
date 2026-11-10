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

| ID    | Improvement                                                                                            | Why                                                                                                  | Acceptance criteria                                                                                                                                           | Effort | Status      |
| ----- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| RM-01 | Add exact-birthday boundary tests for age 18 and 75 in [`auth.spec.ts`](../tests/api/auth.spec.ts)     | Current BVA uses 18 years minus one day and 75 years plus one day; the exact boundaries are untested | New TC IDs cover the 18th and 75th birthdays; the expected result follows the documented rule or is marked as a known defect; traceability matrix regenerated | S      | done        |
| RM-02 | Run the [registration charter](../charters/registration.md) against the local SUT                      | Registration holds four of the seven open defects                                                    | Session notes and evidence stored; new findings logged as `defect` issues or turned into automated checks                                                     | S      | in progress |
| RM-03 | Publish a reviewer-friendly summary of all known defects with links to their frozen failure signatures | Makes the value of the suite visible in under a minute                                               | README quick tour links each DEF ID to its issue and test                                                                                                     | S      | done        |

RM-01 result: TC-API-068 and TC-API-069 cover the exact 18th and 75th birthdays.
TC-API-068 found [DEF-007](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19):
the API rejects customers on their 18th birthday.

## Phase 2: mid-term

| ID    | Improvement                                                                                  | Why                                                                                         | Acceptance criteria                                                                                                        | Effort | Status  |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| RM-04 | Run the live local SUT suite (`npm run test:local`) in a CI job using Docker Compose         | The public sites return 403 on GitHub-hosted runners, so live checks are informational only | A workflow starts the SUT, runs the `api`, `e2e` and `bdd` projects with writes enabled, uploads the report and tears down | M      | done    |
| RM-05 | Raise the mutation score from 70.14% to at least 75% and the break threshold from 65% to 70% | Surviving mutants show assertions that do not detect real changes                           | Weekly mutation run reports at least 75%; `stryker.config.json` break threshold updated                                    | M      | planned |
| RM-06 | Extend visual baselines to checkout, registration and product detail on the local SUT        | Only two visual baselines exist today                                                       | Three new `toHaveScreenshot` checks with masked dynamic content and stable reruns                                          | M      | planned |
| RM-07 | Extend the axe-core scan to product detail, cart and checkout                                | TC-A11Y-001 to 004 cover home, login, registration and contact only; checkout has risk 9    | New TC-A11Y IDs for the three pages; any critical finding logged as a defect and frozen with `markKnownDefect`             | S      | planned |

RM-04 review: already in place before this roadmap. The `SUT / <suite>` jobs in
[`ci.yml`](../.github/workflows/ci.yml) start the SUT with Docker Compose
(`npm run sut:up`) and run the `api`, `ui-1`/`ui-2` (e2e), `bdd`, `visual`,
`nonfunctional` and `vibium` suites against it with writes enabled. They upload
reports, and the SUT is discarded with the runner. These jobs are the blocking
gate on every pull request.

## Phase 3: long-term

| ID    | Improvement                                                                 | Why                                                                    | Acceptance criteria                                                                               | Effort | Status  |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | ------- |
| RM-08 | Report DEF-001 to DEF-007 upstream to the Practice Software Testing project | Closes the loop with the product owner instead of only logging locally | Upstream issues linked from each local defect issue; status mirrored in the defect log            | S      | planned |
| RM-09 | Tighten Lighthouse and k6 budgets using the nightly-quality history         | Current budgets were set before enough trend data existed              | Budgets derived from recorded runs and documented in the test plan                                | M      | planned |
| RM-10 | Broaden contract coverage to every endpoint used by the UI flows            | Contract risk score is 6; uncovered endpoints can drift silently       | Coverage list in the traceability matrix; schema validation for each endpoint used by e2e and BDD | L      | planned |

## Out of scope

- Testing third-party services (postcode lookup, payment providers) directly.
- Running write-heavy or load tests against the shared public environments.

## Review

Revisit this roadmap at each release tag and move finished items into the
[changelog](../CHANGELOG.md).
