import { expect, test } from "@playwright/test";

test.skip(
  ({ browserName }) => process.platform !== "win32" || browserName !== "chromium",
  "The visual baseline is maintained for Windows Chromium only.",
);

test("mock catalog layout matches its Windows Chromium baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/api/products", (route) =>
    route.fulfill({
      json: {
        current_page: 1,
        data: [
          { id: "pliers-1", name: "Combination Pliers", price: 14.15 },
          { id: "hammer-1", name: "Claw Hammer", price: 12.5 },
        ],
      },
    }),
  );
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("2 products");
  await expect(page).toHaveScreenshot("catalog.png", {
    fullPage: true,
    animations: "disabled",
  });
});
