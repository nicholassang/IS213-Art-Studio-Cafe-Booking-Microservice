import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

   .list-root {
    font-family: 'DM Sans', sans-serif;
  }
 
 
  .list-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 36px;
    // text-align: center;
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
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
  transition: transform 0.2s ease;
}

.list-card:hover {
  transform: scale(1.02);
}

/* IMAGE */
.list-card-img {
  width: 100%;
  height: 260px;
  object-fit: cover;
}

/* BODY */
.list-card-body {
  padding: 12px 4px;
}

/* TOP ROW */
.list-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* TITLE */
.list-card-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

/* RATING */
.list-card-rating {
  font-size: 0.85rem;
  font-weight: 500;
}

/* SUBTEXT */
.list-card-sub {
  font-size: 0.85rem;
  color: #717171;
  margin: 2px 0;
}

/* PRICE */
.list-card-price {
  margin-top: 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.list-card-price span {
  font-weight: 400;
  color: #717171;
  font-size: 0.9rem;
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const startTime = Date.now();

    fetch("http://localhost:8000/getAllActivities")
      .then(res => res.json())
      .then(data => {
        const elapsed = Date.now() - startTime;

        // 400ms loading
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
          {loading ? (
            <p>Loading experience… 🎨</p>
          ) : filteredActivities.length === 0 ? (
            <p>No activities found 😢</p>
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

                  {/* TOP */}
                  <div className="list-card-top">
                    <h3 className="list-card-name">{activity.name}</h3>
                    <span className="list-card-rating">
                      ⭐ {activity.rating}
                    </span>
                  </div>

                  {/* SUBTEXT */}
                  <p className="list-card-sub">
                    {activity.category} • {activity.duration} • {activity.level}
                  </p>


                  {/* PRICE */}
                  <div className="list-card-price">
                    ${activity.price} <span>/ person</span>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>

      </Layout>

    </>
  );
}
