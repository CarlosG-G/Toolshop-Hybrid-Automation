import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const sources = [
  "reports/hermetic.json",
  "reports/hermetic-hybrid.json",
  "reports/live-api.json",
  "reports/live-ui.json",
  "reports/vibium.json",
];
const infrastructure =
  "api=success; site=failure; vibium_hermetic=success; vibium_site=failure; vibium_live=skipped";

function playwrightReport(title: string, outcome: "expected" | "unexpected") {
  return JSON.stringify({
    stats: {},
    suites: [
      {
        title: "chromium",
        specs: [
          {
            title,
            tests: [
              {
                outcome,
                expectedStatus: "passed",
                results: [
                  { status: outcome === "expected" ? "passed" : "failed", duration: 5 },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

async function buildReport(files: Record<string, string>, status = infrastructure) {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-report-"));
  try {
    await mkdir(join(directory, "reports"));
    for (const [path, contents] of Object.entries(files)) {
      await writeFile(join(directory, path), contents);
    }

    await execFileAsync(
      process.execPath,
      [
        join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs"),
        join(projectRoot, "scripts", "build-report.ts"),
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          GITHUB_STEP_SUMMARY: "",
          TOOLSHOP_TARGET: "stable",
          TOOLSHOP_REPORT_FILES: sources.join(";"),
          TOOLSHOP_INFRA_STATUS: status,
        },
        timeout: 30_000,
      },
    );

    const report: unknown = JSON.parse(
      await readFile(join(directory, "reports", "unified-report.json"), "utf8"),
    );
    const markdown = await readFile(
      join(directory, "reports", "unified-report.md"),
      "utf8",
    );
    return { report, markdown };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("combines gate and hybrid results and lists unavailable live reports", async () => {
  const { report, markdown } = await buildReport({
    [sources[0]]: playwrightReport("Playwright gate", "expected"),
    [sources[1]]: playwrightReport("Playwright and Vibium", "expected"),
  });

  expect(report).toMatchObject({
    target: "stable",
    infrastructure,
    totals: { passed: 2, failed: 0, flaky: 0, skipped: 0, detected: 0 },
    missingReports: sources.slice(2),
    cases: [
      { title: "chromium / Playwright gate", status: "passed", source: sources[0] },
      { title: "chromium / Playwright and Vibium", status: "passed", source: sources[1] },
    ],
  });
  expect(markdown).toContain("Reports not produced: reports/live-api.json");
});

test("exposes failed or missing hybrid reports instead of hiding them", async () => {
  const gate = playwrightReport("Playwright gate", "expected");
  const failed = await buildReport(
    {
      [sources[0]]: gate,
      [sources[1]]: playwrightReport("Playwright and Vibium", "unexpected"),
    },
    "vibium_hermetic=failure",
  );
  expect(failed.report).toMatchObject({
    infrastructure: "vibium_hermetic=failure",
    totals: { passed: 1, failed: 1 },
    cases: [
      { status: "passed", source: sources[0] },
      { status: "failed", source: sources[1] },
    ],
  });

  const missing = await buildReport({ [sources[0]]: gate }, "vibium_hermetic=skipped");
  expect(missing.report).toMatchObject({
    infrastructure: "vibium_hermetic=skipped",
    totals: { passed: 1, failed: 0 },
    missingReports: sources.slice(1),
  });
  expect(missing.markdown).toContain("reports/hermetic-hybrid.json");
});

test("fails explicitly when no expected reports exist", async () => {
  await expect(buildReport({})).rejects.toThrow("No Playwright report was produced");
});
