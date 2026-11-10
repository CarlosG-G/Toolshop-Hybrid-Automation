# Changelog

## 1.0.0

### Added

- Risk-based test strategy, requirements, generated traceability and defect log.
- Playwright BDD registration, checkout and invalid-payment scenarios.
- Independent Vibium journeys and a Linux SUT visual baseline.
- Nightly k6 load testing, OWASP ZAP baseline scanning and Lighthouse budgets.
- Test-cycle exit reports, quality metrics, history and a public dashboard.
- Dependabot, CodeQL, production dependency auditing and a CycloneDX SBOM.
- Recruiter-facing documentation, architecture diagram and hermetic demo.

### Changed

- Run isolated SUT suites in parallel, with unique API data and E2E sharding.
- Separate optional public diagnostics from required hermetic and SUT gates.
- Restrict write, load and audit targets to loopback disposable environments.
- Report known-defect and flaky outcomes separately from clean passes.
- Require Node.js 22.19 or later.

### Fixed

- Wait for asynchronous billing-address lookup before advancing to payment.
- Isolate nested Playwright artifacts from the parent test run.
