import { readFile, writeFile } from "node:fs/promises";
import { lighthouseBudgets, summarizeLighthouse } from "../src/reporting/lighthouse.js";

const pages = await Promise.all(
  ["home", "login"].map(async (page) => {
    const value: unknown = JSON.parse(
      await readFile(`reports/lighthouse-${page}.report.json`, "utf8"),
    );
    return summarizeLighthouse(page, value);
  }),
);
const summary = {
  budgets: lighthouseBudgets,
  pages,
  passed: pages.every((page) => page.passed),
};
await writeFile(
  "reports/lighthouse-summary.json",
  `${JSON.stringify(summary, null, 2)}\n`,
);
const lines = pages.map(
  (page) =>
    `- ${page.page}: performance ${page.scores.performance}, accessibility ${page.scores.accessibility}, best practices ${page.scores["best-practices"]} (${page.passed ? "within budgets" : "below budget"})`,
);
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## Lighthouse (desktop, disposable SUT)\n\n${lines.join("\n")}\n`,
    { flag: "a" },
  );
}
console.log(lines.join("\n"));
if (!summary.passed) process.exitCode = 1;
