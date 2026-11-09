import { expect, test } from "@playwright/test";

const mockProducts = {
  current_page: 1,
  data: [
    { id: "pliers-1", name: "Combination Pliers", price: 14.15, in_stock: true },
    { id: "hammer-1", name: "Claw Hammer", price: 12.5, in_stock: true },
  ],
};

test("searches the mocked catalog and updates the cart", async ({ page }) => {
  await page.route("**/api/products", (route) => route.fulfill({ json: mockProducts }));

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("2 products");
  await page.getByRole("searchbox", { name: "Search products" }).fill("pliers");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("Combination Pliers")).toBeVisible();
  await page.getByRole("button", { name: "Add to cart: Combination Pliers" }).click();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
});

test("shows a loading state while the catalog API is slow", async ({ page }) => {
  await page.route("**/api/products", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: mockProducts });
  });

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("Loading products...");
  await expect(page.getByRole("status")).toHaveText("2 products");
});

test("reports a catalog API failure without showing stale products", async ({ page }) => {
  await page.route("**/api/products", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" }),
    }),
  );

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("Catalog request failed: 503");
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("renders an empty catalog as a successful response", async ({ page }) => {
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: { current_page: 1, data: [] } }),
  );

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("status")).toHaveText("0 products");
  await expect(page.getByRole("listitem")).toHaveCount(0);
});
