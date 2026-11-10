import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { buildExitReport } from "../src/reporting/exit-report.js";
import { parseHistory, updateHistory } from "../src/reporting/history.js";
import { isRecord } from "../src/reporting/guards.js";
import { isTraceabilityData, isUnifiedReport } from "../src/reporting/model.js";
import {
  summarizeK6,
  summarizeLighthouseRun,
  summarizeZap,
} from "../src/reporting/quality.js";

async function optionalJson(path: string): Promise<unknown | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    return parsed;
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

const report: unknown = JSON.parse(await readFile("reports/unified-report.json", "utf8"));
const traceability: unknown = JSON.parse(
  await readFile("reports/traceability.json", "utf8"),
);
if (!isUnifiedReport(report)) throw new Error("Invalid unified report.");
if (!isTraceabilityData(traceability)) throw new Error("Invalid traceability report.");
const management = buildExitReport(report, traceability);
const [previous, load, zap, lighthouse, nightly] = await Promise.all([
  optionalJson("reports/previous-history.json"),
  optionalJson("reports/nightly/k6-summary.json"),
  optionalJson("reports/nightly/zap-report.json"),
  optionalJson("reports/nightly/lighthouse-summary.json"),
  optionalJson("reports/nightly-run.json"),
]);
if (
  nightly !== null &&
  (!isRecord(nightly) ||
    typeof nightly.runId !== "string" ||
    typeof nightly.conclusion !== "string" ||
    typeof nightly.url !== "string")
) {
  throw new Error("Invalid nightly run metadata.");
}
const history = updateHistory(
  previous === null ? [] : parseHistory(previous),
  report,
  management,
);
const data = {
  ...report,
  management,
  history: { hasPrevious: previous !== null, runs: history },
  quality: {
    nightly,
    load: load === null ? null : summarizeK6(load),
    zap: zap === null ? null : summarizeZap(zap),
    lighthouse: lighthouse === null ? null : summarizeLighthouseRun(lighthouse),
  },
};
const destination = "site";
await mkdir(destination, { recursive: true });
await copyFile("dashboard/index.html", `${destination}/index.html`);
await writeFile(`${destination}/data.json`, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(
  `${destination}/history.json`,
  `${JSON.stringify({ runs: history }, null, 2)}\n`,
);
console.log(`Built dashboard in ${destination}/.`);
