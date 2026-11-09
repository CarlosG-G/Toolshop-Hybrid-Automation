import { config } from "../../src/config/env.js";
import { gates } from "../support/gates.js";
import { expect, productNames, test } from "./support.js";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe("Responsive layout on a mobile viewport @mobile @nonfunctional", () => {
  test.beforeEach(gates.writableSut);

  const pages = [
    { path: "/", ready: productNames },
    { path: "/auth/login", ready: '[data-test="email"]' },
    { path: "/auth/register", ready: '[data-test="first-name"]' },
  ];
  for (const { path, ready } of pages) {
    test(`TC-MOB-001 ${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(`${config.siteUrl}${path}`);
      await page.locator(ready).first().waitFor({ state: "visible" });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("TC-MOB-002 navigation collapses into a working menu toggle", async ({ page }) => {
    await page.goto(config.siteUrl);
    await page.locator(productNames).first().waitFor({ state: "visible" });
    const signIn = page.locator('[data-test="nav-sign-in"]');
    await expect(signIn).toBeHidden();

    await page.locator("button.navbar-toggler").tap();

    await expect(signIn).toBeVisible();
  });
});
