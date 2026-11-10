# Changelog

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
