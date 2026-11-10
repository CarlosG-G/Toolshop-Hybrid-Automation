import { expect, test } from "@playwright/test";
import { buildExitReport } from "../../src/reporting/exit-report.js";
import type {
  ReportCase,
  TraceabilityData,
  UnifiedReport,
} from "../../src/reporting/model.js";

const traceability: TraceabilityData = {
  requirementDetails: [
    {
      id: "REQ-1",
      title: "First",
      risk: "High",
      tests: ["TC-API-001"],
      defects: ["DEF-001"],
    },
    { id: "REQ-2", title: "Second", risk: "Low", tests: ["TC-E2E-001"], defects: [] },
  ],
  defectDetails: [
    {
      id: "DEF-001",
      title: "Known problem",
      severity: "Major",
      priority: "High",
      tests: ["TC-API-001"],
      status: "Open",
    },
  ],
};

function report(cases: ReportCase[]): UnifiedReport {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    runId: "123",
    commit: "abc",
    evidenceUrl: null,
    target: "local",
    infrastructure: "sut=success",
    totals: { passed: 0, detected: 0, failed: 0, flaky: 0, skipped: 0 },
    missingReports: [],
    cases,
  };
}

function testCase(id: string, type: string, status: ReportCase["status"]): ReportCase {
  return {
    id,
    type,
    status,
    title: id,
    durationMs: 1,
    source: "report.json",
    target: "local",
  };
}

test("exit metrics distinguish designed, executed, flaky and detected cases", () => {
  const result = buildExitReport(
    report([
      testCase("TC-API-001", "api", "passed"),
      testCase("TC-API-002", "api", "flaky"),
      testCase("TC-API-003", "api", "detected"),
      testCase("TC-E2E-001", "e2e", "skipped"),
    ]),
    traceability,
  );
  expect(result.executed).toBe(3);
  expect(result.passRatePercent).toBe(33.33);
  expect(result.designCoverage).toEqual({ covered: 2, total: 2 });
  expect(result.executionCoverage).toEqual({ covered: 1, total: 2 });
  expect(result.defectsBySeverity).toEqual({ Major: 1 });
  expect(result.flakyCases.map((item) => item.id)).toEqual(["TC-API-002"]);
  expect(result.byType.api).toMatchObject({ passed: 1, flaky: 1, detected: 1 });
});

test("an empty run has no pass-rate rather than a misleading 100 percent", () => {
  const result = buildExitReport(report([]), traceability);
  expect(result.passRatePercent).toBeNull();
  expect(result.executionCoverage.covered).toBe(0);
});
