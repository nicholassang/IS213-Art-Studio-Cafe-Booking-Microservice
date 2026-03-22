import { useEffect, useState } from "react";

export default function ActivityList() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8003/activities")
      .then(res => res.json())
      .then(data => {
        console.log("API response:", data); // check what data looks like
        setActivities(data.activities ?? data ?? []);  // safe fallback
      })
      .catch(err => console.error("Fetch error:", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Art Activities</h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "20px"
      }}>
        {activities.map(activity => (
          <div key={activity.id}
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
            onClick={() => window.location.href = `/activity/${activity.id}`}
          >
            <img src={activity.image} alt="" width="100%" />
            <h3>{activity.name}</h3>
            <p>${activity.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}