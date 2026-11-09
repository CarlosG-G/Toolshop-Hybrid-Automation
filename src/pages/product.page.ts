import type { Locator, Page } from "@playwright/test";

const PRODUCT_TIMEOUT_MS = 20_000;

export class ProductPage {
  constructor(private readonly page: Page) {}

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

  quantityInput(): Locator {
    return this.page.locator('[data-test="quantity"]');
  }

  async addToCart(): Promise<void> {
    await this.page.locator('[data-test="add-to-cart"]').click();
  }
}
