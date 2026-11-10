import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const run = promisify(execFile);

test("dashboard build exposes missing nightly evidence without inventing success", async () => {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-dashboard-"));
  try {
    await mkdir(join(directory, "reports"));
    await mkdir(join(directory, "dashboard"));
    await copyFile(
      join(root, "dashboard", "index.html"),
      join(directory, "dashboard", "index.html"),
    );
    await writeFile(
      join(directory, "reports", "unified-report.json"),
      JSON.stringify({
        generatedAt: "2026-01-01",
        runId: null,
        commit: null,
        evidenceUrl: null,
        target: "local",
        infrastructure: "sut=success",
        totals: { passed: 0, detected: 0, failed: 0, flaky: 0, skipped: 0 },
        missingReports: [],
        cases: [],
      }),
    );
    await writeFile(
      join(directory, "reports", "traceability.json"),
      JSON.stringify({ requirementDetails: [], defectDetails: [] }),
    );
    await run(
      process.execPath,
      [
        join(root, "node_modules", "tsx", "dist", "cli.mjs"),
        join(root, "scripts", "build-dashboard.ts"),
      ],
      { cwd: directory },
    );
    const data: unknown = JSON.parse(
      await readFile(join(directory, "site", "data.json"), "utf8"),
    );
    expect(data).toMatchObject({
      management: { passRatePercent: null },
      history: { hasPrevious: false },
      quality: { nightly: null, load: null, zap: null, lighthouse: null },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
