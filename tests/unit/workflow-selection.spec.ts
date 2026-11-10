import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { parse } from "yaml";
import { isRecord } from "../../src/reporting/guards.js";

const run = promisify(execFile);
const script = fileURLToPath(
  new URL("../../scripts/select-test-suite.mjs", import.meta.url),
);
const allSut = ["api", "ui-1", "ui-2", "nonfunctional", "bdd", "visual", "vibium"];
const hermetic = "reports/hermetic.json";
const selections = [
  {
    suite: "all",
    sut: allSut,
    hybrid: true,
    public: true,
    reports: [
      hermetic,
      "reports/hermetic-hybrid.json",
      ...allSut.map((suite) => `local=reports/sut-${suite}.json`),
      "reports/live-api.json",
      "reports/live-ui.json",
      "reports/vibium.json",
    ],
  },
  { suite: "hermetic", sut: [], hybrid: false, public: false, reports: [hermetic] },
  {
    suite: "hybrid",
    sut: [],
    hybrid: true,
    public: false,
    reports: [hermetic, "reports/hermetic-hybrid.json", "reports/vibium.json"],
  },
  {
    suite: "api",
    sut: ["api"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-api.json"],
  },
  {
    suite: "ui",
    sut: ["ui-1", "ui-2"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-ui-1.json", "local=reports/sut-ui-2.json"],
  },
  {
    suite: "nonfunctional",
    sut: ["nonfunctional"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-nonfunctional.json"],
  },
  {
    suite: "bdd",
    sut: ["bdd"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-bdd.json"],
  },
  {
    suite: "visual",
    sut: ["visual"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-visual.json"],
  },
  {
    suite: "vibium",
    sut: ["vibium"],
    hybrid: false,
    public: false,
    reports: [hermetic, "local=reports/sut-vibium.json"],
  },
  {
    suite: "public",
    sut: [],
    hybrid: false,
    public: true,
    reports: [hermetic, "reports/live-api.json", "reports/live-ui.json"],
  },
];

for (const selection of selections) {
  test(`manual ${selection.suite} selection exports only its suites and expected reports`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "toolshop-selection-"));
    try {
      const output = join(directory, "outputs");
      await run(process.execPath, [script], {
        env: {
          ...process.env,
          TOOLSHOP_TEST_SUITE: selection.suite,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: join(directory, "summary"),
        },
      });
      const values = Object.fromEntries(
        (await readFile(output, "utf8"))
          .trim()
          .split("\n")
          .map((line) => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      );
      expect(JSON.parse(values.sut_suites)).toEqual(selection.sut);
      expect(values.run_sut).toBe(String(selection.sut.length > 0));
      expect(values.run_hybrid).toBe(String(selection.hybrid));
      expect(values.run_public).toBe(String(selection.public));
      expect(values.report_files.split(";")).toEqual(selection.reports);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("manual selection rejects unknown or injected suite names", async () => {
  for (const suite of ["unknown", 'api"\nrun_public=true', "constructor"]) {
    await expect(
      run(process.execPath, [script], {
        env: { ...process.env, TOOLSHOP_TEST_SUITE: suite },
      }),
    ).rejects.toThrow("Unknown test suite");
  }
});

test("manual selection requires an explicit GitHub output destination", async () => {
  await expect(
    run(process.execPath, [script], {
      env: { ...process.env, TOOLSHOP_TEST_SUITE: "all", GITHUB_OUTPUT: "" },
    }),
  ).rejects.toThrow("GITHUB_OUTPUT is required");
});

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Expected a workflow mapping.");
  return value;
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error("Expected workflow steps.");
  return value.map(record);
}

test("manual dispatch and reusable CI wire selected jobs, reports and safe publication", async () => {
  const workflow = record(
    parse(
      await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8"),
    ),
  );
  const events = record(workflow.on);
  const inputs = record(record(events.workflow_dispatch).inputs);
  expect(record(inputs.suite).options).toEqual(selections.map(({ suite }) => suite));
  expect(record(inputs.suite).default).toBe("all");
  expect(record(record(record(events.workflow_call).inputs).suite).default).toBe("all");
  expect(record(inputs.publish_report).default).toBe(false);
  const jobs = record(workflow.jobs);
  const select = record(jobs.select);
  expect(select.outputs).toEqual(
    Object.fromEntries(
      ["sut_suites", "run_sut", "run_hybrid", "run_public", "report_files"].map(
        (output) => [output, `\${{ steps.selection.outputs.${output} }}`],
      ),
    ),
  );
  const selection = records(select.steps).find((step) => step.id === "selection");
  expect(selection?.run).toBe("node scripts/select-test-suite.mjs");
  expect(record(selection?.env).TOOLSHOP_TEST_SUITE).toBe("${{ inputs.suite || 'all' }}");
  expect(record(jobs.quality).needs).toBe("select");
  for (const [job, output] of [
    ["hybrid", "run_hybrid"],
    ["sut", "run_sut"],
    ["live", "run_public"],
  ]) {
    expect(record(jobs[job]).needs).toBe("select");
    expect(record(jobs[job]).if).toBe(`needs.select.outputs.${output} == 'true'`);
  }
  expect(record(record(record(jobs.sut).strategy).matrix).suite).toBe(
    "${{ fromJSON(needs.select.outputs.sut_suites) }}",
  );
  const report = record(jobs.report);
  expect(report.needs).toEqual(["select", "quality", "sut", "hybrid", "live"]);
  expect(report.if).toBe("always() && !cancelled()");
  const steps = records(report.steps);
  const build = steps.find(
    (step) => step.name === "Build traceability and unified report",
  );
  expect(record(build?.env).TOOLSHOP_REPORT_FILES).toBe(
    "${{ needs.select.outputs.report_files }}",
  );
  for (const name of ["Configure GitHub Pages", "Upload Pages artifact"]) {
    expect(steps.find((step) => step.name === name)?.if).toContain(
      "(!inputs.suite || inputs.suite == 'all')",
    );
  }
});
