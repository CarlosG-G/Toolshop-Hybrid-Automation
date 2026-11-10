import { appendFileSync } from "node:fs";

const allSut = ["api", "ui-1", "ui-2", "nonfunctional", "bdd", "visual", "vibium"];
const selections = {
  all: { sut: allSut, hybrid: true, public: true },
  hermetic: { sut: [], hybrid: false, public: false },
  hybrid: { sut: [], hybrid: true, public: false },
  api: { sut: ["api"], hybrid: false, public: false },
  ui: { sut: ["ui-1", "ui-2"], hybrid: false, public: false },
  nonfunctional: { sut: ["nonfunctional"], hybrid: false, public: false },
  bdd: { sut: ["bdd"], hybrid: false, public: false },
  visual: { sut: ["visual"], hybrid: false, public: false },
  vibium: { sut: ["vibium"], hybrid: false, public: false },
  public: { sut: [], hybrid: false, public: true },
};

const suite = process.env.TOOLSHOP_TEST_SUITE ?? "all";
if (!Object.hasOwn(selections, suite)) {
  throw new Error(
    `Unknown test suite "${suite}". Choose one of: ${Object.keys(selections).join(", ")}.`,
  );
}
if (!process.env.GITHUB_OUTPUT) {
  throw new Error("GITHUB_OUTPUT is required to export the selected test suite.");
}

const selected = selections[suite];
const reports = ["reports/hermetic.json"];
if (selected.hybrid) reports.push("reports/hermetic-hybrid.json");
reports.push(...selected.sut.map((name) => `local=reports/sut-${name}.json`));
if (selected.public) reports.push("reports/live-api.json", "reports/live-ui.json");
if (selected.hybrid) reports.push("reports/vibium.json");

const outputs = {
  sut_suites: JSON.stringify(selected.sut),
  run_sut: selected.sut.length > 0,
  run_hybrid: selected.hybrid,
  run_public: selected.public,
  report_files: reports.join(";"),
};
appendFileSync(
  process.env.GITHUB_OUTPUT,
  Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}\n`)
    .join(""),
);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Test selection\n\nSelected suite: \`${suite}\`.\n\n` +
      "Static and hermetic checks always run. Other suites run only when selected.\n" +
      "Partial runs produce downloadable evidence without replacing the public dashboard.\n",
  );
}
console.log(`Selected test suite: ${suite}`);
