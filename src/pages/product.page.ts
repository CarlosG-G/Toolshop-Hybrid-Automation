import type { Locator, Page } from "@playwright/test";

const PRODUCT_TIMEOUT_MS = 20_000;

/** Product-detail interactions used to prepare a real UI cart without hardcoded product IDs. */
export class ProductPage {
  /** Uses an existing Playwright page and its current session. */
  constructor(private readonly page: Page) {}

  /** Opens the first rendered catalog item, waits for its add button and returns its name. */
  async openFirstAvailable(siteUrl: string): Promise<string> {
    await this.page.goto(siteUrl);
    const firstProduct = this.page.locator('[data-test="product-name"]').first();
    await firstProduct.waitFor({ state: "visible", timeout: PRODUCT_TIMEOUT_MS });
    const name = (await firstProduct.innerText()).trim();
    await firstProduct.click();
    await this.page.locator('[data-test="add-to-cart"]').waitFor({
      state: "visible",
      timeout: PRODUCT_TIMEOUT_MS,
    });
    return name;
  }

  /** Returns the lazy quantity-input locator so tests can exercise their own boundary values. */
  quantityInput(): Locator {
    return this.page.locator('[data-test="quantity"]');
  }

  /** Clicks add-to-cart using the current quantity; the caller checks the resulting cart. */
  async addToCart(): Promise<void> {
    await this.page.locator('[data-test="add-to-cart"]').click();
  }
}
