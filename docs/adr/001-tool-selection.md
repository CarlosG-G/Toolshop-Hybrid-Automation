# ADR 001: Playwright and Vibium responsibilities

## Status
Accepted.

## Context
The project needs reliable UI regression coverage and a second browser automation
approach that can inspect a page semantically. The target is a shared public demo
store, so automated runs must not create persistent customer or order data.

## Decision
- Playwright owns the deterministic regression suite, API setup/contract checks,
  network interception, accessibility audits, browser projects, traces, and CI gate.
- Vibium's JavaScript client owns a small semantic smoke using role/text/label
  locators over WebDriver BiDi.
- The hybrid example passes the product detail URL discovered by Playwright to a
  separate Vibium browser session, which checks the product heading semantically.
- Vibium MCP may expose browser controls to a separately configured AI client;
  CI does not invoke an LLM. The current CLI's `check` command operates on
  checkboxes, not natural-language assertions, and does not provide a `run`
  command. No generated code is executed.
- Live checks are read-only by default. Hermetic tests remain the always-on gate.

## Consequences
The project can still validate its core behavior if the public target is down.
Live failures are only meaningful after the health check succeeds. The test
report separates live infrastructure availability from test outcomes.
