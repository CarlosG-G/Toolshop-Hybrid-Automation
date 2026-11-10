import type { ExitReport } from "./exit-report.js";
import { isRecord } from "./guards.js";
import { isTestTotals, type TestTotals, type UnifiedReport } from "./model.js";

export interface HistoryEntry {
  runId: string | null;
  generatedAt: string;
  target: string;
  totals: TestTotals;
  passRatePercent: number | null;
  executionCoverage: { covered: number; total: number };
  evidenceUrl: string | null;
}

export function parseHistory(value: unknown): HistoryEntry[] {
  if (!isRecord(value) || !Array.isArray(value.runs)) {
    throw new Error("History report: missing runs.");
  }
  return value.runs.map((run: unknown) => {
    if (
      !isRecord(run) ||
      !(run.runId === null || typeof run.runId === "string") ||
      typeof run.generatedAt !== "string" ||
      typeof run.target !== "string" ||
      !isTestTotals(run.totals) ||
      !(run.passRatePercent === null || typeof run.passRatePercent === "number") ||
      !isRecord(run.executionCoverage) ||
      typeof run.executionCoverage.covered !== "number" ||
      typeof run.executionCoverage.total !== "number" ||
      !(run.evidenceUrl === null || typeof run.evidenceUrl === "string")
    ) {
      throw new Error("History report: invalid run.");
    }
    return {
      runId: run.runId,
      generatedAt: run.generatedAt,
      target: run.target,
      totals: run.totals,
      passRatePercent: run.passRatePercent,
      executionCoverage: {
        covered: run.executionCoverage.covered,
        total: run.executionCoverage.total,
      },
      evidenceUrl: run.evidenceUrl,
    };
  });
}

export function updateHistory(
  previous: HistoryEntry[],
  report: UnifiedReport,
  exit: ExitReport,
  limit = 10,
): HistoryEntry[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid history limit.");
  const current: HistoryEntry = {
    runId: report.runId,
    generatedAt: report.generatedAt,
    target: report.target,
    totals: exit.totals,
    passRatePercent: exit.passRatePercent,
    executionCoverage: exit.executionCoverage,
    evidenceUrl: report.evidenceUrl,
  };
  const sameRun = (entry: HistoryEntry): boolean =>
    current.runId !== null
      ? entry.runId === current.runId
      : entry.runId === null && entry.generatedAt === current.generatedAt;
  return [current, ...previous.filter((entry) => !sameRun(entry))].slice(0, limit);
}
