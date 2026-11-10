import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const base = new URL(process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:4200");
if (
  !["http:", "https:"].includes(base.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
) {
  throw new Error("Lighthouse audits are restricted to the disposable loopback SUT.");
}

mkdirSync("reports", { recursive: true });
for (const [page, path] of [
  ["home", "/"],
  ["login", "/auth/login"],
]) {
  const result = spawnSync(
    process.execPath,
    [
      resolve("node_modules/lighthouse/cli/index.js"),
      new URL(path, base).href,
      "--preset=desktop",
      "--only-categories=performance,accessibility,best-practices",
      "--output=json",
      "--output=html",
      `--output-path=reports/lighthouse-${page}`,
      "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
      "--quiet",
    ],
    { stdio: "inherit", env: { ...process.env, CHROME_PATH: chromium.executablePath() } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Lighthouse ${page} failed with exit code ${result.status}.`);
  }
}
