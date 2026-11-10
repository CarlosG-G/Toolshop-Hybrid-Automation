/* oxlint-disable playwright/no-standalone-expect -- BDD steps run inside generated Playwright tests. */
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { config } from "../../../src/config/env.js";
import { buildRegistration } from "../../../src/data/factories.js";
import { invalidPayments, validPayments } from "../../../src/data/payments.js";
import { CheckoutPage } from "../../../src/pages/checkout.page.js";
import { RegisterPage } from "../../../src/pages/register.page.js";
import { invoiceNumberFrom, openPaymentStep } from "../../support/checkout.js";
import { gates } from "../../support/gates.js";

const { Given, When, Then } = createBdd();

Given("a visitor opens the registration page", async ({ page }) => {
  gates.writableSut();
  await new RegisterPage(page).open(config.siteUrl);
});

When("the visitor submits valid registration data", async ({ page }) => {
  const response = await new RegisterPage(page).register(buildRegistration());
  expect(response.status()).toBe(201);
});

Then("the visitor is taken to the sign-in page", async ({ page }) => {
  await expect(page).toHaveURL(/\/auth\/login$/);
});

Given("an authenticated customer has reached payment with a cart", async ({ page }) => {
  gates.writableSut();
  await openPaymentStep(page);
});

When("the customer checks payment by {string}", async ({ page }, method: string) => {
  const payment = validPayments[method];
  if (!payment) throw new Error(`Unknown payment method in feature: ${method}`);
  const checkout = new CheckoutPage(page);
  await checkout.fillPaymentDetails(payment);
  await checkout.checkPayment();
  await expect(checkout.paymentSuccessMessage()).toBeVisible();
});

Then("the order is confirmed with an invoice number", async ({ page }) => {
  const invoiceResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/invoices"),
  );
  const checkout = new CheckoutPage(page);
  await checkout.confirmOrder();
  const response = await invoiceResponse;
  expect(response.status()).toBe(201);
  await expect(checkout.orderConfirmation()).toContainText(
    invoiceNumberFrom(await response.json()),
  );
});

When(
  "the customer enters invalid payment data for {string}",
  async ({ page }, rule: string) => {
    const invalid = invalidPayments.find((candidate) => candidate.rule === rule);
    if (!invalid) throw new Error(`Unknown invalid payment rule in feature: ${rule}`);
    await new CheckoutPage(page).fillPaymentDetails(invalid.payment);
  },
);

Then("payment submission remains disabled", async ({ page }) => {
  const checkout = new CheckoutPage(page);
  await expect(checkout.finishButton()).toBeDisabled();
  await expect(checkout.paymentSuccessMessage()).toBeHidden();
});
