import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parse } from "yaml";
import { isRecord } from "../../src/reporting/guards.js";

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
  const config: unknown = parse(
    await readFile(new URL("../../docker/compose.yml", import.meta.url), "utf8"),
  );
  const command = angularCommand(config);
  expect(command.slice(0, 2)).toEqual(["bash", "-ec"]);
  const script = command[2];
  expect(script).toContain("ng serve --configuration production");
  expect(script).toContain("http://localhost:8091");
  expect(script).toContain("https://api.practicesoftwaretesting.com");
  expect(script).toContain("Unexpected Toolshop API URL");
});
