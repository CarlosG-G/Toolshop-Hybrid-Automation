import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import {
  lighthouseCollectionFile,
  lighthousePages,
  lighthouseSampleCount,
} from "../../src/reporting/lighthouse.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const run = promisify(execFile);

async function writeSamples(
  directory: string,
  performances: number[],
  omit?: { page: string; sample: number },
  loginPort = 4200,
) {
  await mkdir(join(directory, "reports"));
  for (const { page, path } of lighthousePages) {
    for (let index = 0; index < lighthouseSampleCount; index += 1) {
      if (omit?.page === page && omit.sample === index + 1) continue;
      const port = page === "login" ? loginPort : 4200;
      await writeFile(
        join(directory, "reports", `lighthouse-${page}-${index + 1}.report.json`),
        JSON.stringify({
          finalDisplayedUrl: `http://127.0.0.1:${port}${path}`,
          categories: {
            performance: { score: performances[index] },
            accessibility: { score: 0.9 - index * 0.01 },
            "best-practices": { score: 0.95 },
          },
        }),
      );
    }
  }
  await writeFile(
    join(directory, lighthouseCollectionFile),
    JSON.stringify({
      complete: true,
      sampleCount: lighthouseSampleCount,
      pages: lighthousePages,
    }),
  );
}

function buildReport(directory: string) {
  return run(
    process.execPath,
    [
      join(root, "node_modules", "tsx", "dist", "cli.mjs"),
      join(root, "scripts", "build-lighthouse-report.ts"),
    ],
    {
      cwd: directory,
      env: { ...process.env, GITHUB_STEP_SUMMARY: join(directory, "step.md") },
    },
  );
}

test("collector rejects non-loopback targets and invalidates stale results", async () => {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-lighthouse-collector-"));
  try {
    await writeSamples(directory, [0.7, 0.7, 0.7, 0.7, 0.7]);
    await writeFile(join(directory, "reports", "lighthouse-summary.json"), "{}");
    await expect(
      run(
        process.execPath,
        [
          join(root, "node_modules", "tsx", "dist", "cli.mjs"),
          join(root, "scripts", "run-lighthouse.ts"),
        ],
        {
          cwd: directory,
          env: { ...process.env, LIGHTHOUSE_BASE_URL: "https://example.com" },
        },
      ),
    ).rejects.toThrow("restricted to the disposable loopback SUT");
    const collection: unknown = JSON.parse(
      await readFile(join(directory, lighthouseCollectionFile), "utf8"),
    );
    expect(collection).toMatchObject({ complete: false });
    await expect(
      readFile(join(directory, "reports", "lighthouse-summary.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(buildReport(directory)).rejects.toThrow(
      "incomplete or incompatible collection",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Lighthouse report retains every sample and documents aggregation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-lighthouse-"));
  try {
    await writeSamples(directory, [0.58, 0.6, 0.62, 0.64, 0.65]);
    await buildReport(directory);
    const summary: unknown = JSON.parse(
      await readFile(join(directory, "reports", "lighthouse-summary.json"), "utf8"),
    );
    expect(summary).toMatchObject({
      passed: true,
      budgets: { performance: 0.6, accessibility: 0.8, "best-practices": 0.8 },
      pages: [
        {
          page: "home",
          scores: { performance: 0.62 },
          samples: expect.arrayContaining([
            expect.objectContaining({ performance: 0.58 }),
            expect.objectContaining({ performance: 0.65 }),
          ]),
        },
        { page: "login", scores: { performance: 0.62 }, samples: expect.any(Array) },
      ],
    });
    const step = await readFile(join(directory, "step.md"), "utf8");
    expect(step).toContain("performance median 0.62");
    expect(step).toContain("samples (performance/accessibility/best practices):");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Lighthouse report fails when the majority is below budget", async () => {
  const directory = await mkdtemp(join(tmpdir(), "toolshop-lighthouse-"));
  try {
    await writeSamples(directory, [0.59, 0.59, 0.59, 0.7, 0.8]);
    await expect(buildReport(directory)).rejects.toMatchObject({ code: 1 });
    const summary: unknown = JSON.parse(
      await readFile(join(directory, "reports", "lighthouse-summary.json"), "utf8"),
    );
    expect(summary).toMatchObject({
      passed: false,
      pages: [
        { page: "home", passed: false },
        { page: "login", passed: false },
      ],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Lighthouse report rejects incomplete collections, missing samples and inconsistent origins", async () => {
  const missing = await mkdtemp(join(tmpdir(), "toolshop-lighthouse-missing-"));
  const mismatched = await mkdtemp(join(tmpdir(), "toolshop-lighthouse-origin-"));
  try {
    await writeSamples(missing, [0.7, 0.7, 0.7, 0.7, 0.7], { page: "home", sample: 3 });
    await expect(buildReport(missing)).rejects.toThrow("ENOENT");
    await writeFile(
      join(missing, lighthouseCollectionFile),
      JSON.stringify({
        complete: false,
        sampleCount: lighthouseSampleCount,
        pages: lighthousePages,
      }),
    );
    await expect(buildReport(missing)).rejects.toThrow(
      "incomplete or incompatible collection",
    );
    await writeSamples(mismatched, [0.7, 0.7, 0.7, 0.7, 0.7], undefined, 4201);
    await expect(buildReport(mismatched)).rejects.toThrow("inconsistent origins");
  } finally {
    await rm(missing, { recursive: true, force: true });
    await rm(mismatched, { recursive: true, force: true });
  }
});
