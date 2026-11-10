import type {
  Defect,
  ReportCase,
  RequirementDetail,
  TestTotals,
  TraceabilityData,
  UnifiedReport,
} from "./model.js";

export interface RequirementCoverage extends RequirementDetail {
  executedTests: string[];
}

export interface ExitReport {
  generatedAt: string;
  runId: string | null;
  evidenceUrl: string | null;
  totals: TestTotals;
  executed: number;
  passRatePercent: number | null;
  byType: Record<string, TestTotals>;
  requirements: RequirementCoverage[];
  designCoverage: { covered: number; total: number };
  executionCoverage: { covered: number; total: number };
  openDefects: Defect[];
  defectsBySeverity: Record<string, number>;
  flakyCases: ReportCase[];
  missingReports: string[];
}

function emptyTotals(): TestTotals {
  return { passed: 0, detected: 0, failed: 0, flaky: 0, skipped: 0 };
}

export function buildExitReport(
  report: UnifiedReport,
  traceability: TraceabilityData,
): ExitReport {
  const totals = emptyTotals();
  const byType: Record<string, TestTotals> = {};
  const executedIds = new Set<string>();
  for (const testCase of report.cases) {
    totals[testCase.status] += 1;
    byType[testCase.type] ??= emptyTotals();
    byType[testCase.type]![testCase.status] += 1;
    if (testCase.id && testCase.status !== "skipped") executedIds.add(testCase.id);
  }

  const executed = report.cases.length - totals.skipped;
  const requirements = traceability.requirementDetails.map((requirement) => ({
    ...requirement,
    executedTests: requirement.tests.filter((id) => executedIds.has(id)),
  }));
  const openDefects = traceability.defectDetails.filter((defect) =>
    /^open\b/i.test(defect.status),
  );
  const defectsBySeverity: Record<string, number> = {};
  for (const defect of openDefects) {
    defectsBySeverity[defect.severity] = (defectsBySeverity[defect.severity] ?? 0) + 1;
  }

  return {
    generatedAt: report.generatedAt,
    runId: report.runId,
    evidenceUrl: report.evidenceUrl,
    totals,
    executed,
    passRatePercent:
      executed === 0 ? null : Math.round((totals.passed / executed) * 10_000) / 100,
    byType,
    requirements,
    designCoverage: {
      covered: requirements.filter((requirement) => requirement.tests.length > 0).length,
      total: requirements.length,
    },
    executionCoverage: {
      covered: requirements.filter((requirement) => requirement.executedTests.length > 0)
        .length,
      total: requirements.length,
    },
    openDefects,
    defectsBySeverity,
    flakyCases: report.cases.filter((testCase) => testCase.status === "flaky"),
    missingReports: report.missingReports,
  };
}
