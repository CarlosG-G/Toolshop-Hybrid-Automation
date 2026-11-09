import type { Locator, Page } from "@playwright/test";
import type { Payment, PaymentMethod } from "../api/toolshop-api.js";

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

  async selectPaymentMethod(method: PaymentMethod): Promise<void> {
    await this.paymentMethod().selectOption(method);
  }

  async fillPaymentDetails(payment: Payment): Promise<void> {
    await this.selectPaymentMethod(payment.payment_method);
    const fill = async (field: string, key: string): Promise<void> => {
      const value = payment.payment_details[key];
      if (value === undefined) {
        throw new Error(
          `Missing "${key}" for payment method "${payment.payment_method}".`,
        );
      }
      await this.page.locator(`[data-test="${field}"]`).fill(value);
    };

    switch (payment.payment_method) {
      case "bank-transfer":
        await fill("bank_name", "bank_name");
        await fill("account_name", "account_name");
        await fill("account_number", "account_number");
        break;
      case "cash-on-delivery":
        break;
      case "credit-card":
        await fill("credit_card_number", "credit_card_number");
        await fill("expiration_date", "expiration_date");
        await fill("cvv", "cvv");
        await fill("card_holder_name", "card_holder_name");
        break;
      case "buy-now-pay-later":
        await fill("monthly_installments", "monthly_installments");
        break;
      case "gift-card":
        await fill("gift_card_number", "gift_card_number");
        await fill("validation_code", "validation_code");
        break;
      default: {
        const exhaustive: never = payment.payment_method;
        throw new Error(`Unsupported payment method "${exhaustive}".`);
      }
    }
  }

  async finish(): Promise<void> {
    await this.page.locator('[data-test="finish"]').click();
  }

  paymentSuccessMessage(): Locator {
    return this.page.locator('[data-test="payment-success-message"]');
  }
}
