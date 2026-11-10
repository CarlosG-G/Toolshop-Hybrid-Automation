import { readFile, writeFile } from "node:fs/promises";
import {
  assertCompleteLighthouseCollection,
  lighthouseBudgets,
  lighthouseCollectionFile,
  lighthousePages,
  lighthouseSampleCount,
  summarizeLighthouseSamples,
} from "../src/reporting/lighthouse.js";

const collection: unknown = JSON.parse(await readFile(lighthouseCollectionFile, "utf8"));
assertCompleteLighthouseCollection(collection);
const pages = await Promise.all(
  lighthousePages.map(async ({ page }) => {
    const values: unknown[] = await Promise.all(
      Array.from({ length: lighthouseSampleCount }, async (_, index) =>
        JSON.parse(
          await readFile(`reports/lighthouse-${page}-${index + 1}.report.json`, "utf8"),
        ),
      ),
    );
    return summarizeLighthouseSamples(page, values);
  }),
);
if (new Set(pages.map((page) => new URL(page.url).origin)).size !== 1) {
  throw new Error("Lighthouse: page results have inconsistent origins.");
}
const summary = {
  budgets: lighthouseBudgets,
  pages,
  passed: pages.every((page) => page.passed),
};
await writeFile(
  "reports/lighthouse-summary.json",
  `${JSON.stringify(summary, null, 2)}\n`,
);
const lines = pages.map((page) => {
  const samples = page.samples
    .map(
      (score) => `${score.performance}/${score.accessibility}/${score["best-practices"]}`,
    )
    .join(", ");
  return `- ${page.page}: performance median ${page.scores.performance}, accessibility minimum ${page.scores.accessibility}, best practices minimum ${page.scores["best-practices"]} (${page.passed ? "within budgets" : "below budget"}); samples (performance/accessibility/best practices): ${samples}`;
});
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## Lighthouse (desktop, disposable SUT)\n\n${lines.join("\n")}\n`,
    { flag: "a" },
  );
}
console.log(lines.join("\n"));
if (!summary.passed) process.exitCode = 1;
