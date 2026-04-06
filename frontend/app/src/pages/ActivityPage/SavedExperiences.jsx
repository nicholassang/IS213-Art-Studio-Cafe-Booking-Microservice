import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

  :root {
    --bg: #faf7f2;
    --surface: #fffdf9;
    --text: #241c17;
    --muted: #7d7468;
    --line: #e6ddd1;
    --accent: #c8a97e;
    --shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
  }

  .saved-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  .saved-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6f6558;
    background: #fffaf4;
    border: 1px solid var(--line);
    padding: 10px 16px;
    border-radius: 999px;
    cursor: pointer;
    margin-bottom: 24px;
    transition: background 0.2s, color 0.2s;
  }


  .saved-header {
    margin-bottom: 28px;
  }

  .saved-eyebrow {
    display: inline-block;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #b38d5e;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .saved-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    line-height: 1.05;
    margin: 0 0 10px;
    color: var(--text);
  }

  .saved-subtitle {
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.8;
    margin: 0;
    max-width: 700px;
  }

  .saved-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
    margin-top: 28px;
  }

  .saved-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(36, 28, 23, 0.05);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .saved-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(36, 28, 23, 0.1);
  }

  .saved-card-img {
    width: 100%;
    height: 240px;
    object-fit: cover;
    display: block;
  }

  .saved-card-body {
    padding: 18px;
  }

  .saved-category {
    display: inline-block;
    background: #f4ece1;
    color: #7a664d;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .saved-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    margin: 0 0 8px;
    color: var(--text);
  }

  .saved-card-desc {
    color: var(--muted);
    font-size: 0.93rem;
    line-height: 1.7;
    margin: 0 0 14px;
  }

  .saved-meta {
    color: #8b8073;
    font-size: 0.88rem;
    margin-bottom: 14px;
  }

  .saved-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    border-top: 1px solid #f0e6d9;
  }

  .saved-price {
    font-size: 1.08rem;
    font-weight: 700;
    color: var(--text);
  }

  .saved-price span {
    font-size: 0.9rem;
    font-weight: 400;
    color: var(--muted);
  }

  .saved-arrow {
    background: #f5ede2;
    color: #8d7f70;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 0.84rem;
  }

  .saved-empty,
  .saved-loading {
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: 22px;
    padding: 50px 20px;
    text-align: center;
    color: var(--muted);
    margin-top: 28px;
  }

  .saved-empty button {
    margin-top: 16px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: #fffaf4;
    cursor: pointer;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .saved-title {
      font-size: 2.2rem;
    }

    .saved-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function SavedExperiences() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const userName = "demo_user";
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/saved-experiences/${userName}`)
      .then((res) => res.json())
      .then((data) => {
        setActivities(data.activities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Saved experiences fetch error:", err);
        setLoading(false);
      });
  }, [userName]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 2500);

    return () => clearTimeout(timer);
  }, [message]);

  const handleUnsave = async (activityId) => {
    try {
      const res = await fetch(
        `http://localhost:8000/saved-activities/${userName}/${activityId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to unsave activity");
      }

      setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
      setMessage("Removed from saved ❌");
    } catch (err) {
      console.error("Unsave error:", err);
      setMessage("Could not remove activity.");
    }
  };

   return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="saved-root">
          <button
            className="saved-back"
            onClick={() => navigate("/activities")}
          >
            ← Back to activities
          </button>

          <div className="saved-header">
            <span className="saved-eyebrow">Your collection</span>
            <h1 className="saved-title">Saved Experiences</h1>
            <p className="saved-subtitle">
              Revisit the art experiences you’ve bookmarked and come back whenever you’re ready to book.
            </p>
          </div>

          {message && <div className="saved-toast">{message}</div>}

          {loading ? (
            <div className="saved-loading">Loading your saved experiences...</div>
          ) : activities.length === 0 ? (
            <div className="saved-empty">
              You haven’t saved any experiences yet.
              <div>
                <button onClick={() => navigate("/activities")}>
                  Explore activities
                </button>
              </div>
            </div>
          ) : (
            <div className="saved-grid">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="saved-card"
                  onClick={() => navigate(`/activity/${activity.id}`)}
                >
                  <img
                    src={activity.image}
                    alt={activity.name}
                    className="saved-card-img"
                  />

                  <div className="saved-card-body">
                    <span className="saved-category">{activity.category}</span>
                    <h3 className="saved-card-title">{activity.name}</h3>

                    <p className="saved-card-desc">
                      {activity.description?.slice(0, 100)}...
                    </p>

                    <div className="saved-meta">
                      {activity.duration} • {activity.level} • ⭐ {activity.rating}
                    </div>

                    <div className="saved-footer">
                      <div className="saved-price">
                        ${activity.price} <span>/ person</span>
                      </div>

                      <button
                        className="saved-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsave(activity.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
