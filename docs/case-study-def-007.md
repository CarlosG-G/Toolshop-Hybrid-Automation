# Case study: the customer who turns 18 today

## The risk

The registration requirement allows customers aged 18 through 75. A date
boundary is easy to get wrong: checking only an under-age customer and an adult
does not prove that the exact birthday is accepted.

## What the test found

Test **TC-API-068** submits a registration whose date of birth is exactly 18
years before the current UTC date. The requirement says this customer is
eligible and the expected response is HTTP `201`; the observed response was
HTTP `422` with `{"dob":["Customer must be 18 years old."]}`. The adjacent
one-day-older case (**TC-API-023**) is accepted.

Static analysis of the provider's validation rule identified a strict
`before:` comparison at the 18-year boundary. That comparison excludes the
boundary date itself. Changing a date rule also needs care at the other end of
the range, so **TC-API-069** guards the exact 75th-birthday boundary.

## How the evidence connects

1. **Requirement:** `REQ-REG-01` and the OpenAPI `UserRequest.dob` age range.
2. **Technique:** boundary value analysis at the exact age limits.
3. **Automation:** [TC-API-068 and TC-API-069 in the API suite](../tests/api/auth.spec.ts).
4. **Finding:** [DEF-007 in the defect log](test-management/defect-log.md), tracked as [GitHub issue #19](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19).
5. **Execution evidence:** [CI run 42847127751](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/actions/runs/42847127751), job `SUT / api`.

The test runs against the project's self-hosted disposable SUT. Registration
creates data, so this check does not write to the public demo site.

## Why it matters

The value is more than detecting one validation bug. The test makes the
business boundary explicit, preserves evidence of the observed behavior and
protects the opposite boundary from a careless fix. In the dashboard, a
known-defect observation is reported separately from an unexpected regression;
it is never silently counted as a passing test.

This case documents the behavior and evidence at the time it was observed. It
does not claim that the third-party application has since been fixed.
