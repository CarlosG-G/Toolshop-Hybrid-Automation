import { expect, test } from "@playwright/test";
import { LoginPage } from "../../src/pages/login.page.js";
import { RegisterPage } from "../../src/pages/register.page.js";
import { buildRegistration } from "../../src/data/factories.js";
import { config } from "../../src/config/env.js";
import { invalidPayments, validPayments } from "../../src/data/payments.js";
import { invoiceNumberFrom, openPaymentStep } from "../support/checkout.js";
import { gates } from "../support/gates.js";

test.describe("Authenticated checkout journey @e2e @smoke", () => {
  test.beforeEach(() => {
    gates.writableSut();
  });

  test("TC-E2E-001 reaches payment selection from an authenticated cart", async ({
    page,
  }) => {
    const checkout = await openPaymentStep(page);
    await checkout.selectPaymentMethod("cash-on-delivery");
    await expect(checkout.paymentMethod()).toHaveValue("cash-on-delivery");
  });

  // Generated test cases: TC-E2E-010..014
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
    gates.writableSut();
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
    gates.writableSut();
  });

  test("TC-E2E-030 keeps the payment action disabled until a method is chosen", async ({
    page,
  }) => {
    const checkout = await openPaymentStep(page);

    await expect(checkout.finishButton()).toBeDisabled();
  });

  // Generated test cases: TC-E2E-031..036
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
