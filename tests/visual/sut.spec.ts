import { expect, test } from "@playwright/test";
import { config } from "../../src/config/env.js";
import { gates } from "../support/gates.js";

test("TC-VIS-001 login form matches the Linux SUT baseline @visual", async ({ page }) => {
  gates.writableSut();
  test.skip(process.platform !== "linux", "The SUT baseline is generated in Linux CI.");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${config.siteUrl}/auth/login`);
  const form = page.locator("form").filter({ has: page.locator('[data-test="email"]') });
  await expect(form).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(form).toHaveScreenshot("sut-login.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.003,
  });
});
