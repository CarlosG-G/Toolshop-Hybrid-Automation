import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("CI browser image is digest-pinned and matches the locked Playwright version", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const lock = JSON.parse(
    await readFile(new URL("../../package-lock.json", import.meta.url), "utf8"),
  ) as { packages: Record<string, { version: string }> };
  const image = workflow.match(
    /^\s+PLAYWRIGHT_IMAGE:\s+mcr\.microsoft\.com\/playwright:v([\d.]+)-noble@sha256:[a-f0-9]{64}\s*$/m,
  );
  const version = lock.packages["node_modules/@playwright/test"]?.version;
  expect(version, "Playwright must be present in the lockfile.").toBeDefined();
  expect(
    image,
    "CI Playwright image must have a version and SHA-256 digest.",
  ).not.toBeNull();
  expect(image?.[1]).toBe(version);
});

test("nightly comparison includes both SUT matrices and publishes the comparison", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/nightly.yml", import.meta.url),
    "utf8",
  );
  const suites = ["api", "ui-1", "ui-2", "nonfunctional", "bdd", "visual", "vibium"];
  for (const [target, label] of [
    ["stable", "local-from-stable"],
    ["with-bugs", "local-from-with-bugs"],
  ]) {
    for (const suite of suites) {
      expect(workflow).toContain(`${label}=reports/${target}/reports/sut-${suite}.json`);
    }
  }
  const stable = workflow.match(/^  stable:\s*\r?\n([\s\S]*?)(?=^  with_bugs:)/m)?.[1];
  expect(stable).toContain("publish_report: false");
  expect(workflow).toContain("needs: [stable, with_bugs, visual]");
  expect(workflow).toContain("visual=${{ needs.visual.result }}");
  expect(workflow).toMatch(/^  deploy:\s+[\s\S]*?needs:\s*compare/m);
});
