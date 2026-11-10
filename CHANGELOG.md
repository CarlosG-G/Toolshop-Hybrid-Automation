# Changelog

## Unreleased

### Added

- `npm run social-preview` renders the 1280x640 GitHub social preview card to `docs/assets/social-preview.png`.
- Registration exploratory charter and an improvement roadmap (`docs/roadmap.md`).
- TC-API-068 and TC-API-069 cover the exact 18th and 75th birthdays (roadmap item RM-01).
- DEF-007 ([#19](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/issues/19)): the
  registration API rejects customers on their 18th birthday; TC-API-068 freezes the signature.
- README "Defects found by the suite" table linking each DEF ID to its issue, test and frozen
  signature (roadmap item RM-03).

## 1.1.0

### Added

- StrykerJS mutation testing with a weekly workflow, job-summary score and HTML
  report artifact; baseline mutation score 70.14 %.

- MIT license, security policy, contributing guide, code of conduct and ISTQB
  defect-report and test-improvement issue forms.
- Build provenance attestation for release SBOMs.
- Dashboard previews and a reviewer quick tour in the README.
- ISO/IEC/IEEE 29119-3 level test plan and v1.0 test completion report.
- GitHub issues for the six recorded defects, linked from the defect log.

### Changed

- Branch protection on `main`: pull requests, linear history and required checks.
- `src/config/env.ts` exposes a pure `resolveToolshopConfig()` covered by new unit tests.

## 1.0.0

### Added

- Risk-based test strategy, requirements, generated traceability and defect log.
- Playwright BDD registration, checkout and invalid-payment scenarios.
- Independent Vibium journeys and a Linux SUT visual baseline.
- Nightly k6 load testing, OWASP ZAP baseline scanning and Lighthouse budgets.
- Test-cycle exit reports, quality metrics, history and a public dashboard.
- Dependabot, CodeQL, production dependency auditing and a CycloneDX SBOM.
- Pull request hygiene, dependency review, workflow lint, OpenSSF Scorecard
  and tag-driven release workflows; CodeQL also scans the workflows.
- Recruiter-facing documentation, architecture diagram and hermetic demo.

### Changed

- Run isolated SUT suites in parallel, with unique API data and E2E sharding.
- Separate optional public diagnostics from required hermetic and SUT gates.
- Restrict write, load and audit targets to loopback disposable environments.
- Report known-defect and flaky outcomes separately from clean passes.
- Evaluate Lighthouse performance using five sequential samples and the median,
  retaining all samples and applying the lowest accessibility and best-practice scores.
- Require Node.js 22.19 or later.

### Fixed

- Override the vulnerable transitive `minimatch` used by the ESLint peer.
- Wait for overlapping billing-address lookups and validate their responses
  before advancing to payment.
- Include both SUT browser matrices and project names in the nightly comparison,
  including retries and missing reports.
- Isolate nested Playwright artifacts from the parent test run.
