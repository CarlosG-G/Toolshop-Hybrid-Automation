import { expect, test } from "@playwright/test";
import { CatalogPage } from "../../src/pages/catalog.page.js";

const catalogHtml = `<!doctype html>
<label for="search">Search</label>
<input id="search">
<button>Search</button>
<div id="products"></div>
<script>
  setTimeout(() => {
    document.querySelector("#products").innerHTML =
      '<a href="/product/initial"><span data-test="product-name">Initial product</span></a>';
  }, 300);
  document.querySelector("button").addEventListener("click", async () => {
    const response = await fetch("/products/search", { method: "QUERY" });
    if (!response.ok) return;
    const product = await response.json();
    document.querySelector("#products").innerHTML =
      '<a href="/product/pliers"><span data-test="product-name">' + product.name + '</span></a>';
  });
</script>`;

test.beforeEach(async ({ page }) => {
  await page.route("**/catalog-readiness", (route) =>
    route.fulfill({ contentType: "text/html", body: catalogHtml }),
  );
  await page.goto("http://127.0.0.1:4173/catalog-readiness");
});

test("waits for the initial catalog and delayed search response", async ({ page }) => {
  let searchResponded = false;
  await page.route("**/products/search", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    searchResponded = true;
    await route.fulfill({ json: { name: "Combination Pliers" } });
  });

  const catalog = new CatalogPage(page);
  await catalog.waitUntilLoaded();
  expect(await page.locator('[data-test="product-name"]').count()).toBe(1);
  await catalog.search("Combination Pliers");
  expect(searchResponded).toBe(true);
  await expect(catalog.productLink("Combination Pliers")).toBeVisible();
});

test("reports a failed catalog search response", async ({ page }) => {
  await page.route("**/products/search", (route) =>
    route.fulfill({ status: 503, body: "Service unavailable" }),
  );

  const catalog = new CatalogPage(page);
  await expect(catalog.search("Combination Pliers")).rejects.toThrow(
    "Catalog search failed: HTTP 503",
  );
});
