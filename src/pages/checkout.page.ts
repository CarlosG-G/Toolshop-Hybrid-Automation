import { expect, type Locator, type Page, type Request } from "@playwright/test";
import type { Payment, PaymentMethod } from "../api/toolshop-api.js";

const CHECKOUT_TIMEOUT_MS = 20_000;
const POSTCODE_LOOKUP_DEBOUNCE_MS = 300;
const BILLING_POSTCODE = "1010";
const BILLING_HOUSE_NUMBER = "1";

interface BillingLookup {
  street: string;
  city: string;
  state: string;
}

function isBillingLookup(value: unknown): value is BillingLookup {
  return (
    typeof value === "object" &&
    value !== null &&
    "street" in value &&
    typeof value.street === "string" &&
    value.street.trim().length > 0 &&
    "city" in value &&
    typeof value.city === "string" &&
    value.city.trim().length > 0 &&
    "state" in value &&
    typeof value.state === "string" &&
    value.state.trim().length > 0
  );
}

function isBillingLookupRequest(request: Request): boolean {
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    url.pathname.endsWith("/postcode-lookup") &&
    url.searchParams.get("country") === "AT" &&
    url.searchParams.get("postcode") === BILLING_POSTCODE &&
    url.searchParams.get("house_number") === BILLING_HOUSE_NUMBER
  );
}

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
    await this.fillBillingAddress();
    await proceedToPayment.click();
    await this.paymentMethod().waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });
  }

  private async fillBillingAddress(): Promise<void> {
    const pending = new Set<Request>();
    const completed: Request[] = [];
    let started = 0;
    const onRequest = (request: Request): void => {
      if (isBillingLookupRequest(request)) {
        started += 1;
        pending.add(request);
      }
    };
    const onComplete = (request: Request): void => {
      if (pending.delete(request)) completed.push(request);
    };
    this.page.on("request", onRequest);
    this.page.on("requestfinished", onComplete);
    this.page.on("requestfailed", onComplete);

    try {
      await this.page.getByLabel("Country").selectOption({ label: "Austria" });
      await this.page.getByPlaceholder("Your Postcode *").fill(BILLING_POSTCODE);
      await this.page.getByPlaceholder("e.g. 42 *").fill(BILLING_HOUSE_NUMBER);

      // Both fields independently debounce lookups; let their browser timers dispatch.
      await this.page.evaluate(
        (delay) => new Promise<void>((resolve) => setTimeout(resolve, delay)),
        POSTCODE_LOOKUP_DEBOUNCE_MS,
      );
      await expect
        .poll(() => started, {
          message: "Timed out waiting for postcode lookup to start.",
          timeout: this.timeoutMs,
        })
        .toBeGreaterThan(0);
      await expect
        .poll(() => pending.size, {
          message: "Timed out waiting for postcode lookups to finish.",
          timeout: this.timeoutMs,
        })
        .toBe(0);

      let address: unknown;
      for (const request of completed) {
        const failure = request.failure();
        if (failure) throw new Error(`Postcode lookup failed: ${failure.errorText}`);
        const response = await request.response();
        if (!response) throw new Error("Postcode lookup completed without a response.");
        if (!response.ok())
          throw new Error(`Postcode lookup failed: HTTP ${response.status()}`);
        address = await response.json();
      }
      if (!isBillingLookup(address)) {
        throw new Error("Postcode lookup returned an incomplete billing address.");
      }
      for (const [placeholder, value] of [
        ["Your Street *", address.street],
        ["Your City *", address.city],
        ["State *", address.state],
      ]) {
        await expect(this.page.getByPlaceholder(placeholder)).toHaveValue(value, {
          timeout: this.timeoutMs,
        });
      }
    } finally {
      this.page.off("request", onRequest);
      this.page.off("requestfinished", onComplete);
      this.page.off("requestfailed", onComplete);
    }
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
