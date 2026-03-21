import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
 
  .detail-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    padding: 36px 48px;
  }
 
  .detail-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #7c6f5e;
    background: transparent;
    border: 1px solid #d9d0c5;
    padding: 7px 16px;
    border-radius: 100px;
    cursor: pointer;
    margin-bottom: 36px;
    transition: background 0.2s, color 0.2s;
    letter-spacing: 0.02em;
  }
  .detail-back:hover {
    background: #111;
    color: #fff;
    border-color: #111;
  }
 
  .detail-grid {
    max-width: 1020px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 56px;
    align-items: start;
  }
 
  .detail-image-wrap {
    position: relative;
  }
  .detail-image {
    width: 100%;
    height: 420px;
    object-fit: cover;
    border-radius: 20px;
    display: block;
  }
  .detail-image-caption {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(6px);
    padding: 5px 12px;
    border-radius: 100px;
    font-size: 0.75rem;
    color: #555;
    letter-spacing: 0.04em;
    font-weight: 500;
  }
 
  .detail-info {
    padding-top: 8px;
  }
 
  .detail-badge {
    display: inline-block;
    background: #f0ebe3;
    color: #7c6f5e;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
 
  .detail-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.6rem;
    line-height: 1.18;
    color: #1a1612;
    margin: 0 0 16px;
    font-weight: 700;
  }
 
  .detail-divider {
    width: 48px;
    height: 3px;
    background: #c9a87c;
    border-radius: 2px;
    margin-bottom: 20px;
  }
 
  .detail-desc {
    color: #6b6357;
    line-height: 1.75;
    font-size: 0.97rem;
    margin: 0 0 28px;
    font-weight: 300;
  }
 
  .detail-meta {
    display: flex;
    gap: 24px;
    margin-bottom: 28px;
  }
  .detail-meta-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .detail-meta-label {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #aaa098;
    font-weight: 500;
  }
  .detail-meta-value {
    font-size: 0.95rem;
    color: #1a1612;
    font-weight: 500;
  }
 
  .detail-price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 32px;
  }
  .detail-price-currency {
    font-size: 1.1rem;
    color: #c9a87c;
    font-weight: 500;
  }
  .detail-price-amount {
    font-family: 'Playfair Display', serif;
    font-size: 2.6rem;
    color: #1a1612;
    line-height: 1;
    font-weight: 700;
  }
  .detail-price-note {
    font-size: 0.8rem;
    color: #aaa098;
    margin-left: 4px;
  }
 
  .detail-cta {
    width: 100%;
    padding: 15px 24px;
    background: #1a1612;
    color: #faf8f5;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: background 0.2s, transform 0.15s;
  }
  .detail-cta:hover {
    background: #c9a87c;
    transform: translateY(-1px);
  }
 
  .detail-loading {
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 1rem;
    color: #aaa098;
    background: #faf8f5;
    letter-spacing: 0.06em;
  }
`;

export default function ActivityDetail() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/activities/${id}`)
      .then(res => res.json())
      .then(data => setActivity(data));
  }, [id]);

  if (!activity) return (
    <>
      <style>{styles}</style>
      <div className="detail-loading">Loading experience…</div>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="detail-root">

        <button className="detail-back" onClick={() => window.history.back()}>
          ← Back
        </button>

        <div className="detail-grid">

          {/* Image */}
          <div className="detail-image-wrap">
            <img
              src={activity.image}
              alt={activity.name}
              className="detail-image"
            />
            <span className="detail-image-caption">{activity.name}</span>
          </div>

          {/* Details */}
          <div className="detail-info">

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
                  ⭐ {activity.rating} ({activity.reviews})
                </span>
              </div>
            </div>
            <div className="detail-price-row">
              <span className="detail-price-currency">$</span>
              <span className="detail-price-amount">{activity.price}</span>
              <span className="detail-price-note">per person</span>
            </div>
            <button className="detail-cta">
              Book Now
            </button>
          </div>
          
          {/* What to Expect */}
          <h3>What to Expect</h3>
          <ul>
            {activity.what_to_expect.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          {/* Session Flow */}
          <h3>Session Flow</h3>
          <ul>
            {activity.session_flow.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          {/* After Session */}
          <h3>After Session</h3>
          <ul>
            {activity.after_session.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

        </div>
      </div>
    </>
  );
}
