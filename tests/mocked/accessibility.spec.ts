import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("mock catalog has no serious accessibility violations", async ({ page }) => {
  await page.route("**/api/products", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "pliers-1", name: "Combination Pliers", price: 14.15 }],
      },
    }),
  );
  await page.goto("http://127.0.0.1:4173/");

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );

  expect(seriousViolations).toEqual([]);
});
