import type { Locator, Page } from "@playwright/test";

const CHECKOUT_TIMEOUT_MS = 20_000;

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async waitForAddressStep(): Promise<void> {
    await this.page.locator('[data-test="proceed-2"]').waitFor({
      state: "visible",
      timeout: CHECKOUT_TIMEOUT_MS,
    });
  }

  async continueToPayment(): Promise<void> {
    await this.page.locator('[data-test="proceed-2"]').click();
    await this.paymentMethod().waitFor({
      state: "visible",
      timeout: CHECKOUT_TIMEOUT_MS,
    });
  }

  paymentMethod(): Locator {
    return this.page.locator('[data-test="payment-method"]');
  }

  async selectPaymentMethod(method: string): Promise<void> {
    await this.paymentMethod().selectOption(method);
  }
}
