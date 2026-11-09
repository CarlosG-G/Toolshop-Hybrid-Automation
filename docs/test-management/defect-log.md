# Defect log

Defects found by the automated suites against the self-hosted Toolshop (sprint 5).
Severity and priority follow the ISTQB glossary; each defect is linked to the test case that detects it.
Detecting tests are marked with `test.fail()` so the pipeline stays green while the defect is open
and turns red as soon as the behaviour changes (fixed or regressed differently).

| ID      | Title                                                | Severity | Priority | Detected by | Status                 |
| ------- | ---------------------------------------------------- | -------- | -------- | ----------- | ---------------------- |
| DEF-001 | Registration accepts customers older than 75 years   | Major    | Medium   | TC-API-025  | Open                   |
| DEF-002 | Payment check accepts undocumented payment methods   | Minor    | Low      | TC-API-042  | Open                   |
| DEF-003 | Public stable API returns 500 for an unknown product | Minor    | Low      | TC-API-003  | Open (public env only) |
| DEF-004 | Registration API accepts a malformed email           | Major    | High     | TC-API-062  | Open                   |
| DEF-005 | Icon-only buttons without an accessible name         | Major    | Medium   | TC-A11Y-002 | Open                   |
| DEF-006 | Registration API does not require date of birth      | Minor    | Medium   | TC-API-067  | Open                   |

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

## DEF-003 — Public stable API returns 500 for an unknown product

- **Environment:** `https://api.practicesoftwaretesting.com` only; the self-hosted SUT returns 404.
- **Steps:** `GET /products/01UNKNOWNPRODUCT00000000000`.
- **Expected:** HTTP 404 (documented response for a missing product).
- **Actual:** HTTP 500.
- **Note:** public environments run a different build and shared data, so their suites are
  informative in CI; the blocking gate is the self-hosted SUT.

## DEF-004 — Registration API accepts a malformed email

- **Environment:** self-hosted SUT (`TOOLSHOP_TARGET=local`), `POST /users/register`.
- **Requirement:** `email` must be a valid address; the registration form enforces an email pattern.
- **Steps:** register a customer with `email = "not-an-email-<uuid>"` and every other field valid.
- **Expected:** HTTP 422 with a validation error for `email`.
- **Actual:** HTTP 201, the customer is created with an unusable login.
- **Impact:** client-side validation is the only barrier; any API consumer can create broken accounts.
- **Technique:** equivalence partitioning (invalid partition of `email`), client/server validation parity.

## DEF-005 — Icon-only buttons without an accessible name

- **Environment:** self-hosted SUT, `/auth/login` and `/auth/register` (Chromium, axe-core 4.x).
- **Requirement:** WCAG 2.1 SC 4.1.2 Name, Role, Value (axe rule `button-name`, impact _critical_).
- **Steps:** open the page and run an axe-core scan with the `wcag2a`/`wcag2aa` tags.
- **Expected:** every `<button>` exposes a discernible name to assistive technologies.
- **Actual:** an icon-only button in the form has no text, `aria-label` or `title`; screen readers
  announce it only as "button". The offending selectors are attached to the test as `axe-results.json`.
- **Detected by:** TC-A11Y-002 (login) and TC-A11Y-003 (registration).

## DEF-006 — Registration API does not require date of birth

- **Environment:** self-hosted SUT (`TOOLSHOP_TARGET=local`), `POST /users/register`.
- **Requirement:** the registration form marks `dob` as required and the OpenAPI schema documents it.
- **Steps:** register a customer with every field valid except `dob`, which is omitted.
- **Expected:** HTTP 422 with a validation error for `dob`.
- **Actual:** the empty-payload validation response lists `first_name`, `last_name`, `email` and `password` but never `dob`; the field is not validated server-side.
- **Technique:** client/server validation parity, error guessing.
