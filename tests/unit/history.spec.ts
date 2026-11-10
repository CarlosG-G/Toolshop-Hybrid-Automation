import { expect, test } from "@playwright/test";
import { buildExitReport } from "../../src/reporting/exit-report.js";
import {
  parseHistory,
  updateHistory,
  type HistoryEntry,
} from "../../src/reporting/history.js";
import type { UnifiedReport } from "../../src/reporting/model.js";

const totals = { passed: 1, detected: 0, failed: 0, flaky: 0, skipped: 0 };
const previous: HistoryEntry = {
  runId: "1",
  generatedAt: "2026-01-01",
  target: "local",
  totals,
  passRatePercent: 100,
  executionCoverage: { covered: 1, total: 1 },
  evidenceUrl: null,
};
const report: UnifiedReport = {
  runId: "2",
  generatedAt: "2026-01-02",
  target: "local",
  totals,
  commit: null,
  evidenceUrl: null,
  infrastructure: "sut=success",
  missingReports: [],
  cases: [],
};
const exit = buildExitReport(report, { requirementDetails: [], defectDetails: [] });

test("history keeps bounded runs and replaces a repeated run ID", () => {
  const first = updateHistory([previous], report, exit, 2);
  expect(first.map((entry) => entry.runId)).toEqual(["2", "1"]);
  expect(updateHistory(first, report, exit, 2).map((entry) => entry.runId)).toEqual([
    "2",
    "1",
  ]);
  expect(updateHistory(first, report, exit, 1)).toHaveLength(1);
  expect(() => updateHistory([], report, exit, 0)).toThrow("Invalid history limit");
});

test("history parsing rejects malformed runs instead of hiding them", () => {
  expect(parseHistory({ runs: [previous] })).toEqual([previous]);
  expect(() => parseHistory({ runs: [{ runId: 1 }] })).toThrow("invalid run");
  expect(() => parseHistory({})).toThrow("missing runs");
});
