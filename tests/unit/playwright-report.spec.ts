import { expect, test } from "@playwright/test";
import { isUnifiedReport } from "../../src/reporting/model.js";
import { collectCases } from "../../src/reporting/playwright.js";

test("classifies real Playwright outcomes and sums retry durations", () => {
  const cases = collectCases(
    [
      {
        title: "API suite",
        file: "tests/api/robustness.spec.ts",
        specs: [
          {
            title: "TC-API-067 defect and retry examples",
            tests: [
              {
                projectName: "api",
                status: "expected",
                expectedStatus: "passed",
                results: [{ status: "passed", duration: 10 }],
              },
              {
                projectName: "api",
                status: "expected",
                expectedStatus: "failed",
                results: [{ status: "failed", duration: 20 }],
              },
              {
                projectName: "api",
                status: "unexpected",
                expectedStatus: "failed",
                results: [{ status: "passed", duration: 30 }],
              },
              {
                projectName: "api",
                status: "flaky",
                expectedStatus: "passed",
                results: [
                  { status: "failed", duration: 40 },
                  { status: "passed", duration: 50 },
                ],
              },
              {
                projectName: "api",
                status: "skipped",
                expectedStatus: "skipped",
                results: [],
              },
            ],
          },
        ],
      },
    ],
    "reports/sut-api.json",
    "local",
  );

  expect(cases.map((entry) => entry.status)).toEqual([
    "passed",
    "detected",
    "failed",
    "flaky",
    "skipped",
  ]);
  expect(cases.map((entry) => entry.durationMs)).toEqual([10, 20, 30, 90, 0]);
  expect(cases[3]).toMatchObject({ project: "api", status: "flaky" });
  expect(cases.every((entry) => entry.id === "TC-API-067" && entry.type === "api")).toBe(
    true,
  );
});

test("rejects malformed or unknown Playwright outcomes", () => {
  const suite = [
    { title: "suite", specs: [{ title: "case", tests: [{ status: "unknown" }] }] },
  ];
  expect(() => collectCases(suite, "report.json", "local")).toThrow(
    "Invalid Playwright status",
  );
  expect(() =>
    collectCases(
      [{ title: "suite", specs: [{ title: "case", tests: [{ status: "expected" }] }] }],
      "report.json",
      "local",
    ),
  ).toThrow("Invalid Playwright expectedStatus");
});

test("validates browser projects while accepting older reports without them", () => {
  const testCase = {
    title: "TC-E2E-035",
    id: "TC-E2E-035",
    type: "e2e",
    status: "flaky",
    durationMs: 42,
    source: "reports/sut-ui-2.json",
    target: "local",
  };
  const report = {
    generatedAt: "2026-01-01",
    runId: null,
    commit: null,
    evidenceUrl: null,
    target: "local",
    infrastructure: "sut=success",
    totals: { passed: 0, detected: 0, failed: 0, flaky: 1, skipped: 0 },
    missingReports: [],
  };

  expect(
    isUnifiedReport({ ...report, cases: [{ ...testCase, project: "webkit" }] }),
  ).toBe(true);
  expect(isUnifiedReport({ ...report, cases: [testCase] })).toBe(true);
  expect(isUnifiedReport({ ...report, cases: [{ ...testCase, project: 42 }] })).toBe(
    false,
  );
});
