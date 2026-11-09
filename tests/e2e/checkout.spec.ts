import { expect, test, type Page } from "@playwright/test";
import { CartPage } from "../../src/pages/cart.page.js";
import { CheckoutPage } from "../../src/pages/checkout.page.js";
import { LoginPage } from "../../src/pages/login.page.js";
import { ProductPage } from "../../src/pages/product.page.js";
import { RegisterPage } from "../../src/pages/register.page.js";
import { buildRegistration } from "../../src/data/factories.js";
import { config } from "../../src/config/env.js";
import { invalidPayments, validPayments } from "../../src/data/payments.js";

const customer = {
  email: "customer@practicesoftwaretesting.com",
  password: "welcome01",
};

function invoiceNumberFrom(body: unknown): string {
  if (
    body === null ||
    typeof body !== "object" ||
    !("invoice_number" in body) ||
    typeof body.invoice_number !== "string" ||
    body.invoice_number.length === 0
  ) {
    throw new Error("Invoice creation response is missing a non-empty invoice_number.");
  }
  return body.invoice_number;
}

async function openPaymentStep(page: Page) {
  const login = new LoginPage(page);
  await login.open(config.siteUrl);
  await login.signIn(customer.email, customer.password);

  const product = new ProductPage(page);
  const productName = await product.openFirstAvailable(config.siteUrl);
  await product.addToCart();

  const cart = new CartPage(page);
  await cart.open();
  await expect(cart.productTitle(productName)).toBeVisible();
  await cart.proceedToCheckout();

  const checkout = new CheckoutPage(page);
  await checkout.waitForAddressStep();
  await checkout.continueToPayment();
  await expect(checkout.paymentMethod()).toBeVisible();
  return checkout;
}

test.describe("Authenticated checkout journey @e2e @smoke", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
      "The checkout journey only runs against the disposable local SUT.",
    );
  });

  test("TC-E2E-001 reaches payment selection from an authenticated cart", async ({
    page,
  }) => {
    const checkout = await openPaymentStep(page);
    await checkout.selectPaymentMethod("cash-on-delivery");
    await expect(checkout.paymentMethod()).toHaveValue("cash-on-delivery");
  });

  for (const [index, [method, payment]] of Object.entries(validPayments).entries()) {
    const caseId = `TC-E2E-${String(index + 10).padStart(3, "0")}`;
    test(`${caseId} completes checkout using ${method}`, async ({ page }) => {
      const checkout = await openPaymentStep(page);
      await checkout.fillPaymentDetails(payment);
      await checkout.checkPayment();
      await expect(checkout.paymentSuccessMessage()).toBeVisible();

      const invoiceResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/invoices"),
      );
      await checkout.confirmOrder();

      const response = await invoiceResponse;
      expect(response.status()).toBe(201);
      const invoiceNumber = invoiceNumberFrom(await response.json());
      await expect(checkout.orderConfirmation()).toContainText(invoiceNumber);
    });
  }
});

test.describe("Customer registration journey @e2e", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
      "Registration only runs against the disposable local SUT.",
    );
  });

  test("TC-E2E-002 registers a customer and signs in with the new account", async ({
    page,
  }) => {
    const user = buildRegistration();
    const registration = new RegisterPage(page);
    await registration.open(config.siteUrl);

    const response = await registration.register(user);
    expect(response.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login$/);

    const login = new LoginPage(page);
    await login.signIn(user.email, user.password);
    await expect(page.locator('[data-test="nav-menu"]')).toBeVisible();
  });
});

test.describe("Payment form validation @e2e @negative", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
      "Payment validation only runs against the disposable local SUT.",
    );
  });

  test("TC-E2E-030 keeps the payment action disabled until a method is chosen", async ({
    page,
  }) => {
    const checkout = await openPaymentStep(page);

    await expect(checkout.finishButton()).toBeDisabled();
  });

  for (const [index, { rule, payment }] of invalidPayments.entries()) {
    const caseId = `TC-E2E-${String(index + 31).padStart(3, "0")}`;
    test(`${caseId} blocks payment with ${rule}`, async ({ page }) => {
      const checkout = await openPaymentStep(page);
      await checkout.fillPaymentDetails(payment);

      await expect(checkout.finishButton()).toBeDisabled();
      await expect(checkout.paymentSuccessMessage()).toBeHidden();
    });
  }
});
