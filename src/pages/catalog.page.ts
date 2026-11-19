import type { Locator, Page } from "@playwright/test";

const CATALOG_TIMEOUT_MS = 20_000;

/** Catalog interactions shared by live and mocked tests; assertions about results stay in tests. */
export class CatalogPage {
  /** Wraps an existing Playwright page without navigating or creating another browser. */
  constructor(private readonly page: Page) {}

  /** Navigates to the catalog and waits for its accessible main heading. */
  async open(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page
      .getByRole("heading", {
        name: "Practice Software Testing - Toolshop",
        level: 1,
      })
      .waitFor();
  }

  /** Waits for the first visible product; use only when the scenario expects nonempty results. */
  async waitUntilLoaded(): Promise<void> {
    await this.page.locator('[data-test="product-name"]').first().waitFor({
      state: "visible",
      timeout: CATALOG_TIMEOUT_MS,
    });
  }

  /** Submits search while awaiting its QUERY response; throws on an HTTP error. */
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

  /** Returns a lazy link locator using name as a case-insensitive regular expression. */
  productLink(name: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(name, "i") });
  }
}
