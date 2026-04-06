import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import apiClient from "../../services/apiClient";

export default function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState("");
  const [bookingActivity, setBookingActivity] = useState(
    location.state?.bookingActivity ||
    JSON.parse(sessionStorage.getItem("bookingActivity") || "null")
  );
  const [bookingSlot, setBookingSlot] = useState(
    location.state?.bookingSlot ||
    JSON.parse(sessionStorage.getItem("bookingSlot") || "null")
  );

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
    apiClient.get("/food-order/all")
      .then(res => {
        const allOrders = res.data.orders ?? [];
        // only show the manual order
        const manualOrders = allOrders.filter(o => !o.comment?.startsWith("booking:"));
        setOrders(manualOrders);
        setLoading(false);
      })
      .catch(err => { console.error("Fetch error:", err); setLoading(false); });
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

  const handleUpdateComment = async (order_id) => {
    await apiClient.put(`/food-order/${order_id}/comment`, { comment: editingComment });
    setOrders((prev) =>
      prev.map((o) => (o.order_id === order_id ? { ...o, comment: editingComment } : o))
    );
    setEditingCommentId(null);
    setEditingComment("");
  };

  const startEditingComment = (order_id, currentComment) => {
    setEditingCommentId(order_id);
    setEditingComment(currentComment || "");
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
            <div className="cart-hero-actions">
              <button className="cart-home-btn" onClick={() => navigate("/")}>
                🏠 Home
              </button>
              <button
                className="cart-back-btn"
                onClick={() =>
                  navigate("/menu", { state: { bookingActivity, bookingSlot } })
                }
              >
                ← Add More Food
              </button>
            </div>
          </section>

          {/* Booking Summary Card */}
          {bookingActivity && (
            <div className="cart-booking-card">
              <div className="cart-booking-card-header">
                <div className="cart-booking-card-title-row">
                  <span className="cart-booking-label">🎨 Your Booking</span>
                  <div className="cart-booking-actions">
                    <button
                      className="cart-booking-edit-btn"
                      onClick={() => navigate(`/activity/${bookingActivity.id}`)}
                    >
                      View Activity
                    </button>
                    <button
                      className="cart-booking-edit-btn cart-booking-edit-btn--primary"
                      onClick={() =>
                        navigate("/booking", {
                          state: { activity: bookingActivity },
                        })
                      }
                    >
                      ✏️ Edit Time Slot
                    </button>
                    <button
                      className="cart-booking-edit-btn cart-booking-remove-btn"
                      onClick={async () => {
                        sessionStorage.removeItem("bookingActivity");
                        sessionStorage.removeItem("bookingSlot");
                        setBookingActivity(null);
                        setBookingSlot(null);
                      }}
                    >
                      🗑️ Remove Booking
                    </button>
                  </div>
                </div>
              </div>

              <div className="cart-booking-body">
                {/* Activity image + info */}
                <div className="cart-booking-activity-row">
                  {bookingActivity.image && (
                    <img
                      src={bookingActivity.image}
                      alt={bookingActivity.name}
                      className="cart-booking-activity-img"
                    />
                  )}
                  <div className="cart-booking-activity-info">
                    <p className="cart-booking-activity-name">
                      {bookingActivity.name}
                    </p>
                    {bookingActivity.category && (
                      <p className="cart-booking-activity-meta">
                        {bookingActivity.category}
                        {bookingActivity.level ? ` · ${bookingActivity.level}` : ""}
                        {bookingActivity.duration ? ` · ${bookingActivity.duration}` : ""}
                      </p>
                    )}
                    <p className="cart-booking-activity-price">
                      ${activityPrice} / person
                    </p>
                  </div>
                </div>

                {/* Time slot pill */}
                {bookingSlot && (
                  <div className="cart-booking-slot-pill">
                    <span className="cart-booking-slot-icon">🕐</span>
                    <div>
                      <p className="cart-booking-slot-label">Time Slot</p>
                      <p className="cart-booking-slot-value">
                        {new Date(bookingSlot.start).toLocaleDateString("en-SG", {
                          timeZone: "UTC",
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {new Date(bookingSlot.start).toLocaleTimeString("en-SG", {
                          timeZone: "UTC",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                        {" — "}
                        {new Date(bookingSlot.end).toLocaleTimeString("en-SG", {
                          timeZone: "UTC",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!bookingActivity && orders.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🍽️</div>
              <p className="cart-empty-text">Your cart is empty</p>
              <button
                className="cart-browse-btn"
                onClick={() => navigate("/menu")}
              >
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
                      onClick={() =>
                        navigate("/menu", { state: { bookingActivity, bookingSlot } })
                      }
                    >
                      Browse menu →
                    </span>
                  </div>
                ) : (
                  orders.map((item) => (
                    <div key={item.order_id} className="cart-item">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="cart-item-img"
                      />
                      <div>
                        <h3 className="cart-item-name">{item.name}</h3>
                        {editingCommentId === item.order_id ? (
                          <div className="cart-comment-edit">
                            <textarea
                              className="cart-comment-input"
                              value={editingComment}
                              onChange={(e) => setEditingComment(e.target.value)}
                              placeholder="Special request..."
                              rows={2}
                            />
                            <div className="cart-comment-actions">
                              <button
                                className="cart-comment-save-btn"
                                onClick={() => handleUpdateComment(item.order_id)}
                              >
                                ✓ Save
                              </button>
                              <button
                                className="cart-comment-cancel-btn"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingComment("");
                                }}
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="cart-comment-display">
                            {item.comment ? (
                              <p className="cart-item-comment">"{item.comment}"</p>
                            ) : (
                              <p className="cart-item-comment cart-no-comment">No special request</p>
                            )}
                            <button
                              className="cart-edit-comment-btn"
                              onClick={() => startEditingComment(item.order_id, item.comment)}
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}
                        <p className="cart-item-price">${item.price} each</p>
                      </div>
                      <div className="cart-item-controls">
                        <div className="cart-qty-wrap">
                          <button
                            className="cart-qty-btn"
                            onClick={() =>
                              handleUpdateQuantity(item.order_id, item.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span className="cart-qty-val">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() =>
                              handleUpdateQuantity(item.order_id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <span className="cart-item-subtotal">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          className="cart-remove-btn"
                          onClick={() => handleDelete(item.order_id)}
                        >
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
                    <span className="cart-summary-row-name">
                      🎨 {bookingActivity.name}
                    </span>
                    <span className="cart-summary-row-price">
                      ${activityPrice.toFixed(2)}
                    </span>
                  </div>
                )}

                {orders.map((item) => (
                  <div key={item.order_id} className="cart-summary-row">
                    <span className="cart-summary-row-name">
                      {item.name}×{item.quantity}
                    </span>
                    <span className="cart-summary-row-price">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                <div className="cart-summary-divider" />

                <div className="cart-summary-total-row">
                  <span className="cart-summary-total-label">Total</span>
                  <span className="cart-summary-total-price">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                <button className="cart-place-btn" onClick={handleProceedToPayment}>
                  Proceed to Payment →
                </button>

                <button
                  className="cart-back-btn"
                  style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
                  onClick={() =>
                    navigate("/menu", { state: { bookingActivity, bookingSlot } })
                  }
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

  .cart-hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .cart-home-btn {
    padding: 12px 20px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .cart-home-btn:hover {
    background: var(--text);
    color: #fff;
    border-color: var(--text);
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

  /* Booking Card */
  .cart-booking-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    margin-bottom: 28px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }

  .cart-booking-card-header {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border-bottom: 1px solid var(--line);
    padding: 18px 28px;
  }

  .cart-booking-card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .cart-booking-label {
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
  }

  .cart-booking-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .cart-booking-edit-btn {
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .cart-booking-edit-btn:hover {
    background: var(--surface-2);
    border-color: var(--accent);
  }

  .cart-booking-edit-btn--primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .cart-booking-edit-btn--primary:hover {
    background: var(--accent-deep);
    border-color: var(--accent-deep);
    color: #fff;
  }

  .cart-booking-remove-btn {
    background: #c0504d;
    border-color: #c0504d;
    color: #fff;
  }

  .cart-booking-remove-btn:hover {
    background: #a03030;
    border-color: #a03030;
    color: #fff;
  }

  .cart-booking-body {
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .cart-booking-activity-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .cart-booking-activity-img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .cart-booking-activity-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cart-booking-activity-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .cart-booking-activity-meta {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0;
  }

  .cart-booking-activity-price {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent-deep);
    margin: 0;
  }

  .cart-booking-slot-pill {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px 20px;
  }

  .cart-booking-slot-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .cart-booking-slot-label {
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin: 0 0 4px;
  }

  .cart-booking-slot-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
    font-family: 'DM Sans', sans-serif;
  }

  /* Empty state */
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

  /* Main grid */
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

  .cart-no-comment {
    font-style: normal;
    opacity: 0.6;
  }

  .cart-comment-display {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .cart-edit-comment-btn {
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem;
    white-space: nowrap;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .cart-edit-comment-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .cart-comment-edit {
    margin-bottom: 4px;
    max-width: 280px;
  }

  .cart-comment-input {
    width: 100%;
    padding: 8px 12px;
    border: 1.5px solid var(--line);
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-style: italic;
    resize: vertical;
    margin-bottom: 6px;
    transition: border-color 0.2s ease;
  }

  .cart-comment-input:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--surface);
  }

  .cart-comment-actions {
    display: flex;
    gap: 6px;
  }

  .cart-comment-save-btn {
    padding: 5px 14px;
    border-radius: 999px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    transition: all 0.2s ease;
  }

  .cart-comment-save-btn:hover {
    background: var(--accent-deep);
    border-color: var(--accent-deep);
  }

  .cart-comment-cancel-btn {
    padding: 5px 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    transition: all 0.2s ease;
  }

  .cart-comment-cancel-btn:hover {
    background: var(--surface-2);
    border-color: var(--muted);
    color: var(--text);
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
  .cart-qty-btn:last-child  { border-radius: 0 8px 8px 0; }

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
    .cart-booking-card-title-row { flex-direction: column; align-items: flex-start; }
    .cart-booking-activity-img { width: 56px; height: 56px; }
    .cart-hero-actions { width: 100%; }
  }
`;
