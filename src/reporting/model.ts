export type TestStatus = "passed" | "detected" | "failed" | "flaky" | "skipped";

export interface TestTotals {
  passed: number;
  detected: number;
  failed: number;
  flaky: number;
  skipped: number;
}

export interface ReportCase {
  title: string;
  id: string | null;
  type: string;
  project?: string;
  status: TestStatus;
  durationMs: number;
  source: string;
  target: string;
}

export interface UnifiedReport {
  generatedAt: string;
  runId: string | null;
  commit: string | null;
  evidenceUrl: string | null;
  target: string;
  infrastructure: string;
  totals: TestTotals;
  missingReports: string[];
  cases: ReportCase[];
}

export interface Defect {
  id: string;
  title: string;
  severity: string;
  priority: string;
  tests: string[];
  status: string;
}

export interface RequirementDetail {
  id: string;
  title: string;
  risk: string;
  tests: string[];
  defects: string[];
}

export interface TraceabilityData {
  requirementDetails: RequirementDetail[];
  defectDetails: Defect[];
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

export function isTestTotals(value: unknown): value is TestTotals {
  const statuses = ["passed", "detected", "failed", "flaky", "skipped"];
  return (
    isRecord(value) &&
    statuses.every(
      (status) =>
        typeof value[status] === "number" &&
        Number.isInteger(value[status]) &&
        value[status] >= 0,
    )
  );
}

export function isUnifiedReport(value: unknown): value is UnifiedReport {
  if (!isRecord(value) || !isTestTotals(value.totals) || !Array.isArray(value.cases)) {
    return false;
  }
  const statuses = ["passed", "detected", "failed", "flaky", "skipped"];
  return (
    typeof value.generatedAt === "string" &&
    isNullableString(value.runId) &&
    isNullableString(value.commit) &&
    isNullableString(value.evidenceUrl) &&
    typeof value.target === "string" &&
    typeof value.infrastructure === "string" &&
    isStringList(value.missingReports) &&
    value.cases.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.title === "string" &&
        isNullableString(item.id) &&
        typeof item.type === "string" &&
        (item.project === undefined || typeof item.project === "string") &&
        typeof item.status === "string" &&
        statuses.includes(item.status) &&
        typeof item.durationMs === "number" &&
        typeof item.source === "string" &&
        typeof item.target === "string",
    )
  );
}

export function isTraceabilityData(value: unknown): value is TraceabilityData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.requirementDetails) ||
    !Array.isArray(value.defectDetails)
  ) {
    return false;
  }
  return (
    value.requirementDetails.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.risk === "string" &&
        isStringList(item.tests) &&
        isStringList(item.defects),
    ) &&
    value.defectDetails.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.severity === "string" &&
        typeof item.priority === "string" &&
        isStringList(item.tests) &&
        typeof item.status === "string",
    )
  );
}
import { isRecord } from "./guards.js";
