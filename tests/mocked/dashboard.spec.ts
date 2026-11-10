import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
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

async function openDashboard(
  page: Page,
  missingReports: unknown,
  extra: Record<string, unknown> = {},
) {
  await page.route("**/report-dashboard", (route) =>
    route.fulfill({
      path: dashboardPath,
      contentType: "text/html",
    }),
  );
  await page.route(/\/data\.json(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: { ...dashboardReport(missingReports), ...extra },
    }),
  );
  await page.goto("http://127.0.0.1:4173/report-dashboard");
}

test("shows the browser project for a flaky SUT case", async ({ page }) => {
  await openDashboard(page, [], {
    cases: [
      {
        target: "local-from-with-bugs",
        type: "e2e",
        project: "webkit",
        title: "TC-E2E-035",
        status: "flaky",
        durationMs: 42,
      },
      {
        target: "local-from-stable",
        type: "e2e",
        title: "Legacy report",
        status: "passed",
        durationMs: 5,
      },
    ],
  });

  const evidence = page.locator("#cases");
  await expect(evidence.getByRole("row", { name: /TC-E2E-035/ })).toContainText("webkit");
  await expect(evidence.getByRole("row", { name: /Legacy report/ })).toContainText(
    "Not reported",
  );
});

test("provides a self-contained dashboard icon", async ({ page }) => {
  await openDashboard(page, []);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    /^data:image\/svg\+xml,/,
  );
});

test("shows reports not produced separately from skipped cases", async ({ page }) => {
  await openDashboard(page, ["reports/live-ui.json", "reports/vibium.json"]);

  await expect(
    page.locator(".card").filter({ hasText: "Defect observations" }),
  ).toBeVisible();
  await expect(page.getByText(/count test cases, not unique defects/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reports not produced" })).toBeVisible();
  await expect(page.getByText("reports/live-ui.json")).toBeVisible();
  await expect(page.getByText("reports/vibium.json")).toBeVisible();
  await expect(
    page.getByText("their test cases are not included in the totals"),
  ).toBeVisible();
  await expect(page.locator(".card").filter({ hasText: "Skipped cases" })).toBeVisible();
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

test("renders management, nightly evidence and trends without interpreting data as HTML", async ({
  page,
}) => {
  await openDashboard(page, [], {
    evidenceUrl: "https://github.com/example/project/actions/runs/123",
    management: {
      executed: 2,
      passRatePercent: 50,
      designCoverage: { covered: 1, total: 1 },
      executionCoverage: { covered: 1, total: 1 },
      requirements: [
        {
          id: "REQ-1",
          risk: "High",
          tests: ["TC-API-001"],
          executedTests: ["TC-API-001"],
          defects: ["DEF-001"],
        },
      ],
      openDefects: [
        {
          id: "<img src=x onerror=alert(1)>",
          severity: "Major",
          status: "Open",
          tests: ["TC-API-001"],
        },
      ],
      byType: { api: { passed: 1, detected: 1, failed: 0, flaky: 0, skipped: 0 } },
    },
    quality: {
      nightly: {
        runId: "44",
        conclusion: "failure",
        url: "https://github.com/example/project/actions/runs/44",
      },
      load: {
        p95Ms: 42,
        failureRate: 0.001,
        requests: 100,
        requestsPerSecond: 10,
        maxVus: 50,
        thresholdsPassed: true,
      },
      zap: {
        byRisk: { high: 0, medium: 1, low: 0, informational: 0 },
        alerts: [{ name: "Header missing", risk: "medium", instances: 2 }],
      },
      lighthouse: {
        pages: [
          {
            page: "home",
            scores: { performance: 0.9, accessibility: 0.8, "best-practices": 1 },
            passed: true,
            samples: [
              { performance: 0.88, accessibility: 0.8, "best-practices": 1 },
              { performance: 0.89, accessibility: 0.81, "best-practices": 1 },
              { performance: 0.9, accessibility: 0.82, "best-practices": 1 },
              { performance: 0.91, accessibility: 0.83, "best-practices": 1 },
              { performance: 0.92, accessibility: 0.84, "best-practices": 1 },
            ],
          },
        ],
      },
    },
    history: {
      hasPrevious: true,
      runs: [
        {
          runId: "123",
          generatedAt: "2026-01-01",
          passRatePercent: 50,
          totals: { failed: 0, flaky: 0 },
          executionCoverage: { covered: 1, total: 1 },
        },
      ],
    },
  });

  await expect(page.locator("#management")).toContainText("Pass rate: 50%");
  await expect(page.locator("#requirements")).toContainText("REQ-1");
  await expect(page.locator("#defects")).toContainText("<img src=x onerror=alert(1)>");
  await expect(page.locator("#defects img")).toHaveCount(0);
  await expect(page.locator("#nightly-status")).toContainText("failure");
  await expect(page.locator("#load")).toContainText("p95 42.0 ms");
  await expect(page.locator("#zap")).toContainText("1 medium");
  await expect(page.locator("#lighthouse")).toContainText("performance 90 median");
  await expect(page.locator("#lighthouse")).toContainText("accessibility 80 minimum");
  await expect(page.locator("#lighthouse")).toContainText(
    "88/80/100, 89/81/100, 90/82/100, 91/83/100, 92/84/100",
  );
  await expect(page.locator("#history")).toContainText("123");
  await expect(page.locator("#evidence-link")).toHaveAttribute(
    "href",
    "https://github.com/example/project/actions/runs/123",
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((item) =>
      ["critical", "serious"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("renders legacy Lighthouse reports without a sampling label", async ({ page }) => {
  await openDashboard(page, [], {
    quality: {
      lighthouse: {
        pages: [
          {
            page: "home",
            scores: { performance: 0.9, accessibility: 0.8, "best-practices": 1 },
            passed: true,
          },
        ],
      },
    },
  });
  await expect(page.locator("#lighthouse")).toContainText(
    "home: performance 90, accessibility 80, best practices 100 (passed)",
  );
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
