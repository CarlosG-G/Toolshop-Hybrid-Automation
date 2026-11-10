import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { isRecord } from "../../src/reporting/guards.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const run = promisify(execFile);

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((part: unknown): part is string => typeof part === "string")
  );
}

function angularCommand(value: unknown): string[] {
  if (
    !isRecord(value) ||
    !isRecord(value.services) ||
    !isRecord(value.services["angular-ui"])
  ) {
    throw new Error("SUT compose configuration: invalid Angular service.");
  }
  const command = value.services["angular-ui"].command;
  if (!isStringArray(command) || command.length !== 3) {
    throw new Error("SUT compose configuration: invalid Angular command.");
  }
  return command;
}

test("disposable SUT serves optimized Angular with only its local API", async () => {
  const { stdout } = await run(
    "docker",
    ["compose", "-f", "docker/compose.yml", "config", "--format", "json"],
    { cwd: root },
  );
  const config: unknown = JSON.parse(stdout);
  const command = angularCommand(config);
  expect(command.slice(0, 2)).toEqual(["bash", "-ec"]);
  const script = command[2];
  expect(script).toContain("ng serve --configuration production");
  expect(script).toContain("http://localhost:8091");
  expect(script).toContain("https://api.practicesoftwaretesting.com");
  expect(script).toContain("Unexpected Toolshop API URL");
});
