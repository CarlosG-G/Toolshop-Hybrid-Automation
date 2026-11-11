# Session notes: registration charter

- **Charter:** [registration](../../../charters/registration.md) (roadmap item RM-02)
- **Date:** 2026-11-11
- **Target:** disposable local SUT (`TOOLSHOP_TARGET=local`): site `http://localhost:4200`,
  API `http://localhost:8091`. Both loopback; no public environment was touched.
- **Browser:** Chromium (Playwright 1.65, headless) and `fetch` requests from Node.js
- **Data:** synthetic identities from `buildRegistration()`, a unique `@example.test` email per
  attempt. Birth dates were computed from the session date in UTC.

## Results

### 1. Valid registration, sign-in and duplicates

| Input                               | Expected | Observed                                  | Result            |
| ----------------------------------- | -------- | ----------------------------------------- | ----------------- |
| Valid customer                      | 201      | 201; sign-in with the new account → 200   | Pass              |
| Same email again                    | 4xx      | 409 "A customer with this email … exists" | Pass              |
| Same email in upper case            | 4xx      | 409                                       | Pass              |
| Same email padded with spaces (API) | 409/422  | 201; the padded account can sign in       | **DEF-009** (new) |
| Same email padded with spaces (UI)  | Rejected | "Email format is invalid", no request     | Pass              |

### 2. Form validation (UI)

| Input                                   | Expected                                      | Observed                                                                         | Result            |
| --------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| Empty submit                            | Every field flagged, no request               | 12 errors with `role="alert"`; no request                                        | Pass              |
| Error association after an empty submit | `aria-invalid` + `aria-describedby` per field | 11 of 12 fields linked; house number has neither attribute and an empty error id | **DEF-011** (new) |
| Password `Ab1!xyz` (7 characters)       | Message states the real rule                  | "Password must be minimal 6 characters long."; no request                        | **DEF-010** (new) |
| Password `Ab1!xyzw` (8 characters)      | 201                                           | 201                                                                              | Pass              |
| Birth date `2000-02-30`                 | Rejected                                      | "Please enter a valid date in YYYY-MM-DD format."; no request                    | Pass              |
| Customer aged 17                        | Rejected                                      | API 422 "Customer must be 18 years old." shown in the form                       | Pass              |
| Birth date `1940-01-01` (aged 86)       | Rejected                                      | 201; account created through the UI                                              | DEF-001 (known)   |
| Email `?@localhost`                     | Accepted or rejected consistently             | 201; valid per RFC 5321, not a defect                                            | Observation       |

### 3. UI versus direct API requests

| Request (one field changed)                    | Expected                    | Observed                                                                | Result                                          |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| Empty body                                     | 422                         | 422, lists `first_name`, `last_name`, `email`, `password` but not `dob` | DEF-006 (known)                                 |
| Email `not-an-email-<uuid>`                    | 422                         | 201                                                                     | DEF-004 (known)                                 |
| `dob` omitted                                  | 422                         | 201                                                                     | DEF-006 (known)                                 |
| `dob` 76 years ago                             | 422                         | 201                                                                     | DEF-001 (known)                                 |
| `dob` `2000-02-30`, `not-a-date`, `15/06/1990` | 422                         | 422                                                                     | Pass                                            |
| `dob` in the future                            | 422                         | 422                                                                     | Pass                                            |
| `first_name` of 256 characters                 | 422                         | 422 "must not be greater than 40 characters"                            | Pass                                            |
| `first_name` of spaces only                    | 422                         | 422 "is required"                                                       | Pass                                            |
| Password `Ab1!` / `Abcdefgh12345`              | 422                         | 422                                                                     | Pass                                            |
| Phone `abcdefg`, country `ZZ`, no address      | Not constrained by the spec | 201                                                                     | Observation: the contract sets only `maxLength` |

### 4. Age boundaries (session date 2026-11-11, UTC)

| Birth date                        | Age rule      | Expected | Observed | Result          |
| --------------------------------- | ------------- | -------- | -------- | --------------- |
| 18 years + 1 day ago (2008-11-10) | Adult         | 201      | 201      | Pass            |
| Exactly 18 years ago (2008-11-11) | 18th birthday | 201      | 422      | DEF-007 (known) |
| 18 years − 1 day ago (2008-11-12) | Minor         | 422      | 422      | Pass            |
| 75 years − 1 day ago (1951-11-12) | Within range  | 201      | 201      | Pass            |
| Exactly 75 years ago (1951-11-11) | 75th birthday | 201      | 201      | Pass            |
| 75 years + 1 day ago (1951-11-10) | Too old       | 422      | 201      | DEF-001 (known) |
| `2004-02-29` (leap day)           | Adult         | 201      | 201      | Pass            |

## New defects

- **DEF-009** ([#29](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/29)): a whitespace-padded email bypasses the duplicate check and creates
  a second account for the same mailbox. Automated as TC-API-070.
- **DEF-010** ([#28](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/28)): the password error says "minimal 6 characters" but the form
  requires 8. Automated as TC-E2E-025.
- **DEF-011** ([#30](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/30)): the house number error is not linked to its input. Automated as
  TC-E2E-026.

## Known defects reproduced

DEF-001, DEF-004, DEF-006 and DEF-007 reproduced with their recorded signatures. DEF-001 also
reproduces through the UI: the form forwards a birth date 86 years ago and the account is created.

## Not covered

- Screen-reader output was inferred from ARIA attributes, not checked with NVDA or VoiceOver.
- Time-zone effects on the boundaries: the SUT and the session both used UTC.

## Cleanup

Evidence contains synthetic identities only; no passwords, tokens or cookies are recorded here.
The disposable Compose environment was removed with `npm run sut:down` after the session.
