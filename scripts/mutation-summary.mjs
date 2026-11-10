import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "reports/mutation/mutation.json";
const report = JSON.parse(readFileSync(file, "utf8"));
const DETECTED = new Set(["Killed", "Timeout"]);
const UNDETECTED = new Set(["Survived", "NoCoverage"]);

const score = (mutants) => {
  const detected = mutants.filter((m) => DETECTED.has(m.status)).length;
  const undetected = mutants.filter((m) => UNDETECTED.has(m.status)).length;
  const valid = detected + undetected;
  return { detected, undetected, valid, pct: valid ? (100 * detected) / valid : 0 };
};

const rows = Object.entries(report.files)
  .map(([path, { mutants }]) => ({ path, ...score(mutants) }))
  .toSorted((a, b) => a.path.localeCompare(b.path));
const total = score(Object.values(report.files).flatMap((f) => f.mutants));

console.log("## Mutation testing (StrykerJS)");
console.log("");
console.log(
  `Mutation score: **${total.pct.toFixed(2)} %** (${total.detected} killed of ${total.valid} valid mutants).`,
);
console.log("");
console.log("| File | Score | Killed | Survived |");
console.log("| --- | ---: | ---: | ---: |");
for (const row of rows) {
  console.log(
    `| \`${row.path}\` | ${row.pct.toFixed(2)} % | ${row.detected} | ${row.undetected} |`,
  );
}
