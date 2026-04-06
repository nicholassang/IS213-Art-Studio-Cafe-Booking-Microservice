import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import apiClient from "../../services/apiClient";

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

  .detail-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .detail-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 0.88rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    margin-bottom: 32px;
    transition: all 0.2s ease;
    box-shadow: var(--shadow);
  }

  .detail-back-btn:hover {
    background: var(--text);
    color: #fff;
    border-color: var(--text);
  }

  .detail-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    overflow: hidden;
    box-shadow: var(--shadow);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .detail-img-wrap {
    position: relative;
    overflow: hidden;
    min-height: 560px;
  }

  .detail-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }

  .detail-img-wrap:hover .detail-img {
    transform: scale(1.04);
  }

  .detail-img-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 40%,
      rgba(36, 28, 23, 0.3) 100%
    );
  }

  .detail-img-category {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255, 252, 247, 0.95);
    backdrop-filter: blur(8px);
    color: #6d5b47;
    border: 1px solid rgba(220, 204, 182, 0.9);
    padding: 7px 14px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .detail-right {
    padding: 48px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow-y: auto;
  }

  .detail-eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
    margin-bottom: 12px;
    display: block;
  }

  .detail-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
    font-weight: 700;
    margin: 0 0 14px;
    line-height: 1.1;
    color: var(--text);
  }

  .detail-desc {
    color: var(--muted);
    font-size: 0.97rem;
    line-height: 1.8;
    margin-bottom: 20px;
  }

  .detail-price {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 28px;
  }

  .detail-divider {
    height: 1px;
    background: var(--line);
    margin-bottom: 24px;
  }

  .detail-label {
    display: block;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 10px;
  }

  .detail-textarea {
    width: 100%;
    padding: 13px 16px;
    border: 1.5px solid var(--line);
    border-radius: 14px;
    font-size: 0.93rem;
    font-family: 'DM Sans', sans-serif;
    background: rgba(255,255,255,0.92);
    color: var(--text);
    outline: none;
    resize: none;
    line-height: 1.6;
    margin-bottom: 22px;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .detail-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }

  .detail-textarea::placeholder { color: #b7ab9c; }

  .detail-qty-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 22px;
  }

  .detail-qty-btn {
    width: 42px;
    height: 42px;
    background: var(--surface-2);
    border: 1.5px solid var(--line);
    color: var(--text);
    font-size: 18px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s ease;
  }

  .detail-qty-btn:first-child {
    border-radius: 10px 0 0 10px;
  }

  .detail-qty-btn:last-child {
    border-radius: 0 10px 10px 0;
  }

  .detail-qty-btn:hover {
    background: var(--text);
    color: #fff;
    border-color: var(--text);
  }

  .detail-qty-val {
    width: 56px;
    height: 42px;
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-left: none;
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }

  .detail-total {
    font-size: 0.93rem;
    color: var(--muted);
    margin-bottom: 24px;
  }

  .detail-total strong {
    color: var(--text);
    font-size: 1.15rem;
    font-family: 'Playfair Display', serif;
  }

  .detail-add-btn {
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
  }

  .detail-add-btn:hover:not(:disabled) {
    background: var(--accent-deep);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(36, 28, 23, 0.25);
  }

  .detail-add-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .detail-error-msg {
    color: #c0504d;
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0 0 12px;
    padding: 10px 14px;
    background: #fdf0ef;
    border: 1px solid #f0d0cc;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
  }

  .detail-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: var(--accent-deep);
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .detail-card { grid-template-columns: 1fr; }
    .detail-img-wrap { min-height: 300px; }
    .detail-right { padding: 32px 24px; }
  }
`;

export default function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hasActivity = !!JSON.parse(sessionStorage.getItem("bookingActivity") || "null");

  useEffect(() => {
    apiClient.get(`/menu/name/${id}`)
      .then(res => setItem(res.data))
      .catch(err => console.error("Fetch error:", err));
  }, [id]);

  const handleAddToOrder = async () => {
    if (!hasActivity) {
      setError("Please book an activity before adding food to your order.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.post("/food-order", {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        quantity,
        comment,
      });
      if (res.data.success) {
        setSuccess(true);
        navigate("/menu");
      }
    } catch (err) {
      console.error("Order error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="detail-loading">Loading… 🍽️</div>
      </Layout>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="detail-root">

          {/* Back */}
          <button className="detail-back-btn" onClick={() => navigate("/menu")}>
            ← Back to Menu
          </button>

          {/* Main Card */}
          <div className="detail-card">

            {/* Left — Image */}
            <div className="detail-img-wrap">
              <img src={item.image_url} alt={item.name} className="detail-img" />
              <div className="detail-img-overlay" />
              <span className="detail-img-category">{item.category}</span>
            </div>

            {/* Right — Details */}
            <div className="detail-right">
              <span className="detail-eyebrow">{item.category}</span>
              <h1 className="detail-title">{item.name}</h1>
              <p className="detail-desc">{item.description}</p>
              <p className="detail-price">${item.price}</p>

              <div className="detail-divider" />

              {/* Special Request */}
              <label className="detail-label">Special Request</label>
              <textarea
                className="detail-textarea"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="e.g. no onions, extra sauce..."
                rows={3}
              />

              {/* Quantity */}
              <label className="detail-label">Quantity</label>
              <div className="detail-qty-row">
                <button className="detail-qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <span className="detail-qty-val">{quantity}</span>
                <button className="detail-qty-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>

              {/* Total */}
              <p className="detail-total">
                Total: <strong>${(item.price * quantity).toFixed(2)}</strong>
              </p>

              {/* Add to Order */}
              {!hasActivity && (
                <p className="detail-error-msg">⚠️ You need to book an activity before adding food.</p>
              )}
              {error && (
                <p className="detail-error-msg">{error}</p>
              )}
              <button
                className="detail-add-btn"
                onClick={handleAddToOrder}
                disabled={loading || success || !hasActivity}
              >
                {success ? "✓ Added!" : loading ? "Adding…" : !hasActivity ? "Book an Activity First" : `Add to Order — $${(item.price * quantity).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}