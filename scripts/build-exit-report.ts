import { readFile, writeFile } from "node:fs/promises";
import { buildExitReport } from "../src/reporting/exit-report.js";
import { isTraceabilityData, isUnifiedReport } from "../src/reporting/model.js";

const report: unknown = JSON.parse(await readFile("reports/unified-report.json", "utf8"));
const traceability: unknown = JSON.parse(
  await readFile("reports/traceability.json", "utf8"),
);
if (!isUnifiedReport(report)) throw new Error("Invalid unified report.");
if (!isTraceabilityData(traceability)) throw new Error("Invalid traceability report.");

const summary = buildExitReport(report, traceability);
const rate =
  summary.passRatePercent === null ? "not available" : `${summary.passRatePercent}%`;
const severity = Object.entries(summary.defectsBySeverity)
  .map(([name, count]) => `${name}: ${count}`)
  .join(", ");
const markdown = [
  "# Test-cycle summary",
  "",
  "> Evidence for the disposable demo system, not a production release authorization.",
  "",
  `- Executed: **${summary.executed}**; passed: **${summary.totals.passed}**; defect observations: **${summary.totals.detected}**; failed: **${summary.totals.failed}**; flaky: **${summary.totals.flaky}**; skipped: **${summary.totals.skipped}**.`,
  "- Defect observations count test cases, not unique defects; multiple cases or targets can detect the same defect.",
  `- Pass rate: **${rate}** (passed / executed; defect observations and flaky results are not counted as passes).`,
  `- Requirements with designed tests: **${summary.designCoverage.covered}/${summary.designCoverage.total}**.`,
  `- Requirements with at least one executed test: **${summary.executionCoverage.covered}/${summary.executionCoverage.total}**. This does not imply every test passed.`,
  `- Open recorded defects: **${summary.openDefects.length}** (${severity || "none"}).`,
  `- Reports not produced: **${summary.missingReports.length}**.`,
  summary.evidenceUrl ? `- [Run and trace artifacts](${summary.evidenceUrl}).` : "",
  "",
  "## Flaky tests requiring investigation",
  "",
  ...(summary.flakyCases.length
    ? summary.flakyCases.map((testCase) => `- ${testCase.title}`)
    : ["None reported."]),
  "",
].join("\n");

await writeFile("reports/exit-report.json", `${JSON.stringify(summary, null, 2)}\n`);
await writeFile("reports/exit-report.md", markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, { flag: "a" });
}
console.log("Wrote reports/exit-report.json and reports/exit-report.md.");
