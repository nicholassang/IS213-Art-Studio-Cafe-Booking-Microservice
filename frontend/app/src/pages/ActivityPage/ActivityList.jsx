import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

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

  .list-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .list-hero {
    background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 40px 36px;
    margin-bottom: 28px;
    box-shadow: var(--shadow);
  }

  .list-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 24px;
  }

  .list-eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-deep);
    font-weight: 700;
  }

  .list-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.1rem;
    color: var(--text);
    font-weight: 700;
    margin: 0;
    line-height: 1.05;
  }

  .list-subtitle {
    margin: 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.8;
    max-width: 720px;
  }

  .list-search-wrap {
    position: relative;
    max-width: 460px;
  }

  .list-search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #9d9285;
    font-size: 0.95rem;
    pointer-events: none;
  }

  .list-search {
    width: 100%;
    padding: 14px 18px 14px 42px;
    border: 1.5px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    background: rgba(255,255,255,0.92);
    color: var(--text);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    box-sizing: border-box;
  }

  .list-search::placeholder {
    color: #b7ab9c;
  }

  .list-search:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }

  .list-results-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 10px 0 22px;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .list-results-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 8px 14px;
    font-weight: 500;
  }

  .list-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 26px;
  }

  .list-empty,
  .list-loading {
    color: var(--muted);
    font-size: 0.98rem;
    grid-column: 1 / -1;
    padding: 52px 20px;
    text-align: center;
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: 20px;
  }

  .list-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    box-shadow: 0 6px 18px rgba(36, 28, 23, 0.05);
  }

  .list-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(36, 28, 23, 0.1);
    border-color: #dcc8ae;
  }

  .list-card-img-wrap {
    position: relative;
    overflow: hidden;
  }

  .list-card-img {
    width: 100%;
    height: 250px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }

  .list-card:hover .list-card-img {
    transform: scale(1.04);
  }

  .list-card-category {
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

  .list-card-body {
    padding: 18px 18px 20px;
  }

  .list-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .list-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    line-height: 1.2;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }

  .list-card-rating {
    flex-shrink: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    background: #f8f2e8;
    border: 1px solid var(--line);
    padding: 6px 10px;
    border-radius: 999px;
  }

  .list-card-desc {
    font-size: 0.92rem;
    color: var(--muted);
    line-height: 1.7;
    margin: 0 0 14px;
  }

  .list-card-meta {
    font-size: 0.86rem;
    color: #8b8073;
    margin-bottom: 16px;
  }

  .list-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    border-top: 1px solid #f0e6d9;
  }

  .list-card-price {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
  }

  .list-card-price span {
    font-weight: 400;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .list-card-arrow {
    font-size: 0.82rem;
    color: #8d7f70;
    background: #f5ede2;
    padding: 8px 12px;
    border-radius: 999px;
    transition: background 0.2s, color 0.2s, transform 0.2s;
  }

  .list-card:hover .list-card-arrow {
    background: var(--text);
    color: #fff;
    transform: translateX(2px);
  }

  @media (max-width: 768px) {
    .list-hero {
      padding: 28px 22px;
      border-radius: 22px;
    }

    .list-title {
      font-size: 2.3rem;
    }

    .list-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const startTime = Date.now();

    fetch("http://localhost:8000/getAllActivities")
      .then(res => res.json())
      .then(data => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(400 - elapsed, 0);

        setTimeout(() => {
          setActivities(data.activities || []);
          setLoading(false);
        }, delay);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{styles}</style>

      <Layout>
        <div className="list-root">
          <section className="list-hero">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "24px",
              }}
            >
              <div className="list-header" style={{ marginBottom: 0 }}>
                <span className="list-eyebrow">Art Café Experiences</span>
                <h1 className="list-title">Create, Sip & Slow Down 🎨</h1>
                <p className="list-subtitle">
                  Discover warm, hands-on art sessions designed for a calm café-inspired experience —
                  from painting and craft workshops to creative moments you can enjoy with friends.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate("/")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "999px",
                    border: "1px solid #e6ddd1",
                    background: "#fffaf4",
                    color: "#241c17",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ⌂ Home
                </button>

                <button
                  onClick={() => navigate("/saved-experiences")}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "999px",
                    border: "1px solid #e6ddd1",
                    background: "#fffdf9",
                    color: "#241c17",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  ❤️ Saved Experiences
                </button>
              </div>
            </div>

            <div className="list-search-wrap">
              <span className="list-search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="list-search"
              />
            </div>
          </section>

          <div className="list-results-bar">
            <span>{filteredActivities.length} experience{filteredActivities.length !== 1 ? "s" : ""}</span>
            <span className="list-results-pill">Curated for a cozy studio feel</span>
          </div>

          <div className="list-grid">
            {loading ? (
              <div className="list-loading">Loading experiences… 🎨</div>
            ) : filteredActivities.length === 0 ? (
              <div className="list-empty">No activities found for your search.</div>
            ) : (
              filteredActivities.map(activity => (
                <div
                  key={activity.id}
                  className="list-card"
                  onClick={() => navigate(`/activity/${activity.id}`)}
                >
                  <div className="list-card-img-wrap">
                    <img
                      src={activity.image}
                      alt={activity.name}
                      className="list-card-img"
                    />
                    <span className="list-card-category">{activity.category}</span>
                  </div>

                  <div className="list-card-body">
                    <div className="list-card-top">
                      <h3 className="list-card-name">{activity.name}</h3>
                      <span className="list-card-rating">⭐ {activity.rating}</span>
                    </div>

                    <p className="list-card-desc">
                      {activity.description?.slice(0, 95)}...
                    </p>

                    <div className="list-card-meta">
                      {activity.duration} • {activity.level}
                    </div>

                    <div className="list-card-footer">
                      <div className="list-card-price">
                        ${activity.price} <span>/ person</span>
                      </div>
                      <span className="list-card-arrow">View →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div >
      </Layout >
    </>
  );
}