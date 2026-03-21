import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
 
  .list-root {
    font-family: 'DM Sans', sans-serif;
    background: #faf8f5;
    min-height: 100vh;
    padding: 48px;
  }
 
  .list-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 36px;
  }
  .list-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #c9a87c;
    font-weight: 500;
  }
  .list-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    color: #1a1612;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
  }
 
  .list-search-wrap {
    position: relative;
    max-width: 480px;
    margin-bottom: 40px;
  }
  .list-search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #aaa098;
    font-size: 0.9rem;
    pointer-events: none;
  }
  .list-search {
    width: 100%;
    padding: 13px 18px 13px 42px;
    border: 1.5px solid #e2dbd2;
    border-radius: 12px;
    font-size: 0.93rem;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #1a1612;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .list-search::placeholder { color: #bdb4a8; }
  .list-search:focus { border-color: #c9a87c; }
 
  .list-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
 
  .list-empty {
    color: #aaa098;
    font-size: 0.95rem;
    grid-column: 1/-1;
    padding: 40px 0;
    text-align: center;
  }
 
  .list-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #ede8e1;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    display: flex;
    flex-direction: column;
  }
  .list-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 32px rgba(26,22,18,0.10);
  }
 
  .list-card-img-wrap {
    position: relative;
    overflow: hidden;
  }
  .list-card-img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }
  .list-card:hover .list-card-img {
    transform: scale(1.05);
  }
 
  .list-card-body {
    padding: 16px 18px 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .list-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.12rem;
    color: #1a1612;
    margin: 0;
    font-weight: 700;
    line-height: 1.3;
  }
  .list-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }
  .list-card-price {
    font-size: 1.05rem;
    font-weight: 600;
    color: #c9a87c;
  }
  .list-card-arrow {
    font-size: 0.8rem;
    color: #bdb4a8;
    background: #f5f0ea;
    padding: 5px 10px;
    border-radius: 100px;
    transition: background 0.2s, color 0.2s;
  }
  .list-card:hover .list-card-arrow {
    background: #1a1612;
    color: #fff;
  }
`;

export default function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/getAllActivities")
      .then(res => res.json())
      .then(data => setActivities(data.activities || []))
      .catch(err => console.error("Error fetching activities:", err));
  }, []);

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{styles}</style>
      <div className="list-root">

        <div className="list-header">
          <span className="list-eyebrow">Explore &amp; Create</span>
          <h1 className="list-title">Art Activities 🎨</h1>
        </div>

        {/* Search Bar */}
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

        {/* Grid */}
        <div className="list-grid">
          {filteredActivities.length === 0 ? (
            <p className="list-empty">No activities found 😢</p>
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
                </div>
                <div className="list-card-body">
                  <h3 className="list-card-name">{activity.name}</h3>

                  {/* NEW INFO */}
                  <p style={{ fontSize: "0.85rem", color: "#7c6f5e" }}>
                    {activity.category} • {activity.duration}
                  </p>

                  <p style={{ fontSize: "0.8rem", color: "#aaa098" }}>
                    ⭐ {activity.rating} ({activity.reviews})
                  </p>

                  <div className="list-card-footer">
                    <span className="list-card-price">${activity.price}</span>
                    <span className="list-card-arrow">View →</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
