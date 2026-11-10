import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ReportCase, TestStatus, UnifiedReport } from "../src/reporting/model.js";

interface TestResult {
  status?: string;
  duration?: number;
}

interface TestCase {
  title?: string;
  projectName?: string;
  outcome?: string;
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

interface PlaywrightReport {
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

function collectCases(
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
        const lastResult = testCase.results?.at(-1);
        const status: TestStatus =
          testCase.outcome === "expected"
            ? testCase.expectedStatus === "failed"
              ? "detected"
              : "passed"
            : testCase.outcome === "unexpected"
              ? "failed"
              : testCase.outcome === "flaky"
                ? "flaky"
                : testCase.outcome === "skipped" || lastResult?.status === "skipped"
                  ? "skipped"
                  : lastResult?.status === "passed"
                    ? "passed"
                    : "failed";
        const classifiedStatus =
          target === "with-bugs" &&
          status === "passed" &&
          [spec.title, testCase.title].some((title) => title?.includes("WB-01"))
            ? "detected"
            : status;
        return {
          title: [suitePath, spec.title, testCase.title].filter(Boolean).join(" / "),
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

const sourceEntries = (process.env.TOOLSHOP_REPORT_FILES ?? "reports/playwright.json")
  .split(";")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [label, ...pathParts] = entry.split("=");
    return pathParts.length === 0
      ? { target: process.env.TOOLSHOP_TARGET ?? "stable", path: label }
      : { target: label, path: pathParts.join("=") };
  });
const reportCases: ReportCase[] = [];
const missingReports: string[] = [];

for (const { path, target } of sourceEntries) {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      missingReports.push(path);
      continue;
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(contents);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("stats" in parsed) ||
    !("suites" in parsed) ||
    !Array.isArray(parsed.suites)
  ) {
    throw new Error(`Playwright JSON report has an unexpected shape: ${path}`);
  }

  const report = parsed as PlaywrightReport;
  reportCases.push(...collectCases(report.suites ?? [], path, target));
}

if (reportCases.length === 0 && missingReports.length === sourceEntries.length) {
  const expected = sourceEntries.map((entry) => entry.path).join(", ");
  throw new Error(`No Playwright report was produced. Expected: ${expected}`);
}

const targets = [...new Set(reportCases.map((testCase) => testCase.target))];
const report: UnifiedReport = {
  generatedAt: new Date().toISOString(),
  runId: process.env.GITHUB_RUN_ID ?? null,
  commit: process.env.GITHUB_SHA ?? null,
  evidenceUrl:
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  target: targets.join(" vs ") || process.env.TOOLSHOP_TARGET || "unknown",
  infrastructure: process.env.TOOLSHOP_INFRA_STATUS ?? "not-checked",
  totals: {
    passed: reportCases.filter((testCase) => testCase.status === "passed").length,
    failed: reportCases.filter((testCase) => testCase.status === "failed").length,
    flaky: reportCases.filter((testCase) => testCase.status === "flaky").length,
    skipped: reportCases.filter((testCase) => testCase.status === "skipped").length,
    detected: reportCases.filter((testCase) => testCase.status === "detected").length,
  },
  missingReports,
  cases: reportCases,
};

await mkdir("reports", { recursive: true });
await writeFile("reports/unified-report.json", `${JSON.stringify(report, null, 2)}\n`);
const caseTable =
  report.cases.length === 0
    ? "No individual test cases were reported."
    : [
        "| Target | Test | Status | Duration | Run |",
        "| --- | --- | --- | ---: | --- |",
        ...report.cases.map(
          (testCase) =>
            `| ${testCase.target} | ${testCase.title.replaceAll("|", "\\|")} | ${testCase.status} | ${testCase.durationMs} ms | ${testCase.source} |`,
        ),
      ].join("\n");
const missing =
  report.missingReports.length === 0
    ? ""
    : `\nReports not produced: ${report.missingReports.join(", ")}\n`;
const markdown = [
  "# Toolshop automation report",
  "",
  `- Target: **${report.target}**`,
  `- External infrastructure: **${report.infrastructure}**`,
  `- Generated: ${report.generatedAt}`,
  `- Passed: **${report.totals.passed}** · Detected: **${report.totals.detected}** · Failed: **${report.totals.failed}** · Flaky: **${report.totals.flaky}** · Skipped: **${report.totals.skipped}**`,
  missing,
  caseTable,
  "",
].join("\n");
await writeFile("reports/unified-report.md", markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, { flag: "a" });
}

console.log("Wrote reports/unified-report.json and reports/unified-report.md.");
