import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  .detail-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .detail-top-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .detail-home,
  .detail-back {
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
    transition: background 0.2s, color 0.2s, transform 0.2s;
    letter-spacing: 0.02em;
  }

  .detail-home:hover,
  .detail-back:hover {
    background: var(--text);
    color: #fff;
    transform: translateY(-1px);
  }

  .detail-grid {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 54px;
    align-items: start;
  }

  .detail-image-wrap {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }

  .detail-image {
    width: 100%;
    height: 520px;
    object-fit: cover;
    display: block;
  }

  .detail-image-caption {
    position: absolute;
    left: 18px;
    bottom: 18px;
    background: rgba(255, 251, 245, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(228, 216, 198, 0.95);
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.76rem;
    color: #64594b;
    letter-spacing: 0.08em;
    font-weight: 700;
    text-transform: uppercase;
  }

  .detail-info-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 34px 30px;
    box-shadow: var(--shadow);
  }

  .detail-badge {
    display: inline-block;
    background: #f4ece1;
    color: #7a664d;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .detail-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    line-height: 1.08;
    color: var(--text);
    margin: 0 0 16px;
    font-weight: 700;
  }

  .detail-divider {
    width: 54px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 20px;
  }

  .detail-desc {
    color: var(--muted);
    line-height: 1.8;
    font-size: 0.98rem;
    margin: 0 0 26px;
    font-weight: 400;
  }

  .detail-meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .detail-meta-item {
    background: #fcf8f2;
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .detail-meta-label {
    font-size: 0.68rem;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #a29789;
    font-weight: 700;
  }

  .detail-meta-value {
    font-size: 0.96rem;
    color: var(--text);
    font-weight: 600;
    line-height: 1.4;
  }

  .detail-price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 24px;
  }

  .detail-price-currency {
    font-size: 1.1rem;
    color: var(--accent-deep);
    font-weight: 700;
  }

  .detail-price-amount {
    font-family: 'Playfair Display', serif;
    font-size: 2.8rem;
    color: var(--text);
    line-height: 1;
    font-weight: 700;
  }

  .detail-price-note {
    font-size: 0.88rem;
    color: #9e9284;
    margin-left: 6px;
  }

  .detail-cta-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .detail-cta {
    flex: 1;
    min-width: 180px;
    padding: 15px 22px;
    background: var(--text);
    color: #faf8f5;
    border: none;
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: background 0.2s, transform 0.15s;
  }

  .detail-cta:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .detail-secondary-btn {
    flex: 1;
    min-width: 180px;
    padding: 15px 22px;
    background: #fffaf3;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, border-color 0.2s;
  }

  .detail-secondary-btn:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .detail-secondary-btn.saved {
    background: #f4ece1;
    border-color: #d8c4a5;
    color: #7a664d;
  }

  .detail-sections {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
    margin-top: 42px;
  }

  .detail-section-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 24px 22px;
    box-shadow: 0 8px 20px rgba(36, 28, 23, 0.05);
  }

  .detail-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.35rem;
    margin: 0 0 14px;
    color: var(--text);
  }

  .detail-section-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .detail-section-list li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 12px;
    color: var(--muted);
    line-height: 1.75;
    font-size: 0.94rem;
  }

  .detail-section-list li::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    position: absolute;
    left: 0;
    top: 11px;
  }

  .detail-skeleton {
    height: 520px;
    border-radius: 24px;
    background: linear-gradient(90deg, #f2ece4 25%, #f8f3ec 37%, #f2ece4 63%);
    background-size: 400% 100%;
    animation: shimmer 1.4s infinite;
  }

  .detail-toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    background: #241c17;
    color: #fff;
    padding: 12px 18px;
    border-radius: 999px;
    font-size: 0.92rem;
    font-weight: 600;
    box-shadow: 0 12px 24px rgba(0,0,0,0.16);
    z-index: 1000;
  }

  @keyframes shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }

  @media (max-width: 980px) {
    .detail-grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .detail-sections {
      grid-template-columns: 1fr;
    }

    .detail-image {
      height: 420px;
    }
  }

  @media (max-width: 640px) {
    .detail-title {
      font-size: 2.2rem;
    }

    .detail-meta {
      grid-template-columns: 1fr;
    }

    .detail-info-card {
      padding: 24px 20px;
    }
  }
