# Defect log

Defects found by the automated suites against the self-hosted Toolshop (sprint 5).
Severity and priority follow the ISTQB glossary; each defect is linked to the test case that detects it.
Detecting tests are marked with `test.fail()` so the pipeline stays green while the defect is open
and turns red as soon as the behaviour changes (fixed or regressed differently).

| ID      | Title                                              | Severity | Priority | Detected by | Status |
| ------- | -------------------------------------------------- | -------- | -------- | ----------- | ------ |
| DEF-001 | Registration accepts customers older than 75 years | Major    | Medium   | TC-API-025  | Open   |
| DEF-002 | Payment check accepts undocumented payment methods | Minor    | Low      | TC-API-042  | Open   |

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

## DEF-002 — Payment check accepts undocumented payment methods

- **Environment:** all targets, `POST /payment/check`.
- **Requirement:** OpenAPI `PaymentRequest.payment_method` is an enum of five methods.
- **Steps:** send `{ "payment_method": "crypto", "payment_details": {} }`.
- **Expected:** HTTP 422 (value outside the documented equivalence partition).
- **Actual:** HTTP 200 `Payment was successful`.
- **Root cause:** `PaymentController::check` only runs validation inside `if` branches for the
  known methods; any other value falls through to the success response.
- **Technique:** equivalence partitioning (invalid partition of `payment_method`).
