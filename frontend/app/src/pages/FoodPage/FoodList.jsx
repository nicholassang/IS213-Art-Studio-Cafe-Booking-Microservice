import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  .menu-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .menu-hero {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 40px 36px;
    margin-bottom: 28px;
    box-shadow: var(--shadow);
  }

  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .menu-header-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .menu-eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
  }

  .menu-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.1rem;
    color: var(--text);
    font-weight: 700;
    margin: 0;
    line-height: 1.05;
  }

  .menu-subtitle {
    margin: 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.8;
    max-width: 720px;
  }

  .menu-cart-btn {
    padding: 12px 18px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .menu-cart-btn:hover {
    background: var(--text);
    color: #fff;
  }

  .menu-search-wrap {
    position: relative;
    max-width: 460px;
  }

  .menu-search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #9d9285;
    font-size: 0.95rem;
    pointer-events: none;
  }

  .menu-search {
    width: 100%;
    padding: 14px 18px 14px 42px;
    border: 1.5px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    background: rgba(255,255,255,0.92);
    color: var(--text);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .menu-search::placeholder { color: #b7ab9c; }

  .menu-search:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }

  .menu-filter-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .menu-filter-btn {
    padding: 9px 20px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    font-size: 0.88rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .menu-filter-btn:hover {
    border-color: var(--accent);
    color: var(--accent-deep);
  }

  .menu-filter-btn.active {
    background: var(--text);
    border-color: var(--text);
    color: #fff;
    font-weight: 600;
  }

  .menu-results-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 10px 0 22px;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .menu-results-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 8px 14px;
    font-weight: 500;
  }

  .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 26px;
  }

  .menu-empty, .menu-loading {
    color: var(--muted);
    font-size: 0.98rem;
    grid-column: 1 / -1;
    padding: 52px 20px;
    text-align: center;
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: 20px;
  }

  .menu-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    box-shadow: 0 6px 18px rgba(36, 28, 23, 0.05);
  }

  .menu-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(36, 28, 23, 0.1);
    border-color: #dcc8ae;
  }

  .menu-card-img-wrap {
    position: relative;
    overflow: hidden;
  }

  .menu-card-img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }

  .menu-card:hover .menu-card-img {
    transform: scale(1.04);
  }

  .menu-card-category {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: inline-block;
    background: rgba(255, 252, 247, 0.92);
    backdrop-filter: blur(8px);
    color: #6d5b47;
    border: 1px solid rgba(220, 204, 182, 0.9);
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .menu-card-body {
    padding: 18px 18px 20px;
  }

  .menu-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .menu-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    line-height: 1.2;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }

  .menu-card-desc {
    font-size: 0.92rem;
    color: var(--muted);
    line-height: 1.7;
    margin: 0 0 14px;
  }

  .menu-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    border-top: 1px solid #f0e6d9;
  }

  .menu-card-price {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
  }

  .menu-card-price span {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .menu-card-arrow {
    font-size: 0.82rem;
    color: #8d7f70;
    background: #f5ede2;
    padding: 8px 12px;
    border-radius: 999px;
    transition: background 0.2s, color 0.2s, transform 0.2s;
  }

  .menu-card:hover .menu-card-arrow {
    background: var(--text);
    color: #fff;
    transform: translateX(2px);
  }

  @media (max-width: 768px) {
    .menu-hero { padding: 28px 22px; border-radius: 22px; }
    .menu-title { font-size: 2.3rem; }
    .menu-grid { grid-template-columns: 1fr; }
  }
`;

const categories = ["All", "Main Meal", "Dessert", "Cake", "Drink"];

export default function FoodMenu() {
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const startTime = Date.now();
    apiClient.get("/menu")
    .then(res => {
      setMenu(res.data.menu ?? []);
      setLoading(false);
    })
    .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = menu
    .filter(i => active === "All" || i.category === active)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="menu-root">

          {/* Hero */}
          <section className="menu-hero">
            <div className="menu-header">
              <div className="menu-header-left">
                <span className="menu-eyebrow">Art Café Experiences</span>
                <h1 className="menu-title">Food & Beverage 🍽️</h1>
                <p className="menu-subtitle">
                  Discover warm, handcrafted dishes and beverages designed for a calm café-inspired experience — from artisan mains to sweet indulgences you can enjoy with friends.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="menu-cart-btn" onClick={() => navigate("/")}>
                🏠 Home
                </button>
                <button className="menu-cart-btn" onClick={() => navigate("/cart")}>
                  🛒 View Cart
                </button>
              </div>
            </div>

            <div className="menu-search-wrap">
              <span className="menu-search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="menu-search"
              />
            </div>
          </section>

          {/* Filter */}
          <div className="menu-filter-bar">
            {categories.map(cat => (
              <button
                key={cat}
                className={`menu-filter-btn ${active === cat ? "active" : ""}`}
                onClick={() => setActive(cat)}
              >{cat}</button>
            ))}
          </div>

          {/* Results bar */}
          <div className="menu-results-bar">
            <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            <span className="menu-results-pill">Curated for a cozy café feel</span>
          </div>

          {/* Grid */}
          <div className="menu-grid">
            {loading ? (
              <div className="menu-loading">Loading menu… 🍽️</div>
            ) : filtered.length === 0 ? (
              <div className="menu-empty">No items found for your search.</div>
            ) : (
              filtered.map(item => (
                <div
                  key={item.id}
                  className="menu-card"
                  onClick={() => navigate(`/menu/${item.name.toLowerCase().replace(/\s+/g, "-")}`)}
                >
                  <div className="menu-card-img-wrap">
                    <img src={item.image_url} alt={item.name} className="menu-card-img" />
                    <span className="menu-card-category">{item.category}</span>
                  </div>
                  <div className="menu-card-body">
                    <div className="menu-card-top">
                      <h3 className="menu-card-name">{item.name}</h3>
                    </div>
                    <p className="menu-card-desc">{item.description?.slice(0, 95)}...</p>
                    <div className="menu-card-footer">
                      <div className="menu-card-price">
                        ${item.price} 
                      </div>
                      <span className="menu-card-arrow">View →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}