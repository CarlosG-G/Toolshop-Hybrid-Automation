# Contributing

Thanks for helping improve this test automation portfolio. The workflow below
mirrors how the suite is maintained and how a test change is reviewed.

## Set up

```bash
npm ci
npx playwright install chromium
npm run test:hermetic          # no network, no Docker
```

Requires Node.js 22.19 or later. Docker is only needed for the disposable SUT
(`npm run sut:up`). See the [README](README.md) for every suite.

## Branches and commits

- Branch from `main`: `feat/…`, `fix/…`, `test/…`, `docs/…`, `ci/…`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  and are checked by commitlint locally (Husky) and in CI.
- `main` is protected: changes land through a pull request with green checks.

## Adding or changing a test

1. Link it to a requirement in
   [requirements.json](docs/test-management/requirements.json) and give it a
   `TC-*` identifier in the test title.
2. Name the design technique (equivalence partitioning, boundary value
   analysis, decision table, state transition, error guessing…) in the test or
   the pull request.
3. Cover negative and boundary partitions, not only the happy path.
4. Keep tests independent: create data through the API fixtures, never rely on
   execution order, and never write to public environments.
5. Use web-first assertions and role-based locators; no fixed waits.
6. Run `npm run traceability` and commit the regenerated matrix.

## Reporting a defect

Open a **Defect report** issue. Include severity, priority, environment, steps,
expected and actual results and the test that detects it. A confirmed defect is
added to the [defect log](docs/test-management/defect-log.md) and encoded with
`test.fail()` only after the observed failure signature is asserted.

## Before opening a pull request

```bash
npm run typecheck && npm run lint && npm run format:check
npm run test:hermetic
```

Fill in the pull request checklist. Reviewers check test intent, traceability,
determinism and evidence, not only that the pipeline is green.

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
