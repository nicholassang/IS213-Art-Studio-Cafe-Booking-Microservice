import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import apiClient from "../../services/apiClient";

export default function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const bookingActivity =
    location.state?.bookingActivity ||
    JSON.parse(sessionStorage.getItem("bookingActivity") || "null");
  const bookingSlot =
    location.state?.bookingSlot ||
    JSON.parse(sessionStorage.getItem("bookingSlot") || "null");

  useEffect(() => {
    if (bookingActivity)
      sessionStorage.setItem("bookingActivity", JSON.stringify(bookingActivity));
    if (bookingSlot)
      sessionStorage.setItem("bookingSlot", JSON.stringify(bookingSlot));
  }, []);

  const foodTotal = orders.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const activityPrice = bookingActivity?.price || 0;
  const totalPrice = foodTotal + activityPrice;

  useEffect(() => {
    apiClient
      .get("/food-order/all")
      .then((res) => {
        setOrders(res.data.orders ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (order_id) => {
    await apiClient.delete(`/food-order/${order_id}`);
    setOrders((prev) => prev.filter((o) => o.order_id !== order_id));
  };

  const handleUpdateQuantity = async (order_id, quantity) => {
    if (quantity < 1) return handleDelete(order_id);
    await apiClient.put(`/food-order/${order_id}/quantity`, { quantity });
    setOrders((prev) =>
      prev.map((o) => (o.order_id === order_id ? { ...o, quantity } : o))
    );
  };

  const handleProceedToPayment = () => {
    navigate("/payment", {
      state: { bookingActivity, bookingSlot, orders, totalPrice },
    });
  };

  if (loading)
    return (
      <>
        <style>{styles}</style>
        <Layout>
          <div className="cart-loading">Loading your order… 🍽️</div>
        </Layout>
      </>
    );

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="cart-root">

          {/* Hero */}
          <section className="cart-hero">
            <div>
              <span className="cart-eyebrow">Checkout</span>
              <h1 className="cart-title">Your Cart 🛒</h1>
            </div>
            <button
              className="cart-back-btn"
              onClick={() =>
                navigate("/menu", { state: { bookingActivity, bookingSlot } })
              }
            >
              ← Add More Food
            </button>
          </section>

          {/* Booking Summary Card */}
          {bookingActivity && (
            <div className="cart-booking-card">
              <span className="cart-booking-label">Your Booking</span>
              <div className="cart-booking-row">
                <div>
                  <p className="cart-booking-field-label">Activity</p>
                  <p className="cart-booking-field-value">{bookingActivity.name}</p>
                </div>
                {bookingSlot && (
                  <div>
                    <p className="cart-booking-field-label">Time Slot</p>
                    <p className="cart-booking-field-value" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem" }}>
                      {new Date(bookingSlot.start).toLocaleString()} —{" "}
                      {new Date(bookingSlot.end).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="cart-booking-field-label">Activity Price</p>
                  <p className="cart-booking-field-value" style={{ color: "var(--accent-deep)" }}>
                    ${activityPrice}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!bookingActivity && orders.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🍽️</div>
              <p className="cart-empty-text">Your cart is empty</p>
              <button className="cart-browse-btn" onClick={() => navigate("/menu")}>
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="cart-grid">

              {/* Order Items */}
              <div className="cart-items">
                {orders.length === 0 ? (
                  <div style={{
                    padding: "32px",
                    textAlign: "center",
                    background: "var(--surface)",
                    border: "1px dashed var(--line)",
                    borderRadius: "20px",
                    color: "var(--muted)",
                    fontSize: "0.95rem",
                  }}>
                    No food added yet.{" "}
                    <span
                      style={{ color: "var(--accent-deep)", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => navigate("/menu", { state: { bookingActivity, bookingSlot } })}
                    >
                      Browse menu →
                    </span>
                  </div>
                ) : (
                  orders.map((item) => (
                    <div key={item.order_id} className="cart-item">
                      <img src={item.image_url} alt={item.name} className="cart-item-img" />
                      <div>
                        <h3 className="cart-item-name">{item.name}</h3>
                        {item.comment && (
                          <p className="cart-item-comment">"{item.comment}"</p>
                        )}
                        <p className="cart-item-price">${item.price} each</p>
                      </div>
                      <div className="cart-item-controls">
                        <div className="cart-qty-wrap">
                          <button className="cart-qty-btn" onClick={() => handleUpdateQuantity(item.order_id, item.quantity - 1)}>−</button>
                          <span className="cart-qty-val">{item.quantity}</span>
                          <button className="cart-qty-btn" onClick={() => handleUpdateQuantity(item.order_id, item.quantity + 1)}>+</button>
                        </div>
                        <span className="cart-item-subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                        <button className="cart-remove-btn" onClick={() => handleDelete(item.order_id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Summary */}
              <div className="cart-summary">
                <h2 className="cart-summary-title">Order Summary</h2>

                {bookingActivity && (
                  <div className="cart-summary-row">
                    <span className="cart-summary-row-name">🎨 {bookingActivity.name}</span>
                    <span className="cart-summary-row-price">${activityPrice.toFixed(2)}</span>
                  </div>
                )}

                {orders.map((item) => (
                  <div key={item.order_id} className="cart-summary-row">
                    <span className="cart-summary-row-name">{item.name} ×{item.quantity}</span>
                    <span className="cart-summary-row-price">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}

                <div className="cart-summary-divider" />

                <div className="cart-summary-total-row">
                  <span className="cart-summary-total-label">Total</span>
                  <span className="cart-summary-total-price">${totalPrice.toFixed(2)}</span>
                </div>

                <button className="cart-place-btn" onClick={handleProceedToPayment}>
                  Proceed to Payment →
                </button>

                <button
                  className="cart-back-btn"
                  style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
                  onClick={() => navigate("/menu", { state: { bookingActivity, bookingSlot } })}
                >
                  + Add More Food
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

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

  .cart-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .cart-hero {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 36px 36px;
    margin-bottom: 28px;
    box-shadow: var(--shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .cart-eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
    display: block;
    margin-bottom: 6px;
  }

  .cart-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.6rem;
    color: var(--text);
    font-weight: 700;
    margin: 0;
    line-height: 1.05;
  }

  .cart-back-btn {
    padding: 12px 20px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    white-space: nowrap;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .cart-back-btn:hover {
    background: var(--text);
    color: #fff;
    border-color: var(--text);
  }

  .cart-booking-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 22px 26px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(36,28,23,0.05);
  }

  .cart-booking-label {
    font-size: 0.74rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
    display: block;
    margin-bottom: 14px;
  }

  .cart-booking-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }

  .cart-booking-field-label {
    font-size: 0.76rem;
    color: var(--muted);
    margin: 0 0 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .cart-booking-field-value {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: var(--text);
    font-weight: 600;
    margin: 0;
  }

  .cart-empty {
    text-align: center;
    padding: 80px 20px;
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: 24px;
    color: var(--muted);
  }

  .cart-empty-icon { font-size: 3.5rem; margin-bottom: 16px; }

  .cart-empty-text {
    font-size: 1.1rem;
    margin-bottom: 24px;
    font-family: 'Playfair Display', serif;
    color: var(--text);
  }

  .cart-browse-btn {
    padding: 14px 32px;
    background: var(--text);
    border: none;
    border-radius: 14px;
    color: #fff;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 0.2s ease;
    box-shadow: 0 6px 20px rgba(36, 28, 23, 0.2);
  }

  .cart-browse-btn:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .cart-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 28px;
    align-items: start;
  }

  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cart-item {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 18px;
    display: grid;
    grid-template-columns: 100px 1fr auto;
    gap: 20px;
    align-items: center;
    box-shadow: 0 4px 12px rgba(36, 28, 23, 0.04);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .cart-item:hover {
    box-shadow: 0 8px 24px rgba(36, 28, 23, 0.08);
    border-color: #dcc8ae;
  }

  .cart-item-img {
    width: 100px;
    height: 80px;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }

  .cart-item-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }

  .cart-item-comment {
    font-size: 0.85rem;
    color: var(--muted);
    font-style: italic;
    margin: 0;
  }

  .cart-item-price {
    font-size: 0.9rem;
    color: var(--accent-deep);
    font-weight: 600;
    margin: 0;
  }

  .cart-item-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  .cart-qty-wrap { display: flex; align-items: center; }

  .cart-qty-btn {
    width: 34px;
    height: 34px;
    background: var(--surface-2);
    border: 1.5px solid var(--line);
    color: var(--text);
    font-size: 16px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s ease;
  }

  .cart-qty-btn:first-child { border-radius: 8px 0 0 8px; }
  .cart-qty-btn:last-child { border-radius: 0 8px 8px 0; }

  .cart-qty-btn:hover {
    background: var(--text);
    color: #fff;
    border-color: var(--text);
  }

  .cart-qty-val {
    width: 44px;
    height: 34px;
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-left: none;
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }

  .cart-item-subtotal {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    font-family: 'Playfair Display', serif;
  }

  .cart-remove-btn {
    background: transparent;
    border: none;
    color: #c0504d;
    cursor: pointer;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    padding: 4px 0;
    transition: color 0.2s;
  }

  .cart-remove-btn:hover { color: #a03030; }

  .cart-summary {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 32px;
    position: sticky;
    top: 24px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .cart-summary-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 24px;
    color: var(--text);
  }

  .cart-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 0.92rem;
  }

  .cart-summary-row-name { color: var(--muted); }
  .cart-summary-row-price { color: var(--text); font-weight: 500; }

  .cart-summary-divider {
    height: 1px;
    background: var(--line);
    margin: 20px 0;
  }

  .cart-summary-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .cart-summary-total-label { font-size: 1rem; font-weight: 600; color: var(--text); }

  .cart-summary-total-price {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text);
  }

  .cart-place-btn {
    width: 100%;
    padding: 17px;
    background: var(--text);
    border: none;
    border-radius: 14px;
    color: #fff;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 6px 20px rgba(36, 28, 23, 0.2);
    margin-bottom: 12px;
  }

  .cart-place-btn:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(36, 28, 23, 0.25);
  }

  .cart-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: var(--accent-deep);
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .cart-grid { grid-template-columns: 1fr; }
    .cart-item { grid-template-columns: 80px 1fr; }
    .cart-item-controls { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; }
  }
`;
