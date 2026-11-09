import { config } from "../../src/config/env.js";
import { expect, productNames, requiresLocalUi, test } from "./support.js";

const productsApi = /\/products(\?.*)?$/;

test.describe("Resilience under injected network faults @resilience @nonfunctional", () => {
  test.beforeEach(requiresLocalUi);

  test("TC-RES-001 still renders the catalog when the API is slow", async ({ page }) => {
    await page.route(productsApi, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.continue();
    });

    await page.goto(config.siteUrl);

    await expect(page.locator(productNames).first()).toBeVisible({ timeout: 15_000 });
  });

  test("TC-RES-002 keeps the shell usable when the catalog API fails", async ({
    page,
  }) => {
    const uncaught: Error[] = [];
    page.on("pageerror", (error) => uncaught.push(error));
    await page.route(productsApi, (route) =>
      route.fulfill({ status: 500, json: { message: "Injected failure" } }),
    );

    await page.goto(config.siteUrl);

    await expect(page.locator('[data-test="nav-home"]')).toBeVisible();
    await expect(page.locator(productNames)).toHaveCount(0);
    expect(uncaught).toEqual([]);
  });

  test("TC-RES-003 recovers once the API is reachable again", async ({ page }) => {
    let failures = 1;
    await page.route(productsApi, async (route) => {
      if (failures > 0) {
        failures -= 1;
        await route.abort("connectionrefused");
        return;
      }
      await route.continue();
    });

    await page.goto(config.siteUrl);
    await page.reload();

    await expect(page.locator(productNames).first()).toBeVisible();
  });
});
