import type { ReportCase, TestStatus } from "./model.js";

interface TestResult {
  status?: string;
  duration?: number;
}

interface TestCase {
  title?: string;
  projectName?: string;
  status?: string;
  expectedStatus?: string;
  results?: TestResult[];
}

interface Spec {
  title?: string;
  file?: string;
  tests?: TestCase[];
}

interface Suite {
  title?: string;
  file?: string;
  specs?: Spec[];
  suites?: Suite[];
}

export interface PlaywrightReport {
  stats?: {
    expected?: number;
    skipped?: number;
    unexpected?: number;
    flaky?: number;
  };
  suites?: Suite[];
}

function caseType(project: string, file: string, source: string): string {
  const path = file.replaceAll("\\", "/").toLowerCase();
  if (project === "bdd" || path.includes(".feature")) return "bdd";
  if (project === "visual-sut" || path.includes("visual/")) return "visual";
  if (project === "security" || path.includes("security/")) return "security";
  if (project === "contract" || path.includes("contract/")) return "contract";
  if (project === "api" || path.includes("api/")) return "api";
  if (project === "e2e" || path.includes("e2e/")) return "e2e";
  if (path.includes("vibium/") || path.includes("hybrid/")) return "vibium";
  if (path.includes("nonfunctional/")) {
    if (path.includes("accessibility")) return "accessibility";
    if (path.includes("performance")) return "performance";
    if (path.includes("responsive")) return "responsive";
    if (path.includes("resilience")) return "resilience";
    return "nonfunctional";
  }
  if (path.includes("unit/")) return "unit";
  if (path.includes("mocked/")) return "mocked";
  if (path.includes("hermetic/") || source.includes("hermetic")) return "hermetic";
  return "other";
}

function caseStatus(testCase: TestCase, title: string): TestStatus {
  switch (testCase.status) {
    case "expected":
      if (testCase.expectedStatus === "passed") return "passed";
      if (testCase.expectedStatus === "failed") return "detected";
      throw new Error(
        `Invalid Playwright expectedStatus for ${title}: ${String(testCase.expectedStatus)}`,
      );
    case "unexpected":
      return "failed";
    case "flaky":
      return "flaky";
    case "skipped":
      return "skipped";
    default:
      throw new Error(
        `Invalid Playwright status for ${title}: ${String(testCase.status)}`,
      );
  }
}

export function collectCases(
  suites: Suite[],
  source: string,
  target: string,
  parent = "",
  parentFile = "",
): ReportCase[] {
  return suites.flatMap((suite) => {
    const suitePath = [parent, suite.title].filter(Boolean).join(" / ");
    const suiteFile = suite.file ?? parentFile;
    const current = (suite.specs ?? []).flatMap((spec) =>
      (spec.tests ?? []).map((testCase) => {
        const title = [suitePath, spec.title, testCase.title].filter(Boolean).join(" / ");
        const status = caseStatus(testCase, title);
        const classifiedStatus =
          target === "with-bugs" &&
          status === "passed" &&
          [spec.title, testCase.title].some((entry) => entry?.includes("WB-01"))
            ? "detected"
            : status;
        return {
          title,
          id: spec.title?.match(/\b(?:TC-[A-Z0-9]+-\d+|WB-\d+)\b/)?.[0] ?? null,
          type: caseType(testCase.projectName ?? "", spec.file ?? suiteFile, source),
          status: classifiedStatus,
          durationMs: (testCase.results ?? []).reduce(
            (total, result) => total + (result.duration ?? 0),
            0,
          ),
          source,
          target,
        };
      }),
    );
    return [
      ...current,
      ...collectCases(suite.suites ?? [], source, target, suitePath, suiteFile),
    ];
  });
}
