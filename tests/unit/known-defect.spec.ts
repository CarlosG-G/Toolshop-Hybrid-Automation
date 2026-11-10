import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { collectCases, type PlaywrightReport } from "../../src/reporting/playwright.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("known-defect guards only mark the observed signature as expected", async () => {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-defect-guard-"));
  try {
    const config = join(directory, "playwright.config.cjs");
    const output = join(directory, "report.json");
    await writeFile(
      config,
      `const { defineConfig } = require(${JSON.stringify(join(root, "node_modules", "@playwright", "test"))});
module.exports = defineConfig({
  testDir: ${JSON.stringify(join(root, "tests", "fixtures"))},
  testMatch: "known-defect-cases.ts",
  reporter: [["json", { outputFile: ${JSON.stringify(output)} }]],
  retries: 0,
  workers: 1
});`,
    );
    const result = await new Promise<{ code: number | null; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            join(root, "node_modules", "@playwright", "test", "cli.js"),
            "test",
            "-c",
            config,
          ],
          { cwd: root, stdio: ["ignore", "ignore", "pipe"] },
        );
        let stderr = "";
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stderr }));
      },
    );
    expect(result.code, result.stderr).toBe(1);
    const report = JSON.parse(await readFile(output, "utf8")) as PlaywrightReport;
    const cases = collectCases(report.suites ?? [], output, "local");
    expect(cases.map((entry) => entry.status)).toEqual([
      "detected",
      "failed",
      "failed",
      "passed",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
