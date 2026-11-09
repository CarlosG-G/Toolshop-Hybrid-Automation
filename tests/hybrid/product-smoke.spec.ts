import { expect, test } from "@playwright/test";
import { browser } from "vibium";
import { CatalogPage } from "../../src/pages/catalog.page.js";
import { config } from "../../src/config/env.js";
import { assertVibiumVisible, findSemanticHeadings } from "../../src/vibium/semantic.js";

test("WB-01: Playwright and Vibium check the same catalog heading", async ({
  page: playwrightPage,
}) => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live hybrid suite is opt-in.");
  test.setTimeout(90_000);

  await playwrightPage.goto(config.siteUrl, {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await expect(
    playwrightPage.getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
  const catalogHeading = playwrightPage.getByRole("heading", {
    name: "Practice Software Testing - Toolshop",
    level: 1,
  });
  if (config.target === "with-bugs") {
    await expect(catalogHeading).toHaveCount(0);

    const vibiumSession = await browser.start({ engine: "chrome", headless: true });
    try {
      const vibiumPage = await vibiumSession.page();
      await vibiumPage.go(config.siteUrl);
      const headings = await findSemanticHeadings(
        vibiumPage,
        "Practice Software Testing - Toolshop",
      );
      expect(headings).toHaveLength(0);
    } finally {
      await vibiumSession.stop();
    }
    return;
  }

  await expect(catalogHeading).toBeVisible();
  const catalog = new CatalogPage(playwrightPage);
  await catalog.waitUntilLoaded();
  await catalog.search("Combination Pliers");
  const productLink = catalog.productLink("Combination Pliers");
  await expect(productLink).toBeVisible({ timeout: 20_000 });
  await productLink.click();
  const productUrl = playwrightPage.url();

  const vibiumSession = await browser.start({ engine: "chrome", headless: true });
  try {
    const vibiumPage = await vibiumSession.page();
    await vibiumPage.go(productUrl);
    const product = await vibiumPage.find({
      role: "heading",
      text: "Combination Pliers",
    });
    await assertVibiumVisible(product, "Combination Pliers heading");
  } finally {
    await vibiumSession.stop();
  }
});
