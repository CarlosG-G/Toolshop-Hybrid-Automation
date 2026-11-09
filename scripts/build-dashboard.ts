import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const report = await readFile("reports/unified-report.json", "utf8");
const destination = "site";
await mkdir(destination, { recursive: true });
await copyFile("dashboard/index.html", `${destination}/index.html`);
await writeFile(`${destination}/data.json`, report);
console.log(`Built dashboard in ${destination}/.`);
