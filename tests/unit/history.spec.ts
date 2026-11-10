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

test("history parsing accepts nullable fields and copies only known keys", () => {
  const nullable = { ...previous, runId: null, passRatePercent: null, evidenceUrl: null };
  expect(parseHistory({ runs: [nullable] })).toEqual([nullable]);
  const withUrl = { ...previous, evidenceUrl: "https://example.test/run/1", extra: true };
  expect(parseHistory({ runs: [withUrl] })).toEqual([
    { ...previous, evidenceUrl: "https://example.test/run/1" },
  ]);
});

test("history parsing rejects each malformed field", () => {
  const invalid: Record<string, unknown>[] = [
    { runId: 1 },
    { generatedAt: null },
    { target: 1 },
    { totals: { passed: 1 } },
    { passRatePercent: "100" },
    { executionCoverage: null },
    { executionCoverage: { covered: "1", total: 1 } },
    { executionCoverage: { covered: 1, total: "1" } },
    { evidenceUrl: 1 },
  ];
  for (const override of invalid) {
    expect(
      () => parseHistory({ runs: [{ ...previous, ...override }] }),
      JSON.stringify(override),
    ).toThrow("History report: invalid run.");
  }
  expect(() => parseHistory({ runs: [null] })).toThrow("invalid run");
  expect(() => parseHistory({ runs: "nope" })).toThrow("missing runs");
});

test("history without a run ID replaces only the entry with the same timestamp", () => {
  const local = { ...report, runId: null };
  const sameTime = { ...previous, runId: null, generatedAt: local.generatedAt };
  const otherTime = { ...previous, runId: null, generatedAt: "2025-12-31" };
  const identified = { ...previous, runId: "9", generatedAt: local.generatedAt };
  const result = updateHistory([sameTime, otherTime, identified], local, exit, 10);
  expect(result.map((entry) => [entry.runId, entry.generatedAt])).toEqual([
    [null, local.generatedAt],
    [null, "2025-12-31"],
    ["9", local.generatedAt],
  ]);
  expect(result[0]).toMatchObject({
    target: "local",
    totals: exit.totals,
    passRatePercent: exit.passRatePercent,
    executionCoverage: exit.executionCoverage,
    evidenceUrl: null,
  });
});
