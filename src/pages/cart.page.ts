import type { Locator, Page } from "@playwright/test";

const CART_TIMEOUT_MS = 20_000;

export class CartPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.locator('[data-test="nav-cart"]').click();
    await this.page.locator('[data-test="product-title"]').first().waitFor({
      state: "visible",
      timeout: CART_TIMEOUT_MS,
    });
  }

  productTitle(name: string): Locator {
    return this.page.locator('[data-test="product-title"]').filter({ hasText: name });
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.locator('[data-test="proceed-1"]').click();
  }
}
