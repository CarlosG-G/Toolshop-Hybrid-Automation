import type { Payment } from "../api/toolshop-api.js";

/** One valid payment per method accepted by the Toolshop (equivalence partitions of `payment_method`). */
export const validPayments: Record<string, Payment> = {
  "bank-transfer": {
    payment_method: "bank-transfer",
    payment_details: {
      bank_name: "Caixa QA",
      account_name: "Toolshop Automation",
      account_number: "1234567890",
    },
  },
  "cash-on-delivery": { payment_method: "cash-on-delivery", payment_details: {} },
  "credit-card": {
    payment_method: "credit-card",
    payment_details: {
      credit_card_number: "0000-0000-0000-0000",
      expiration_date: "12/2030",
      cvv: "123",
      card_holder_name: "Toolshop Automation",
    },
  },
  "buy-now-pay-later": {
    payment_method: "buy-now-pay-later",
    payment_details: { monthly_installments: "3" },
  },
  "gift-card": {
    payment_method: "gift-card",
    payment_details: { gift_card_number: "GIFT1234ABCD5678", validation_code: "VC12" },
  },
};

const card = validPayments["credit-card"]!.payment_details;
const bank = validPayments["bank-transfer"]!.payment_details;

export interface InvalidPayment {
  /** Short label of the violated rule, used in test titles. */
  rule: string;
  payment: Payment;
}

/** Invalid partitions per payment field, mirrored from the UI and API validation rules. */
export const invalidPayments: InvalidPayment[] = [
  {
    rule: "credit card number without dashes",
    payment: {
      payment_method: "credit-card",
      payment_details: { ...card, credit_card_number: "0000000000000000" },
    },
  },
  {
    rule: "credit card CVV with 2 digits",
    payment: { payment_method: "credit-card", payment_details: { ...card, cvv: "12" } },
  },
  {
    rule: "credit card holder with digits",
    payment: {
      payment_method: "credit-card",
      payment_details: { ...card, card_holder_name: "Agent 007" },
    },
  },
  {
    rule: "bank name with digits",
    payment: {
      payment_method: "bank-transfer",
      payment_details: { ...bank, bank_name: "Bank 24" },
    },
  },
  {
    rule: "bank account number with letters",
    payment: {
      payment_method: "bank-transfer",
      payment_details: { ...bank, account_number: "ES12AB" },
    },
  },
  {
    rule: "gift card validation code with 3 characters",
    payment: {
      payment_method: "gift-card",
      payment_details: { gift_card_number: "GIFT1234ABCD5678", validation_code: "VC1" },
    },
  },
];
