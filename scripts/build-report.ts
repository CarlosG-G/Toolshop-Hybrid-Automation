import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ReportCase, UnifiedReport } from "../src/reporting/model.js";
import { collectCases, type PlaywrightReport } from "../src/reporting/playwright.js";

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
