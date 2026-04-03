const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || "http://localhost:8007";

/**
 * Process a payment (with or without voucher)
 * @param {Object} payload
 * @param {number} payload.Amount - Amount in cents (e.g. 5000 = $50.00)
 * @param {string} payload.Currency - e.g. "sgd"
 * @param {string} payload.PaymentMethod - e.g. "pm_card_visa"
 * @param {string} payload.VoucherCode - optional, pass "" if none
 */
export async function processPayment({ Amount, Currency, PaymentMethod, VoucherCode = "" }) {
  const res = await fetch(`${BACKEND_BASE}/payment/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Amount, Currency, PaymentMethod, VoucherCode }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || data?.ErrorMessage || "Payment failed");
  }

  return data;
}

/**
 * Create a PaymentIntent (called on page load to start session)
 * @param {Object} payload
 * @param {number} payload.Amount - Amount in cents
 * @param {string} payload.Currency - e.g. "sgd"
 */
export async function createPaymentIntent({ Amount, Currency }) {
  const res = await fetch(`${BACKEND_BASE}/payment/create-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Amount, Currency }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || data?.ErrorMessage || "Failed to create payment session");
  }

  return data;
}

/**
 * Cancel a PaymentIntent (called when session timer expires)
 * @param {string} PaymentIntentId
 */
export async function cancelPaymentIntent(PaymentIntentId) {
  const res = await fetch(`${BACKEND_BASE}/payment/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ PaymentIntentId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || data?.ErrorMessage || "Failed to cancel payment");
  }

  return data;
}

/**
 * Validate a voucher code
 * @param {string} VoucherCode
 */
export async function validateVoucher(VoucherCode) {
  const res = await fetch(`${BACKEND_BASE}/voucher/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ VoucherCode }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || data?.ErrorMessage || "Voucher validation failed");
  }

  return data;
}
