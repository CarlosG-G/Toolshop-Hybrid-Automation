# Security policy

## Scope

This repository is a test automation portfolio. It contains test code, CI
workflows and a static dashboard; it does not ship a production service.
The system under test is the third-party
[Practice Software Testing Toolshop](https://github.com/testsmith-io/practice-software-testing).
Vulnerabilities in Toolshop itself belong to that project.

In scope:

- Secrets or credentials exposed by this repository, its workflows or artifacts.
- Workflow injection, excessive token permissions or unpinned third-party actions.
- Vulnerable dependencies used by the test framework or report tooling.
- Cross-site scripting or data leaks in the published dashboard.

## Supported versions

Only the latest release and the `main` branch receive fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Use
[private vulnerability reporting](https://github.com/CarlosG-G/Toolshop-Hybrid-Automation/security/advisories/new)
and include the affected file or workflow, reproduction steps and impact.

You can expect an acknowledgement within 5 working days and a triage decision
within 10 working days. Fixes are released through a normal pull request and
credited in the release notes unless you prefer otherwise.

## Existing controls

- Actions pinned by commit SHA, least-privilege `permissions` per job.
- CodeQL `security-extended` for TypeScript and workflows, OpenSSF Scorecard,
  dependency review on pull requests and Dependabot security updates.
- Secret scanning with push protection.
- Release SBOMs with build provenance attestations.
- Write, load and DAST tests only target a disposable loopback SUT.
