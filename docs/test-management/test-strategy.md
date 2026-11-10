# Test strategy and master test plan

Aligned with ISTQB Foundation Level (CTFL v4.0) and ISO/IEC/IEEE 29119 terminology.
The release-level [test plan](test-plan.md) and the v1.0 [test completion report](test-completion-report.md)
refine this master plan for one test cycle.

## 1. Scope and objectives

- **Test object:** Practice Software Testing "Toolshop" (Angular UI + Laravel REST API), self-hosted with Docker Compose.
- **Objectives:** find defects early, give confidence in the checkout revenue path, demonstrate
  automation skills with Playwright (UI/API) and Vibium (independent browser automation).
- **Out of scope:** admin back office, third-party postcode lookup service, and writes,
  load or active security scans against public environments.

## 2. Test levels and types

| Level / type           | Suite                            | Environment           | Gate                    |
| ---------------------- | -------------------------------- | --------------------- | ----------------------- |
| Unit (tooling)         | `tests/unit`                     | none                  | blocking                |
| Component (UI, mocked) | `tests/mocked`, `tests/hermetic` | deterministic fixture | blocking                |
| API / integration      | `tests/api`                      | self-hosted SUT       | blocking                |
| Contract               | `tests/contract`                 | self-hosted SUT       | blocking                |
| System (E2E / BDD)     | `tests/e2e`, `tests/features`    | self-hosted SUT       | blocking                |
| Independent browser    | `tests/vibium/local.spec.ts`     | self-hosted SUT       | blocking                |
| Security               | `tests/security`                 | self-hosted SUT       | blocking                |
| Non-functional         | `tests/nonfunctional`            | self-hosted SUT       | blocking                |
| Visual                 | `tests/visual/sut.spec.ts`       | Linux SUT container   | blocking                |
| Load / DAST / audit    | k6, ZAP, Lighthouse              | separate SUT          | nightly; ZAP is triaged |
| Smoke / compatibility  | `tests/vibium`, `tests/hybrid`   | public environments   | informational           |

## 3. Test design techniques

| Technique                  | Applied to                                                |
| -------------------------- | --------------------------------------------------------- |
| Equivalence partitioning   | Payment fields, password policy, email format             |
| Boundary value analysis    | Customer age (18 and 75 years)                            |
| Decision/state transitions | Checkout wizard (cart, sign-in, address, payment)         |
| Use-case testing           | Register, sign in, buy with every payment method          |
| Error guessing             | Malformed JSON, oversized input, JWT tampering, injection |
| Experience-based           | Accessibility scan, resilience under injected faults      |

## 4. Entry and exit criteria

- **Entry:** build compiles (`npm run typecheck`), lint has zero warnings, SUT health check passes.
- **Exit (per run):**
  - 100 % of blocking suites pass; expected failures (`test.fail`) match open defects in the defect log.
  - Every test case is traced to a requirement (`npm run traceability`).
  - No open defect of severity _Critical_; _Major_ defects have an owner and a decision.

The criteria describe a release decision, not a claim that the third-party
sample application is production-ready. Open SUT defects in this portfolio do
not have assigned product owners.

## 5. Environments and data

- **Blocking:** disposable SUT started in CI (`npm run sut:up`); seeded customer; unique identities per test (`buildRegistration`).
- **Informational:** public stable and with-bugs environments, read-only, never modified.

## 6. Defect management

Defects are recorded in the [defect log](defect-log.md) with severity, priority, technique and detecting test,
and each one is tracked as a GitHub issue labelled `defect` using the defect-report issue form.
For known SUT defects, the expected observed response or violation is asserted
before `test.fail()` is set. A changed signature or an unrelated earlier error
therefore fails normally and requires triage.

A flaky test is a test defect: retain its trace, open an issue, assign an owner
and investigate the root cause. A successful retry is not counted as a clean pass.

## 7. Metrics reported

The exit report records passed, detected, failed, flaky and skipped cases, open
defects by severity and [requirement traceability](traceability-matrix.md).
Pass rate divides clean passes by executed cases; skipped cases are excluded,
while detected observations and flaky cases remain in the denominator.
Detected observations count test cases, not unique defects: multiple cases or
targets can detect the same defect. Requirement execution coverage means at
least one linked case executed, not that every linked case passed. Missing
reports are identified separately.

## 8. Product risk analysis

Risk = likelihood x impact (1 low, 3 high). Priority drives which suites are blocking and how deep they go.

| Area                 | Likelihood | Impact | Score | Response                                                          |
| -------------------- | ---------- | ------ | ----- | ----------------------------------------------------------------- |
| Checkout and payment | 3          | 3      | 9     | Full matrix across 5 methods, negative partitions in API and UI   |
| Authentication       | 2          | 3      | 6     | Positive, negative, JWT tampering, lockout avoided on shared envs |
| Registration         | 3          | 2      | 6     | BVA, password policy, client/server parity                        |
| API contract         | 2          | 3      | 6     | OpenAPI schema validation                                         |
| Catalog              | 2          | 2      | 4     | API, UI, performance, resilience                                  |
| Accessibility        | 2          | 2      | 4     | axe-core WCAG 2.1 AA on key pages                                 |
| Third-party services | 2          | 2      | 4     | Avoided by design (postcode omitted in API tests)                 |