`;

export default function ActivityDetail() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const userName = "demo_user";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivity = fetch(`http://localhost:8000/activities/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setActivity(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Activity fetch error:", err);
        setLoading(false);
      });

    const fetchSavedStatus = fetch(`http://localhost:8000/saved-activities/${userName}/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSaved(data.saved);
      })
      .catch((err) => {
        console.error("Saved status fetch error:", err);
      });

    Promise.all([fetchActivity, fetchSavedStatus]).catch(() => { });
  }, [id, userName]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 2500);

    return () => clearTimeout(timer);
  }, [message]);

  const handleBookNow = () => {
    navigate("/booking", {
      state: {
        activity,
      },
    });
  };

  const handleSaveExperience = async () => {
    if (saving) return;

    setSaving(true);

    try {
      if (!saved) {
        const res = await fetch("http://localhost:8000/saved-activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_name: userName,
            activity_id: id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Failed to save activity");
        }

        setSaved(true);
        setMessage("Saved to your experiences ✨");
      } else {
        const res = await fetch(`http://localhost:8000/saved-activities/${userName}/${id}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Failed to unsave activity");
        }

        setSaved(false);
        setMessage("Removed from saved ❌");
      }
    } catch (error) {
      console.error("Error saving experience:", error);
      alert("Could not update saved experience. Check backend or Supabase policy.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !activity) {
    return (
      <>
        <style>{styles}</style>
        <Layout>
          <div className="detail-grid">
            <div className="detail-skeleton" />
            <div className="detail-skeleton" style={{ height: "420px" }} />
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="detail-root">
          {message && <div className="detail-toast">{message}</div>}

          <div className="detail-top-actions">
            <button className="detail-home" onClick={() => navigate("/")}>
              ⌂ Home
            </button>

            <button className="detail-back" onClick={() => navigate("/activities")}>
              ← Back to activities
            </button>
          </div>

          <div className="detail-grid">
            <div className="detail-image-wrap">
              <img
                src={activity.image}
                alt={activity.name}
                className="detail-image"
              />
              <span className="detail-image-caption">{activity.category}</span>
            </div>

            <div className="detail-info-card">
              <span className="detail-badge">{activity.category}</span>
              <h1 className="detail-title">{activity.name}</h1>
              <div className="detail-divider" />
              <p className="detail-desc">{activity.description}</p>

              <div className="detail-meta">
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Duration</span>
                  <span className="detail-meta-value">{activity.duration}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Level</span>
                  <span className="detail-meta-value">{activity.level}</span>
                </div>

                <div className="detail-meta-item">
                  <span className="detail-meta-label">Rating</span>
                  <span className="detail-meta-value">
                    ⭐ {activity.rating} ({activity.reviews} reviews)
                  </span>
                </div>
              </div>

              <div className="detail-price-row">
                <span className="detail-price-currency">$</span>
                <span className="detail-price-amount">{activity.price}</span>
                <span className="detail-price-note">per person</span>
              </div>

              <div className="detail-cta-row">
                <button className="detail-cta" onClick={handleBookNow}>
                  Book Now
                </button>

                <button
                  className={`detail-secondary-btn ${saved ? "saved" : ""}`}
                  onClick={handleSaveExperience}
                  disabled={saving}
                >
                  {saving ? "Updating..." : saved ? "Saved ✓" : "Save Experience"}
                </button>

                <button
                  className="detail-secondary-btn"
                  onClick={() => navigate("/saved-experiences")}
                >
                  View Saved
                </button>
              </div>
            </div>

            <div className="detail-sections">
              <div className="detail-section-card">
                <h3 className="detail-section-title">What to Expect</h3>
                <ul className="detail-section-list">
                  {activity.what_to_expect?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section-card">
                <h3 className="detail-section-title">Session Flow</h3>
                <ul className="detail-section-list">
                  {activity.session_flow?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section-card">
                <h3 className="detail-section-title">After Session</h3>
                <ul className="detail-section-list">
                  {activity.after_session?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}