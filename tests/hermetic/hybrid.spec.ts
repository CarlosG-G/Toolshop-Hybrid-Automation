import { expect, test } from "@playwright/test";
import { browser } from "vibium";
import { assertVibiumVisible } from "../../src/vibium/semantic.js";
import { setVibiumDesktopViewport } from "../../src/vibium/session.js";

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

test("Vibium visibility waits for asynchronous changes and reports timeouts", async () => {
  test.setTimeout(60_000);
  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    await page.go("http://127.0.0.1:4173/");
    await page.evaluate(
      `document.body.insertAdjacentHTML("beforeend", '<button data-test="delayed-menu" hidden>Account</button>')`,
    );
    const menu = await page.find('[data-test="delayed-menu"]');
    await expect(assertVibiumVisible(menu, "account menu", 300)).rejects.toThrow(
      'expected "account menu" to be visible within 300 ms',
    );

    await page.evaluate(
      `setTimeout(() => { document.querySelector('[data-test="delayed-menu"]').hidden = false; }, 500)`,
    );
    await assertVibiumVisible(menu, "account menu", 5_000);
  } finally {
    await session.stop();
  }
});

test("Vibium desktop viewport exposes a responsive navigation menu", async () => {
  test.setTimeout(60_000);
  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    await page.setViewport({ width: 762, height: 720 });
    await page.go("http://127.0.0.1:4173/");
    await page.evaluate(
      `document.body.insertAdjacentHTML("beforeend", '<style>@media (max-width: 991px) { [data-test="desktop-menu"] { display: none; } }</style><nav data-test="desktop-menu">Account</nav>')`,
    );
    const menu = await page.find('[data-test="desktop-menu"]');
    await expect(assertVibiumVisible(menu, "desktop menu", 300)).rejects.toThrow(
      'expected "desktop menu" to be visible within 300 ms',
    );

    await setVibiumDesktopViewport(page);
    expect(await page.evaluate<number>("window.innerWidth")).toBe(1280);
    await assertVibiumVisible(menu, "desktop menu", 5_000);
  } finally {
    await session.stop();
  }
});
