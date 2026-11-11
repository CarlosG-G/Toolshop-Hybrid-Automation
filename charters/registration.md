# Registration exploration charter

## Mission

Explore registration and its validation across the browser and API. Spend
approximately 45–60 minutes looking for inconsistencies, confusing feedback and
unexpected account creation.

## Safety and preparation

- Use only a dedicated, disposable local SUT. This charter creates accounts,
  including when an invalid request is accepted. Never run it against the
  public `stable` or `with-bugs` environments or a shared database.
- `npm run sut:up` resets and seeds the SUT database, even if it is already
  running. Start it only after confirming that the Compose environment and its
  data are disposable and not shared.
- Open `http://localhost:4200/auth/register`. Confirm that both the site and
  the API use loopback addresses; the default API is
  `http://localhost:8091`. Check the browser's Network panel and any URL
  overrides before submitting. Stop if either target is not local.
- Use synthetic data and a unique email such as
  `registration-<uuid>@example.test` for each independent attempt. The
  [registration factory](../src/data/factories.ts) supplies a valid baseline.
  Reuse an email only when deliberately exploring duplicate registration.

## Explore

1. Register a valid user and sign in with that new account. Check the visible
   confirmation and any unexpected errors. Try the same email again: the
   account should not be duplicated and the API should return a 4xx response.
2. Submit an empty form, then vary one field at a time: malformed email, missing
   date of birth and invalid dates. Check that errors identify the affected
   field, are readable and can be reached with the keyboard. Note whether the
   form prevents submission or the server returns the validation error.
3. Compare UI validation with direct requests to the local `POST /users/register`
   API. Use a successful local registration request as a template and send
   edited requests from browser DevTools or a local-only API client. Confirm
   the destination before each request. Change only one field per request:
   use an email such as `not-an-email-<uuid>`, omit `dob`, or use a birth date
   76 years ago. Each should return HTTP 422; an HTTP 201 creates an account
   and is a known defect. Use a fresh synthetic identity for every request so
   duplicate-email validation does not mask the result.
4. Explore birth dates immediately before, at and after the documented
   18- and 75-year boundaries. Compare the UI and API outcomes with the
   documented rule. Calculate dates for the day of the session rather than
   using fixed dates; consider leap years and the tester's time zone.

The [defect log](../docs/test-management/defect-log.md) tracks the known
registration findings as DEF-001, DEF-004, DEF-006, DEF-007 and DEF-009 to
DEF-011. The [first session](../docs/test-management/sessions/2026-11-11-registration.md)
records the inputs already explored. Compare the
observed failure with the recorded signature before reporting a new defect.

## Automated comparison

On the same disposable SUT, run the existing registration API cases:

```bash
npm run test:local -- tests/api/auth.spec.ts tests/api/robustness.spec.ts --grep "TC-API-02[0-5]|TC-API-06[2789]"
```

These are regression checks, not a substitute for exploration. TC-API-068 and
TC-API-069 cover the exact 18th and 75th birthdays; TC-API-068 detects DEF-007.
Known defects are recorded as expected failures; that result does not mean
they are fixed.

## Evidence and cleanup

- Record the session date, target, browser, input variation, expected and
  observed result, response status and relevant defect or test ID. Capture
  screenshots or browser evidence for unexpected behavior.
- Remove passwords, tokens, cookies and identifying data from evidence before
  sharing it. Traces and network captures may contain credentials.
- If you own the disposable Compose environment and have confirmed its data
  can be removed, `npm run sut:down` removes its containers and volumes.
  Do not run it against a shared environment.
