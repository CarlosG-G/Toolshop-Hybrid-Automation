import { expect, type Page } from "@playwright/test";
import { config } from "../../src/config/env.js";
import { CartPage } from "../../src/pages/cart.page.js";
import { CheckoutPage } from "../../src/pages/checkout.page.js";
import { LoginPage } from "../../src/pages/login.page.js";
import { ProductPage } from "../../src/pages/product.page.js";
import { seededCustomer } from "./gates.js";

export function invoiceNumberFrom(body: unknown): string {
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

export async function openPaymentStep(page: Page): Promise<CheckoutPage> {
  const login = new LoginPage(page);
  await login.open(config.siteUrl);
  await login.signIn(seededCustomer.email, seededCustomer.password);

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
