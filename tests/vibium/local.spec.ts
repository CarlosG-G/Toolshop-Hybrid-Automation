import { expect, test } from "@playwright/test";
import { browser } from "vibium";
import { config } from "../../src/config/env.js";
import { assertVibiumVisible } from "../../src/vibium/semantic.js";
import { setVibiumDesktopViewport } from "../../src/vibium/session.js";
import { gates, seededCustomer } from "../support/gates.js";

test("TC-VIB-001 signs in and adds a product to the cart @vibium", async () => {
  gates.writableSut();
  test.setTimeout(90_000);
  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    await setVibiumDesktopViewport(page);
    await page.go(`${config.siteUrl}/auth/login`);
    await page.find('[data-test="email"]').fill(seededCustomer.email);
    await page.find('[data-test="password"]').fill(seededCustomer.password);
    await page.find('[data-test="login-submit"]').click();
    await assertVibiumVisible(await page.find('[data-test="nav-menu"]'), "account menu");

    await page.go(config.siteUrl);
    const product = await page.find('[data-test="product-name"]');
    const name = (await product.text()).trim();
    expect(name).not.toBe("");
    await product.click();
    await page.find('[data-test="add-to-cart"]').click();
    await page.find('[data-test="nav-cart"]').click();
    const cartItem = await page.find('[data-test="product-title"]');
    expect(await cartItem.text()).toContain(name);
  } finally {
    await session.stop();
  }
});

test("TC-VIB-002 shows required-field errors on an empty sign-in @vibium", async () => {
  gates.writableSut();
  test.setTimeout(60_000);
  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    await setVibiumDesktopViewport(page);
    await page.go(`${config.siteUrl}/auth/login`);
    await page.find('[data-test="login-submit"]').click();
    await assertVibiumVisible(
      await page.find('[data-test="email-error"]'),
      "email error",
    );
    await assertVibiumVisible(
      await page.find('[data-test="password-error"]'),
      "password error",
    );
  } finally {
    await session.stop();
  }
});
