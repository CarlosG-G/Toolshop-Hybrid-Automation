import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

async function openDashboard(page: Page, missingReports: unknown) {
  await page.route("**/report-dashboard", (route) =>
    route.fulfill({
      path: join(projectRoot, "dashboard", "index.html"),
      contentType: "text/html",
    }),
  );
  await page.route("**/data.json", (route) =>
    route.fulfill({
      json: {
        target: "stable",
        infrastructure: "site=failure",
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { passed: 1, detected: 0, failed: 0, flaky: 0, skipped: 0 },
        cases: [{ target: "stable", title: "Hermetic gate", status: "passed", durationMs: 5 }],
        missingReports,
      },
    }),
  );
  await page.goto("http://127.0.0.1:4173/report-dashboard");
}

test("shows reports not produced separately from skipped cases", async ({ page }) => {
  await openDashboard(page, ["reports/live-ui.json", "reports/vibium.json"]);

  await expect(page.getByRole("heading", { name: "Reports not produced" })).toBeVisible();
  await expect(page.getByText("reports/live-ui.json")).toBeVisible();
  await expect(page.getByText("reports/vibium.json")).toBeVisible();
  await expect(page.getByText("their test cases are not included in the totals")).toBeVisible();
  await expect(page.getByText("Skipped cases")).toBeVisible();
  await expect(page.locator("#skipped")).toHaveText("0");
  await expect(page.getByText("Hermetic gate")).toBeVisible();
});

test("hides the missing reports section when all reports exist", async ({ page }) => {
  await openDashboard(page, []);

  await expect(page.locator("#passed")).toHaveText("1");
  await expect(page.locator("#missing-reports")).toBeHidden();
});

test("shows an error when the missing reports list is invalid", async ({ page }) => {
  await openDashboard(page, "invalid");

  await expect(page.locator("#run-status")).toHaveText(
    "Report missing or invalid: missingReports must be a list of paths.",
  );
  await expect(page.locator("#passed")).toHaveText("—");
});
