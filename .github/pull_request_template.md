## What and why

## Test impact (ISTQB checklist)

- [ ] New or changed behaviour has test cases with a `TC-*` identifier
- [ ] Negative and boundary partitions considered (equivalence partitioning / BVA)
- [ ] `npm run traceability` passes (every test linked to a requirement)
- [ ] `npm run lint`, `npm run typecheck` and `npm run format:check` pass
- [ ] Defects found are recorded in `docs/test-management/defect-log.md` and encoded with `test.fail()`
- [ ] No writes against public environments
