import type { Locator, Page } from "@playwright/test";

const CATALOG_TIMEOUT_MS = 20_000;

export class CatalogPage {
  constructor(private readonly page: Page) {}

  async open(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page
      .getByRole("heading", {
        name: "Practice Software Testing - Toolshop",
        level: 1,
      })
      .waitFor();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.page.locator('[data-test="product-name"]').first().waitFor({
      state: "visible",
      timeout: CATALOG_TIMEOUT_MS,
    });
  }

  async search(term: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Search" }).fill(term);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (candidate) =>
          candidate.request().method() === "QUERY" &&
          new URL(candidate.url()).pathname.endsWith("/products/search"),
        { timeout: CATALOG_TIMEOUT_MS },
      ),
      this.page.getByRole("button", { name: "Search", exact: true }).click(),
    ]);

    if (!response.ok()) {
      throw new Error(`Catalog search failed: HTTP ${response.status()}`);
    }
  }

  productLink(name: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(name, "i") });
  }
}
