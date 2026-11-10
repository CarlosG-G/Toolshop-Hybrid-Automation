# Test completion report — release 1.0 regression cycle

ISTQB test completion report (ISO/IEC/IEEE 29119-3) for the cycle that closed
release [v1.0.0](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/releases/tag/v1.0.0).
Every number links back to executed evidence; the
[live dashboard](https://carlosg-g.github.io/Toolshop-Hybrid-Automation/) always
shows the latest cycle.

| Field    | Value                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Plan     | [TP-TOOLSHOP-1.x](test-plan.md)                                                                        |
| Evidence | [CI run 42802401592](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/actions/runs/42802401592) |
| Nightly  | [Run 42800806200](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/actions/runs/42800806200)    |
| Targets  | Disposable SUT (blocking), public `stable` (informational)                                             |

## 1. Summary

**Recommendation: exit criteria met.** All blocking suites passed. The seven
detected observations correspond to six open, documented SUT defects; none is
Critical. The application is a third-party sample, so the recommendation
describes the test cycle, not a production release authorization.

## 2. Results

| Metric                         | Value         |
| ------------------------------ | ------------- |
| Executed test cases            | 225           |
| Passed                         | 218           |
| Known-defect observations      | 7             |
| Failed (unexpected)            | 0             |
| Flaky (passed on retry)        | 0             |
| Skipped (not applicable)       | 45            |
| Pass rate (excluding skipped)  | 96.89 %       |
| Requirement design coverage    | 9 / 9 (100 %) |
| Requirement execution coverage | 9 / 9 (100 %) |

Skipped cases are target-specific: write and destructive cases are skipped on
public environments and public-only checks are skipped on the SUT.

### By test type

| Type                                                               | Passed | Detected | Failed |
| ------------------------------------------------------------------ | -----: | -------: | -----: |
| Unit                                                               |     56 |        0 |      0 |
| Mocked UI                                                          |     28 |        0 |      0 |
| API                                                                |     62 |        5 |      0 |
| Contract                                                           |      7 |        0 |      0 |
| Security                                                           |     13 |        0 |      0 |
| E2E                                                                |     20 |        0 |      0 |
| Accessibility                                                      |      2 |        2 |      0 |
| BDD, visual, Vibium, hermetic, performance, resilience, responsive |     30 |        0 |      0 |

### Non-functional

| Check      | Budget                             | Result                                                       |
| ---------- | ---------------------------------- | ------------------------------------------------------------ |
| k6 load    | p95 < 1.5 s, errors < 1 %, 50 VUs  | p95 11.9 ms, 0 % errors, 4 278 requests ✔                    |
| Lighthouse | Performance ≥ 0.60, a11y/BP ≥ 0.80 | Home 0.62 / 0.96 / 0.96 ✔                                    |
| OWASP ZAP  | Triage only                        | Medium: missing CSP and anti-clickjacking headers in the SUT |

## 3. Defects

| Severity | Open | Issues                    |
| -------- | ---: | ------------------------- |
| Critical |    0 | —                         |
| Major    |    3 | DEF-001, DEF-004, DEF-005 |
| Minor    |    3 | DEF-002, DEF-003, DEF-006 |

Details, root cause analysis and reproduction steps are in the
[defect log](defect-log.md) and the
[`defect` issues](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues?q=label%3Adefect).
Registration (REQ-REG-01) concentrates three of the six defects and remains the
highest-risk area for the next cycle.

## 4. Deviations from the plan

- Public diagnostics were blocked by the CDN's bot protection on hosted runners
  until the health check and Vibium sessions presented a regular desktop user
  agent. They are informational and did not affect the gate.
- ZAP header findings belong to the third-party SUT and are kept visible
  instead of being suppressed.

## 5. Lessons learned and next cycle

- Keep encoding known defects with `test.fail()` on the exact failure
  signature; a changed signature fails the gate and forces triage.
- Add mutation testing to measure the fault-detection ability of the framework
  utilities, not only their coverage.
- Extend exploratory charters for registration, where defect density is highest.

Follow-up: mutation testing was added in v1.1.0. The
[registration exploration charter](../../charters/registration.md) provides
a focused local-SUT session for the next cycle. After this cycle, the
exact-birthday boundary cases from roadmap item RM-01 (TC-API-068, TC-API-069)
found [DEF-007](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19):
the API rejects customers on their 18th birthday. Registration now holds four
of the seven open defects; the figures above describe the v1.0 cycle only.
