import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const dashboardPath = join(projectRoot, "dashboard", "index.html");

function dashboardReport(missingReports: unknown, passed = 1) {
  return {
    target: "stable",
    infrastructure: "site=failure",
    generatedAt: "2026-01-01T00:00:00.000Z",
    totals: { passed, detected: 0, failed: 0, flaky: 0, skipped: 0 },
    cases: [
      { target: "stable", title: "Hermetic gate", status: "passed", durationMs: 5 },
    ],
    missingReports,
  };
}

async function openDashboard(page: Page, missingReports: unknown) {
  await page.route("**/report-dashboard", (route) =>
    route.fulfill({
      path: dashboardPath,
      contentType: "text/html",
    }),
  );
  await page.route(/\/data\.json(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: dashboardReport(missingReports),
    }),
  );
  await page.goto("http://127.0.0.1:4173/report-dashboard");
}

test("shows reports not produced separately from skipped cases", async ({ page }) => {
  await openDashboard(page, ["reports/live-ui.json", "reports/vibium.json"]);

  await expect(page.getByRole("heading", { name: "Reports not produced" })).toBeVisible();
  await expect(page.getByText("reports/live-ui.json")).toBeVisible();
  await expect(page.getByText("reports/vibium.json")).toBeVisible();
  await expect(
    page.getByText("their test cases are not included in the totals"),
  ).toBeVisible();
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

test("refreshes cached report data after an update", async ({ page }) => {
  const html = await readFile(dashboardPath);
  let passed = 1;
  let reportRequests = 0;
  const server = createServer((request, response) => {
    if (request.url?.startsWith("/data.json")) {
      reportRequests++;
      response.writeHead(200, {
        "cache-control": "public, max-age=600",
        "content-type": "application/json",
      });
      response.end(JSON.stringify(dashboardReport([], passed)));
    } else if (request.url?.startsWith("/report-dashboard")) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "text/html",
      });
      response.end(html);
    } else {
      response.writeHead(404).end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    // oxlint-disable-next-line playwright/no-conditional-in-test -- type guard for server.address()
    if (!address || typeof address === "string") {
      throw new Error("Dashboard fixture did not bind to a TCP port.");
    }
    const origin = `http://127.0.0.1:${address.port}`;
    await page.goto(`${origin}/report-dashboard?view=1`);
    await expect(page.locator("#passed")).toHaveText("1");

    passed = 2;
    await page.goto(`${origin}/report-dashboard?view=2`);
    await expect(page.locator("#passed")).toHaveText("2");
    expect(reportRequests).toBe(2);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
