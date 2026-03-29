const COMPOSITE_API_BASE =
  "https://personal-xgmyo0qv.outsystemscloud.com/Payment_Voucher_Composite/rest/CompositePaymentAPI";

const VOUCHER_API_BASE =
  "https://personal-xgmyo0qv.outsystemscloud.com/Voucher/rest/VoucherAPI";

const PAYMENT_API_BASE =
  "https://personal-xgmyo0qv.outsystemscloud.com/Stripe_Payments/rest/PaymentAPI";

/**
 * Process a payment (with or without voucher)
 * @param {Object} payload
 * @param {number} payload.Amount - Amount in cents (e.g. 5000 = $50.00)
 * @param {string} payload.Currency - e.g. "sgd"
 * @param {string} payload.PaymentMethod - e.g. "pm_card_visa"
 * @param {string} payload.VoucherCode - optional voucher code, pass "" if none
 */
export async function processPayment({ Amount, Currency, PaymentMethod, VoucherCode = "" }) {
  const res = await fetch(`${COMPOSITE_API_BASE}/ProcessPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Amount, Currency, PaymentMethod, VoucherCode }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.ErrorMessage || data?.Errors?.[0] || "Payment failed");
  }

  return data;
}

/**
 * Validate a voucher code
 * @param {string} VoucherCode
 */
export async function validateVoucher(VoucherCode) {
  const res = await fetch(`${VOUCHER_API_BASE}/ValidateVoucher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ VoucherCode }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.ErrorMessage || "Voucher validation failed");
  }

  return data;
}


export async function createPaymentIntent({ Amount, Currency }) {
  const res = await fetch(`${PAYMENT_API_BASE}/CreatePaymentIntent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Amount, Currency }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.Errors?.[0] || "Failed to create payment");
  return data;
}

export async function cancelPaymentIntent(PaymentIntentId) {
  const res = await fetch(`${PAYMENT_API_BASE}/CancelPaymentIntent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ PaymentIntentId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.Errors?.[0] || "Failed to cancel payment");
  return data;
}