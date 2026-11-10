import { expect, test, type Locator, type Page } from "@playwright/test";
import { config } from "../../src/config/env.js";
import { ProductPage } from "../../src/pages/product.page.js";
import { openPaymentStep } from "../support/checkout.js";
import { gates } from "../support/gates.js";

const screenshotOptions = {
  animations: "disabled",
  caret: "hide",
  maxDiffPixelRatio: 0.003,
} as const;

async function prepare(page: Page): Promise<void> {
  gates.writableSut();
  test.skip(process.platform !== "linux", "The SUT baseline is generated in Linux CI.");
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function settle(page: Page, region: Locator): Promise<void> {
  await expect(region).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
      ),
    );
  });
}

test("TC-VIS-001 login form matches the Linux SUT baseline @visual", async ({ page }) => {
  await prepare(page);
  await page.goto(`${config.siteUrl}/auth/login`);
  const form = page.locator("form").filter({ has: page.locator('[data-test="email"]') });
  await settle(page, form);
  await expect(form).toHaveScreenshot("sut-login.png", screenshotOptions);
});

test("TC-VIS-002 registration form matches the Linux SUT baseline @visual", async ({
  page,
}) => {
  await prepare(page);
  await page.goto(`${config.siteUrl}/auth/register`);
  const form = page.locator('[data-test="register-form"]');
  await settle(page, form);
  await expect(form).toHaveScreenshot("sut-register.png", screenshotOptions);
});

test("TC-VIS-003 product detail matches the Linux SUT baseline @visual", async ({
  page,
}) => {
  await prepare(page);
  await new ProductPage(page).openFirstAvailable(config.siteUrl);
  const detail = page
    .locator("app-detail .row")
    .filter({ has: page.locator('[data-test="add-to-cart"]') });
  await settle(page, detail);
  await expect(detail).toHaveScreenshot("sut-product-detail.png", screenshotOptions);
});

test("TC-VIS-004 checkout payment step matches the Linux SUT baseline @visual", async ({
  page,
}) => {
  await prepare(page);
  const checkout = await openPaymentStep(page);
  await checkout.selectPaymentMethod("credit-card");
  const step = page.locator("app-payment");
  await expect(step.locator('[data-test="credit_card_number"]')).toBeVisible();
  await settle(page, step);
  await expect(step).toHaveScreenshot("sut-checkout-payment.png", screenshotOptions);
});
