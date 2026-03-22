import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ActivityDetail() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8003/activities/${id}`)
      .then(res => res.json())
      .then(data => setActivity(data));
  }, [id]);

  if (!activity) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{activity.name}</h1>
      <img src={activity.image} width="300" />
      <p>{activity.description}</p>
      <p>Duration: {activity.duration}</p>
      <h2>${activity.price}</h2>

      <button style={{ padding: "10px 20px" }}>
        Book Now (Activity)
      </button>
    </div>
  );
}