import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import PaymentForm from "../../components/PaymentForm";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

  :root {
    --bg: #faf7f2;
    --surface: #fffdf9;
    --surface-2: #f5efe6;
    --text: #241c17;
    --muted: #7d7468;
    --line: #e6ddd1;
    --accent: #c8a97e;
    --accent-deep: #b38d5e;
    --shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
  }

  .pay-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .pay-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    font-weight: 600;
    color: #6f6558;
    background: #fffaf4;
    border: 1px solid var(--line);
    padding: 10px 16px;
    border-radius: 999px;
    cursor: pointer;
    margin-bottom: 28px;
    transition: background 0.2s, color 0.2s, transform 0.2s;
    letter-spacing: 0.02em;
  }

  .pay-back:hover {
    background: var(--text);
    color: #fff;
    transform: translateY(-1px);
  }

  .pay-hero {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 36px 34px;
    margin-bottom: 32px;
    box-shadow: var(--shadow);
  }

  .pay-eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
    margin-bottom: 10px;
    display: block;
  }

  .pay-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.6rem;
    color: var(--text);
    font-weight: 700;
    margin: 0 0 10px;
    line-height: 1.08;
  }

  .pay-subtitle {
    color: var(--muted);
    font-size: 0.97rem;
    line-height: 1.75;
    margin: 0;
    max-width: 560px;
  }

  .pay-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 32px;
    align-items: start;
  }

  .pay-booking-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 30px 28px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .pay-booking-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    color: var(--text);
    margin: 0 0 4px;
    font-weight: 700;
  }

  .pay-booking-divider {
    width: 44px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 6px;
  }

  .pay-booking-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 14px 0;
    border-bottom: 1px solid #f0e6d9;
    gap: 16px;
  }

  .pay-booking-item:last-child {
    border-bottom: none;
  }

  .pay-booking-item-label {
    font-size: 0.74rem;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #a29789;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .pay-booking-item-value {
    font-size: 0.96rem;
    color: var(--text);
    font-weight: 500;
    line-height: 1.4;
  }

  .pay-secure-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #9e9284;
    padding: 10px 14px;
    background: #f8f4ee;
    border: 1px solid #ece0d0;
    border-radius: 12px;
  }

  @media (max-width: 860px) {
    .pay-grid {
      grid-template-columns: 1fr;
    }

    .pay-title {
      font-size: 2rem;
    }

    .pay-hero {
      padding: 26px 22px;
    }
  }
`;

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Accept booking details passed via navigation state
  const booking = location.state?.booking || {
    activity: "Art Session",
    date: "To be confirmed",
    duration: "2 hours",
    amount: 5000, // in cents = $50.00
    currency: "sgd",
  };

const handleSuccess = (result) => {
  // Stay on page — PaymentForm already shows success state
};

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="pay-root">
          <button className="pay-back" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <div className="pay-hero">
            <span className="pay-eyebrow">Secure Checkout</span>
            <h1 className="pay-title">Complete Your Booking 🎨</h1>
            <p className="pay-subtitle">
              You're almost there! Review your booking details and complete payment to secure your spot at the studio.
            </p>
          </div>

          <div className="pay-grid">
            {/* Booking summary */}
            <div className="pay-booking-card">
              <div>
                <h3 className="pay-booking-title">Booking Summary</h3>
                <div className="pay-booking-divider" />
              </div>

              <div>
                <div className="pay-booking-item">
                  <div>
                    <div className="pay-booking-item-label">Activity</div>
                    <div className="pay-booking-item-value">{booking.activity}</div>
                  </div>
                </div>

                <div className="pay-booking-item">
                  <div>
                    <div className="pay-booking-item-label">Date & Time</div>
                    <div className="pay-booking-item-value">{booking.date}</div>
                  </div>
                </div>

                <div className="pay-booking-item">
                  <div>
                    <div className="pay-booking-item-label">Duration</div>
                    <div className="pay-booking-item-value">{booking.duration}</div>
                  </div>
                </div>

                <div className="pay-booking-item">
                  <div>
                    <div className="pay-booking-item-label">Amount</div>
                    <div className="pay-booking-item-value" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                      ${(booking.amount / 100).toFixed(2)} {booking.currency?.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pay-secure-badge">
                🔒 Payments are processed securely via Stripe. Your card details are never stored.
              </div>
            </div>

            {/* Payment form */}
            <PaymentForm
              amount={booking.amount}
              currency={booking.currency}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
