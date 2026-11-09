import { expect, test } from "@playwright/test";
import { CatalogPage } from "../../src/pages/catalog.page.js";
import { config } from "../../src/config/env.js";

test("WB-01: detects the missing heading or searches the live catalog", async ({
  page,
}) => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live UI suite is opt-in.");
  test.skip(
    config.target === "local",
    "This comparison is for the public stable/with-bugs targets.",
  );
  test.setTimeout(90_000);

  await page.goto(config.siteUrl, {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  const heading = page.getByRole("heading", {
    name: "Practice Software Testing - Toolshop",
    level: 1,
  });
  // oxlint-disable-next-line playwright/no-conditional-in-test -- the with-bugs target intentionally breaks the catalog heading
  if (config.target === "with-bugs") {
    await expect(heading).toHaveCount(0);
    return;
  }
  await expect(heading).toBeVisible();
  const catalog = new CatalogPage(page);
  await catalog.waitUntilLoaded();
  await catalog.search("Combination Pliers");

  await expect(catalog.productLink("Combination Pliers")).toBeVisible({
    timeout: 20_000,
  });
});
