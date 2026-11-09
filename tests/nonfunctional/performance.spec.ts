import { config } from "../../src/config/env.js";
import { gates } from "../support/gates.js";
import { expect, productNames, test } from "./support.js";

/** Budgets sized for the containerised SUT on a shared CI runner, not production SLOs. */
const API_P95_BUDGET_MS = 1_000;
const PAGE_LOAD_BUDGET_MS = 5_000;
const SAMPLES = 20;

function percentile(values: number[], p: number): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

test.describe("Performance budgets @performance @nonfunctional", () => {
  test.beforeEach(gates.writableSut);

  test("TC-PERF-001 catalog API p95 latency stays within budget", async ({
    request,
  }, testInfo) => {
    await request.get(`${config.apiUrl}/products`); // warm-up
    const durations: number[] = [];
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const started = performance.now();
      const response = await request.get(`${config.apiUrl}/products`);
      durations.push(performance.now() - started);
      expect(response.ok()).toBe(true);
    }

    const p95 = percentile(durations, 95);
    testInfo.annotations.push({ type: "p95 ms", description: p95.toFixed(0) });
    expect(p95).toBeLessThan(API_P95_BUDGET_MS);
  });

  test("TC-PERF-002 home page renders products within budget", async ({
    page,
  }, testInfo) => {
    const started = Date.now();
    await page.goto(config.siteUrl);
    await page.locator(productNames).first().waitFor({ state: "visible" });
    const renderMs = Date.now() - started;

    const navigation = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      return entry ? entry.domContentLoadedEventEnd - entry.startTime : 0;
    });
    testInfo.annotations.push(
      { type: "products visible ms", description: String(renderMs) },
      { type: "DOMContentLoaded ms", description: navigation.toFixed(0) },
    );
    expect(renderMs).toBeLessThan(PAGE_LOAD_BUDGET_MS);
    expect(navigation).toBeLessThan(PAGE_LOAD_BUDGET_MS);
  });

  test("TC-PERF-003 catalog API sustains 10 concurrent requests without errors", async ({
    request,
  }) => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, page) =>
        request.get(`${config.apiUrl}/products`, { params: { page: (page % 3) + 1 } }),
      ),
    );

    expect(responses.map((response) => response.status())).toEqual(
      Array.from({ length: 10 }, () => 200),
    );
  });
});
