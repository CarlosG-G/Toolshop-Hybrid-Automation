# Defect log

Defects found by the automated suites against the self-hosted Toolshop (sprint 5).
Severity and priority follow the ISTQB glossary; each defect is linked to the test case that detects it
and tracked as a GitHub issue labelled `defect`.
Known SUT defects use `test.fail()` only after checking the observed response or
violation. A changed signature or unrelated earlier error fails normally and
requires triage. DEF-003 is a separate, informational public-environment finding.

| ID      | Issue                                                                    | Title                                                 | Severity | Priority | Detected by | Status                 |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------- | -------- | -------- | ----------- | ---------------------- |
| DEF-001 | [#10](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/10) | Registration accepts customers older than 75 years    | Major    | Medium   | TC-API-025  | Open                   |
| DEF-002 | [#11](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/11) | Payment check accepts undocumented payment methods    | Minor    | Low      | TC-API-042  | Open                   |
| DEF-003 | [#12](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/12) | Public stable API returns 500 for an unknown product  | Minor    | Low      | TC-API-003  | Open (public env only) |
| DEF-004 | [#13](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/13) | Registration API accepts a malformed email            | Major    | High     | TC-API-062  | Open                   |
| DEF-005 | [#14](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/14) | Icon-only buttons without an accessible name          | Major    | Medium   | TC-A11Y-002 | Open                   |
| DEF-006 | [#15](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/15) | Registration API does not require date of birth       | Minor    | Medium   | TC-API-067  | Open                   |
| DEF-007 | [#19](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19) | Registration rejects customers on their 18th birthday | Minor    | Low      | TC-API-068  | Open                   |
| DEF-008 | [#26](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/26) | POST /invoices drifts from the provider contract      | Minor    | Low      | TC-CON-013  | Open                   |

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

## DEF-007 — Registration rejects customers on their 18th birthday

- **Environment:** self-hosted SUT (`TOOLSHOP_TARGET=local`), `POST /users/register`.
- **Requirement:** OpenAPI `UserRequest.dob` — "Must be a valid date between 18 and 75 years ago";
  REQ-REG-01 accepts ages 18 to 75.
- **Steps:** register a customer whose date of birth is exactly 18 years before the current UTC date.
- **Expected:** HTTP 201; a customer who turns 18 today is eligible.
- **Actual:** HTTP 422 with `{"dob":["Customer must be 18 years old."]}`. A date of birth one day
  earlier (TC-API-023) is accepted.
- **Root cause (static analysis of the provider source):** `StoreCustomer::rules()` validates `dob`
  with Laravel's strict `before:` rule against the date 18 years ago, which excludes the 18th
  birthday itself; `before_or_equal:` would include it. The upper bound uses the strict `after:`
  rule, so a DEF-001 fix that keeps it would reject the exact 75th birthday; TC-API-069 guards
  that boundary.
- **Evidence:** [CI run 42847127751](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/actions/runs/42847127751),
  job `SUT / api`, Playwright trace of TC-API-068.
- **Technique:** boundary value analysis (exact 18- and 75-year boundaries, roadmap item RM-01).

## DEF-008 ? POST /invoices drifts from the provider contract

- **Environment:** self-hosted SUT (`TOOLSHOP_TARGET=local`), Toolshop OpenAPI 3.2.0 served by the provider.
- **Requirement:** REQ-API-01 ? the REST API conforms to its OpenAPI contract.
- **Steps:** register and log in a customer, create a cart with one product, then `POST /invoices`
  with a valid billing address and `cash-on-delivery` payment.
- **Expected:** a status code the operation documents (200, 401, 404, 405 or 422) and a body valid
  against the invoice schema.
- **Actual:** HTTP 201, which the operation does not document, and
  `additional_discount_percentage: null` where the schema declares `number`.
- **Impact:** clients generated from the specification may treat a successful checkout as an
  unexpected response or fail to deserialize the invoice.
- **Evidence:** TC-CON-013 in `tests/contract/provider-contract.spec.ts`, frozen with `markKnownDefect`.
- **Technique:** contract testing of every endpoint the UI flows call (RM-10).
