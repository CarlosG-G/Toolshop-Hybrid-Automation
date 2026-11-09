import { expect, test } from "@playwright/test";
import { browser } from "vibium";
import { assertVibiumVisible } from "../../src/vibium/semantic.js";

test("Playwright and Vibium exercise the local catalog together", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("1 products");
  await expect(page.getByText("Combination Pliers")).toBeVisible();
  const catalogUrl = page.url();

  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const vibiumPage = await session.page();
    await vibiumPage.go(catalogUrl);
    const addToCart = await vibiumPage.find({
      role: "button",
      label: "Add to cart: Combination Pliers",
    });
    await addToCart.click();
    const cart = await vibiumPage.find({ role: "button", text: "Cart 1" });
    await assertVibiumVisible(cart, "Cart 1 button");
  } finally {
    await session.stop();
  }
});
