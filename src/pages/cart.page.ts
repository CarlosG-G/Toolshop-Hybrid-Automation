import type { Locator, Page } from "@playwright/test";

const CART_TIMEOUT_MS = 20_000;

/** Cart navigation and selectors; tests remain responsible for quantities, totals and outcomes. */
export class CartPage {
  /** Wraps the current shopping session's page, preserving cookies and cart state. */
  constructor(private readonly page: Page) {}

  /** Opens the cart through its navigation link and waits for at least one product. */
  async open(): Promise<void> {
    await this.page.locator('[data-test="nav-cart"]').click();
    await this.page.locator('[data-test="product-title"]').first().waitFor({
      state: "visible",
      timeout: CART_TIMEOUT_MS,
    });
  }

  /** Returns cart product titles containing the supplied text, without asserting visibility. */
  productTitle(name: string): Locator {
    return this.page.locator('[data-test="product-title"]').filter({ hasText: name });
  }

  /** Advances from the cart to checkout; the checkout page object handles subsequent readiness. */
  async proceedToCheckout(): Promise<void> {
    await this.page.locator('[data-test="proceed-1"]').click();
  }
}
