import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import VoucherInput from "./VoucherInput";
import { createPaymentIntent, cancelPaymentIntent } from "../api/paymentApi";
import apiClient from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

  .pf-card {
    font-family: 'DM Sans', sans-serif;
    background: #fffdf9;
    border: 1px solid #e6ddd1;
    border-radius: 28px;
    padding: 34px 30px;
    box-shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .pf-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #241c17;
    margin: 0 0 4px;
    font-weight: 700;
  }

  .pf-divider {
    width: 44px;
    height: 3px;
    background: #c8a97e;
    border-radius: 2px;
    margin-bottom: 20px;
  }

  .pf-amount-display {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border: 1px solid #e6ddd1;
    border-radius: 20px;
    padding: 20px 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pf-amount-label {
    font-size: 0.74rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #a29789;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .pf-amount-value {
    font-family: 'Playfair Display', serif;
    font-size: 2.4rem;
    color: #241c17;
    font-weight: 700;
    line-height: 1;
  }

  .pf-amount-currency {
    font-size: 1.1rem;
    color: #b38d5e;
    font-weight: 700;
    margin-right: 3px;
    vertical-align: super;
    font-family: 'DM Sans', sans-serif;
  }

  .pf-amount-note { font-size: 0.82rem; color: #9e9284; margin-top: 4px; }

  .pf-savings-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f0faf0;
    border: 1px solid #b8ddb8;
    color: #2d6e2d;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .pf-field-group { display: flex; flex-direction: column; gap: 8px; }

  .pf-label {
    font-size: 0.74rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #a29789;
    font-weight: 700;
  }

  .pf-input {
    padding: 13px 16px;
    border: 1.5px solid #e6ddd1;
    border-radius: 14px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    background: rgba(255,255,255,0.92);
    color: #241c17;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pf-input::placeholder { color: #b7ab9c; }

  .pf-input:focus {
    border-color: #c8a97e;
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }

  .pf-input:disabled { opacity: 0.6; cursor: not-allowed; }

  .pf-card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .pf-test-note {
    background: #f8f4ee;
    border: 1px solid #e8ddd0;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 0.84rem;
    color: #7d6f5e;
    line-height: 1.6;
  }

  .pf-test-note strong { color: #241c17; }

  .pf-separator { height: 1px; background: #f0e6d9; }

  .pf-summary { display: flex; flex-direction: column; gap: 10px; }

  .pf-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.92rem;
    color: #7d7468;
  }

  .pf-summary-row.total {
    font-size: 1.05rem;
    font-weight: 700;
    color: #241c17;
    padding-top: 10px;
    border-top: 1px solid #f0e6d9;
  }

  .pf-summary-row.discount { color: #2d6e2d; font-weight: 600; }

  .pf-submit-btn {
    width: 100%;
    padding: 16px 22px;
    background: #241c17;
    color: #faf8f5;
    border: none;
    border-radius: 16px;
    font-size: 1rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: background 0.2s, transform 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .pf-submit-btn:hover:not(:disabled) { background: #b38d5e; transform: translateY(-1px); }
  .pf-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .pf-timer-bar-wrap {
    background: #f5efe6;
    border: 1px solid #e6ddd1;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.84rem;
    color: #7d6f5e;
  }

  .pf-timer-bar-wrap.urgent { background: #fff5f5; border-color: #f5c6c6; color: #b83232; }

  .pf-timer-track { flex: 1; height: 4px; background: #e6ddd1; border-radius: 999px; overflow: hidden; }

  .pf-timer-fill {
    height: 100%;
    background: #c8a97e;
    border-radius: 999px;
    transition: width 1s linear, background 0.3s;
  }

  .pf-timer-fill.urgent { background: #e05252; }

  .pf-session-ref {
    font-size: 0.78rem;
    color: #a29789;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #f8f4ee;
    border: 1px solid #ece0d0;
    border-radius: 10px;
  }

  .pf-initializing {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    background: #f8f4ee;
    border: 1px solid #e8ddd0;
    border-radius: 14px;
    font-size: 0.88rem;
    color: #7d6f5e;
  }

  .pf-success {
    background: #f0faf0;
    border: 1px solid #b8ddb8;
    border-radius: 20px;
    padding: 28px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .pf-success-icon { font-size: 2.4rem; }

  .pf-success-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #1a4d1a;
    font-weight: 700;
    margin: 0;
  }

  .pf-success-id {
    font-size: 0.82rem;
    color: #4a7c4a;
    background: #ddf0dd;
    border-radius: 999px;
    padding: 6px 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .pf-expired {
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    border-radius: 20px;
    padding: 28px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .pf-expired-icon { font-size: 2.4rem; }

  .pf-expired-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #7a1a1a;
    font-weight: 700;
    margin: 0;
  }

  .pf-refresh-btn {
    padding: 12px 24px;
    background: #241c17;
    color: #faf8f5;
    border: none;
    border-radius: 14px;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s;
  }

  .pf-refresh-btn:hover { background: #b38d5e; }

  .pf-error-box {
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 0.88rem;
    color: #b83232;
    font-weight: 500;
  }
  .pf-card-element-wrap {
    padding: 13px 16px;
    border: 1.5px solid #e6ddd1;
    border-radius: 14px;
    background: rgba(255,255,255,0.92);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pf-card-element-wrap.focused {
    border-color: #c8a97e;
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }
`;

const TIMER_SECONDS = 300;

function PaymentFormInner({
  amount = 5000,
  currency = "sgd",
  bookingActivity = null,
  bookingSlot = null,
  foodItems = [],
  orders = [],
  onVoucherApplied,
  onSuccess,
}) {
  const { user } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const [cardFocused, setCardFocused] = useState(false);

  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [initializing, setInitializing] = useState(true);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  const timerRef = useRef(null);
  const finalAmount = voucher ? voucher.finalAmount : amount;
  const saving = voucher ? voucher.saving : 0;

  useEffect(() => {
    if (user?.email && !contactEmail.trim()) {
      setContactEmail(user.email);
    }
  }, [user?.email]);

  // On mount: create PaymentIntent + start timer
  useEffect(() => {
    const init = async () => {
      try {
        const result = await createPaymentIntent({
          Amount: amount,
          Currency: currency.toLowerCase(),
        });
        setPaymentIntentId(result.PaymentIntentId);
      } catch (err) {
        setError("Could not initialise payment session. Please refresh.");
      } finally {
        setInitializing(false);
      }
    };

    init();

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Auto-cancel when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && paymentIntentId && !success) {
      setExpired(true);
      cancelPaymentIntent(paymentIntentId).catch(() => { });
    }
  }, [secondsLeft, paymentIntentId, success]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatSingaporeRange = (start, end) => {
    if (!start || !end) return "";

    const dateOptions = {
      timeZone: "Asia/Singapore",
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    const timeOptions = {
      timeZone: "Asia/Singapore",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    const startDate = new Date(start);
    const endDate = new Date(end);

    const datePart = startDate.toLocaleDateString("en-SG", dateOptions);
    const startTime = startDate.toLocaleTimeString("en-SG", timeOptions);
    const endTime = endDate.toLocaleTimeString("en-SG", timeOptions);

    return `${datePart}, ${startTime} to ${endTime}`;
  };

  const timerPct = (secondsLeft / TIMER_SECONDS) * 100;
  const isUrgent = secondsLeft <= 60;

  const formatCardNumber = (val) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleSubmit = async () => {
    const trimmedEmail = contactEmail.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!stripe || !elements) {
      setError("Payment system not ready. Please refresh.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Please fill in your card details.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1 — Tokenize card with Stripe.js → get real pm_xxx token
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { email: trimmedEmail },
      });

      if (stripeError) {
        setError(stripeError.message || "Card declined. Please try a different card.");
        setLoading(false);
        return;
      }

      // Step 2 — Call composite /booking endpoint with real payment method token
      const res = await apiClient.post("/booking", {
        user_name: user?.username || "guest",
        user_email: trimmedEmail,
        activity_id: bookingActivity?.id,
        start_time: bookingSlot?.start?.toISOString?.() || bookingSlot?.start,
        end_time: bookingSlot?.end?.toISOString?.() || bookingSlot?.end,
        food_items: foodItems,
        payment_method: paymentMethod.id,
        voucher_code: voucher?.code || "",
      });

      if (isFoodOnly) {
        // Food-only payment flow
        const foodItemsPayload = orders.map((order) => ({
          menu_item_id: order.menu_item_id,
          name: order.name,
          price: order.price,
          quantity: order.quantity,
          comment: order.comment || "Food-only order",
          image_url: order.image_url || "",
        }));

        const res = await apiClient.post("/food-only-payment", {
          user_name: user?.username || "guest",
          user_email: trimmedEmail,
          food_items: foodItemsPayload,
          payment_method: "card",
          voucher_code: voucher?.code || "",
        });

        const result = res.data;

        if (result.success && result.payment?.Success) {
          clearInterval(timerRef.current);

          // Clear cart — delete all food orders
          try {
            await Promise.all(
              orders.map((item) =>
                apiClient.delete(`/food-order/${item.order_id}`)
              )
            );
          } catch (err) {
            console.error("Failed to clear cart:", err);
          }

          setSuccess(result);
          onSuccess?.(result);
        } else {
          setError(result.payment?.ErrorMessage || "Payment failed. Please try again.");
        }
      } else {
        // Regular booking flow (activity + food)
        const res = await apiClient.post("/booking", {
          user_name: user?.username || "guest",
          user_email: trimmedEmail,
          activity_id: bookingActivity?.id,
          start_time: bookingSlot?.start?.toISOString?.() || bookingSlot?.start,
          end_time: bookingSlot?.end?.toISOString?.() || bookingSlot?.end,
          food_items: foodItems,
          payment_method: "card",
          voucher_code: voucher?.code || "",
        });

        const result = res.data;

        if (result.success && result.payment?.Success) {
          clearInterval(timerRef.current);

          // Clear cart — delete all food orders that were part of this booking
          try {
            await Promise.all(
              orders.map((item) =>
                apiClient.delete(`/food-order/${item.order_id}`)
              )
            );
          } catch (err) {
            console.error("Failed to clear cart:", err);
          }

          setSuccess(result);
          onSuccess?.(result);
        } else {
          setError(result.payment?.ErrorMessage || "Payment failed. Please try again.");
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object") {
        setError(detail?.message || "Payment failed. Please try again.");
      } else {
        setError(detail || err.message || "Payment failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <style>{styles}</style>
        <div className="pf-success">
          <div className="pf-success-icon">🎨</div>
          <h3 className="pf-success-title">Booking Confirmed!</h3>
          <p style={{ color: "#4a7c4a", fontSize: "0.92rem", margin: 0 }}>
            Your booking is confirmed. A confirmation email has been sent. See you at the studio!
          </p>
          <span className="pf-success-id">
            {success.payment?.PaymentIntentId || success.booking?.booking?.id}
          </span>
          <div style={{ fontSize: "0.88rem", color: "#4a7c4a" }}>
            Amount charged:{" "}
            <strong>${(success.total_amount).toFixed(2)} {currency.toUpperCase()}</strong>
            {saving > 0 && <span style={{ marginLeft: 8 }}>· Saved ${(saving / 100).toFixed(2)}</span>}
          </div>
        </div>
      </>
    );
  }

  if (expired) {
    return (
      <>
        <style>{styles}</style>
        <div className="pf-expired">
          <div className="pf-expired-icon">⏱️</div>
          <h3 className="pf-expired-title">Session Expired</h3>
          <p style={{ color: "#7a1a1a", fontSize: "0.92rem", margin: 0 }}>
            Your payment session has expired and has been cancelled. Please start a new session.
          </p>
          <button className="pf-refresh-btn" onClick={() => window.location.reload()}>
            Start New Session
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="pf-card">
        <div>
          <h3 className="pf-section-title">Payment Details</h3>
          <div className="pf-divider" />
        </div>

        {/* Amount display */}
        <div className="pf-amount-display">
          <div>
            <div className="pf-amount-label">Total Due</div>
            <div className="pf-amount-value">
              <span className="pf-amount-currency">$</span>
              {(finalAmount / 100).toFixed(2)}
            </div>
            <div className="pf-amount-note">{currency.toUpperCase()}</div>
          </div>
          {saving > 0 && (
            <div className="pf-savings-badge">
              🏷️ Saved ${(saving / 100).toFixed(2)}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className={`pf-timer-bar-wrap ${isUrgent ? "urgent" : ""}`}>
          <span>{isUrgent ? "⚠️" : "⏱"}</span>
          <span>
            {initializing ? "Starting session..." : `Session expires in ${formatTime(secondsLeft)}`}
          </span>
          <div className="pf-timer-track">
            <div className={`pf-timer-fill ${isUrgent ? "urgent" : ""}`} style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        {/* Session reference */}
        {!initializing && paymentIntentId && (
          <div className="pf-session-ref">
            <span>🔖</span>
            <span>Session ref: <strong style={{ color: "#7d6f5e" }}>{paymentIntentId}</strong></span>
          </div>
        )}

        {bookingSlot?.start && bookingSlot?.end && (
          <div className="pf-session-ref">
            <span>🗓️</span>
            <span>
              Booking time:{" "}
              <strong style={{ color: "#7d6f5e" }}>
                {formatSingaporeRange(bookingSlot.start, bookingSlot.end)}
              </strong>
            </span>
          </div>
        )}

        {/* Voucher */}
        <VoucherInput originalAmount={amount} onVoucherApplied={(v) => { setVoucher(v); onVoucherApplied?.(v); }} />

        <div className="pf-separator" />

        {initializing ? (
          <div className="pf-initializing">
            <span>⏳</span>
            <span>Setting up your payment session…</span>
          </div>
        ) : (
          <>
            <div className="pf-field-group">
              <span className="pf-label">Confirmation Email</span>
              <input
                className="pf-input"
                type="email"
                placeholder="Enter your email address"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={loading || secondsLeft === 0}
                required
              />
            </div>

            <div className="pf-field-group">
              <span className="pf-label">Card Details</span>
              <div className={`pf-card-element-wrap ${cardFocused ? "focused" : ""}`}>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "15px",
                        fontFamily: "'DM Sans', sans-serif",
                        color: "#241c17",
                        "::placeholder": { color: "#b7ab9c" },
                      },
                      invalid: { color: "#b83232" },
                    },
                    hidePostalCode: true,
                  }}
                  onFocus={() => setCardFocused(true)}
                  onBlur={() => setCardFocused(false)}
                />
              </div>
            </div>

            <div className="pf-test-note">
              🧪 <strong>Test mode:</strong> Use <strong>4242 4242 4242 4242</strong> to succeed, <strong>4000 0000 0000 0002</strong> to decline.
            </div>

            <div className="pf-separator" />

            <div className="pf-summary">
              <div className="pf-summary-row">
                <span>Subtotal</span>
                <span>${(amount / 100).toFixed(2)}</span>
              </div>
              {saving > 0 && (
                <div className="pf-summary-row discount">
                  <span>Voucher ({voucher?.code})</span>
                  <span>−${(saving / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="pf-summary-row total">
                <span>Total</span>
                <span>${(finalAmount / 100).toFixed(2)} {currency.toUpperCase()}</span>
              </div>
            </div>

            {error && <div className="pf-error-box">⚠️ {error}</div>}

            <button
              className="pf-submit-btn"
              onClick={handleSubmit}
              disabled={loading || secondsLeft === 0 || initializing}
            >
              {loading ? <>Processing…</> : <>🔒 Pay ${(finalAmount / 100).toFixed(2)} {currency.toUpperCase()}</>}
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function PaymentForm(props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner {...props} />
    </Elements>
  );
}
