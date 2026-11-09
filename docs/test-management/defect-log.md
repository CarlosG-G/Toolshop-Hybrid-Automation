# Defect log

Defects found by the automated suites against the self-hosted Toolshop (sprint 5).
Severity and priority follow the ISTQB glossary; each defect is linked to the test case that detects it.
Detecting tests are marked with `test.fail()` so the pipeline stays green while the defect is open
and turns red as soon as the behaviour changes (fixed or regressed differently).

| ID      | Title                                              | Severity | Priority | Detected by | Status |
| ------- | -------------------------------------------------- | -------- | -------- | ----------- | ------ |
| DEF-001 | Registration accepts customers older than 75 years | Major    | Medium   | TC-API-025  | Open   |

## DEF-001 — Registration accepts customers older than 75 years

- **Environment:** self-hosted SUT (`TOOLSHOP_TARGET=local`), `POST /users/register`.
- **Requirement:** OpenAPI `UserRequest.dob` — "Must be a valid date between 18 and 75 years ago".
- **Steps:** register a customer whose date of birth is 76 years ago.
- **Expected:** HTTP 422 with `Customer must be younger than 75 years old.`
- **Actual:** HTTP 201, the customer is created.
- **Root cause (static analysis of the provider source):** `StoreCustomer::rules()` calls
  `$dt->subYears(18)` and then `$dt->subYears(75)` on the same mutable `Carbon` instance,
  so the upper bound becomes 93 years instead of 75.
- **Technique:** boundary value analysis (3-value BVA around 18 and 75 years).
