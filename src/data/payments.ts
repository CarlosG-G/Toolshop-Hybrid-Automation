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
    payment_details: { gift_card_number: "GIFT1234ABCD", validation_code: "VC12" },
  },
};
