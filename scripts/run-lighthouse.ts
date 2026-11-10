import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  lighthouseCollectionFile,
  lighthousePages,
  lighthouseSampleCount,
} from "../src/reporting/lighthouse.js";

mkdirSync("reports", { recursive: true });
const writeCollection = (complete: boolean) =>
  writeFileSync(
    lighthouseCollectionFile,
    `${JSON.stringify({ complete, sampleCount: lighthouseSampleCount, pages: lighthousePages }, null, 2)}\n`,
  );
writeCollection(false);
rmSync("reports/lighthouse-summary.json", { force: true });
const lighthouseCli = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "lighthouse",
  "cli",
  "index.js",
);
const base = new URL(process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:4200");
if (
  !["http:", "https:"].includes(base.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
) {
  throw new Error("Lighthouse audits are restricted to the disposable loopback SUT.");
}

for (const { page, path } of lighthousePages) {
  for (let sample = 1; sample <= lighthouseSampleCount; sample += 1) {
    console.log(
      `Lighthouse ${page}: collecting sample ${sample}/${lighthouseSampleCount}.`,
    );
    const output = `reports/lighthouse-${page}-${sample}`;
    for (const extension of ["json", "html"]) {
      rmSync(`${output}.report.${extension}`, { force: true });
    }
    const result = spawnSync(
      process.execPath,
      [
        lighthouseCli,
        new URL(path, base).href,
        "--preset=desktop",
        "--only-categories=performance,accessibility,best-practices",
        "--output=json",
        "--output=html",
        `--output-path=${output}`,
        "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
        "--quiet",
      ],
      {
        stdio: "inherit",
        timeout: 90_000,
        env: { ...process.env, CHROME_PATH: chromium.executablePath() },
      },
    );
    if (result.error) {
      throw new Error(`Lighthouse ${page} sample ${sample}: ${result.error.message}`, {
        cause: result.error,
      });
    }
    if (result.status !== 0) {
      throw new Error(
        `Lighthouse ${page} sample ${sample} failed with exit code ${result.status}.`,
      );
    }
    for (const extension of ["json", "html"]) {
      if (statSync(`${output}.report.${extension}`).size === 0) {
        throw new Error(
          `Lighthouse ${page} sample ${sample}: empty ${extension} report.`,
        );
      }
    }
  }
}
writeCollection(true);
