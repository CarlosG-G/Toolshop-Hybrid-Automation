import { expect, type Locator, type Page } from "@playwright/test";
import type { Payment, PaymentMethod } from "../api/toolshop-api.js";

const CHECKOUT_TIMEOUT_MS = 20_000;

export class CheckoutPage {
  constructor(
    private readonly page: Page,
    private readonly timeoutMs = CHECKOUT_TIMEOUT_MS,
  ) {}

  async waitForAddressStep(): Promise<void> {
    await this.page.locator('[data-test="proceed-2"]').waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });
  }

  async continueToPayment(): Promise<void> {
    await this.page.locator('[data-test="proceed-2"]').click();
    const proceedToPayment = this.page.locator('[data-test="proceed-3"]');
    await proceedToPayment.waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });
    await this.page.getByLabel("Country").selectOption({ label: "Austria" });
    await this.page.getByPlaceholder("Your Postcode *").fill("1010");
    await this.page.getByPlaceholder("e.g. 42 *").fill("1");
    for (const placeholder of ["Your Street *", "Your City *", "State *"]) {
      await expect(this.page.getByPlaceholder(placeholder)).toHaveValue(/\S/, {
        timeout: this.timeoutMs,
      });
    }
    await proceedToPayment.click();
    await this.paymentMethod().waitFor({
      state: "visible",
      timeout: this.timeoutMs,
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
    const detail = (field: string): string => {
      const value = payment.payment_details[field];
      if (value === undefined) {
        throw new Error(
          `Missing "${field}" for payment method "${payment.payment_method}".`,
        );
      }
      return value;
    };
    const fill = async (field: string): Promise<void> => {
      await this.page.locator(`[data-test="${field}"]`).fill(detail(field));
    };

    switch (payment.payment_method) {
      case "bank-transfer":
        await fill("bank_name");
        await fill("account_name");
        await fill("account_number");
        break;
      case "cash-on-delivery":
        break;
      case "credit-card":
        await fill("credit_card_number");
        await fill("expiration_date");
        await fill("cvv");
        await fill("card_holder_name");
        break;
      case "buy-now-pay-later":
        await this.page
          .locator('[data-test="monthly_installments"]')
          .selectOption(detail("monthly_installments"));
        break;
      case "gift-card":
        await fill("gift_card_number");
        await fill("validation_code");
        break;
      default: {
        const exhaustive: never = payment.payment_method;
        throw new Error(`Unsupported payment method "${exhaustive}".`);
      }
    }
  }

  async checkPayment(): Promise<void> {
    await this.page.locator('[data-test="finish"]').click();
  }

  async confirmOrder(): Promise<void> {
    await this.page.locator('[data-test="finish"]').click();
  }

  finishButton(): Locator {
    return this.page.locator('[data-test="finish"]');
  }

  paymentSuccessMessage(): Locator {
    return this.page.locator('[data-test="payment-success-message"]');
  }

  orderConfirmation(): Locator {
    return this.page.locator("#order-confirmation");
  }
}
