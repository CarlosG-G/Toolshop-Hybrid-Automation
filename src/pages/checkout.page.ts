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
    const proceedToPayment = this.page.locator('[data-test="proceed-3"]');
    await proceedToPayment.waitFor({
      state: "visible",
      timeout: CHECKOUT_TIMEOUT_MS,
    });
    await this.page.getByLabel("Country").selectOption({ label: "Austria" });
    await this.page.getByPlaceholder("Your Postcode *").fill("1010");
    await this.page.getByPlaceholder("e.g. 42 *").fill("1");
    await proceedToPayment.click();
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
