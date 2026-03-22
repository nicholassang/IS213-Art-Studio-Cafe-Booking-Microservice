import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    //from menu-service --> @app.get("/menu/name/{name}")
    fetch(`http://localhost:8000/menu/name/${id}`)
      .then(res => res.json())
      .then(data => setItem(data))
      .catch(err => console.error("Fetch error:", err));
  }, [id]);

  const handleAddToOrder = async () => {
    setLoading(true);
    try {
      //connect to Food_Order service
      const res = await fetch("http://localhost:8001/food-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        //credentials: "include",
        body: JSON.stringify({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          quantity,
          comment,
        }),
        
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
         navigate("/menu"); //go back to menu
      }

     
      
    } catch (err) {
      console.error("Order error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return (
    <div style={{ background: "#0f0e0c", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8935a", fontFamily: "'Georgia', serif" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ background: "#0f0e0c", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#f5f0e8" }}>

      {/* Back Button */}
      <button onClick={() => navigate("/menu")} style={{
        position: "fixed", top: "24px", left: "24px", zIndex: 10,
        background: "rgba(15,14,12,0.8)", border: "1px solid #2a2520",
        color: "#b8935a", padding: "10px 20px", borderRadius: "999px",
        cursor: "pointer", fontFamily: "'Georgia', serif", fontSize: "12px",
        letterSpacing: "0.15em", textTransform: "uppercase",
        backdropFilter: "blur(8px)",
      }}>
        ← Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }}>

        {/* Left — Image */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, #0f0e0c)" }} />
        </div>

        {/* Right — Details */}
        <div style={{ padding: "80px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* Category */}
          <p style={{ color: "#b8935a", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
            {item.category}
          </p>

          {/* Name */}
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: "400", margin: "0 0 20px", lineHeight: "1.1" }}>
            {item.name}
          </h1>

          {/* Description */}
          <p style={{ color: "#7a6a55", fontSize: "15px", lineHeight: "1.8", marginBottom: "32px", maxWidth: "400px" }}>
            {item.description}
          </p>

          {/* Price */}
          <p style={{ fontSize: "2rem", color: "#b8935a", marginBottom: "40px", fontWeight: "300" }}>
            ${item.price}
          </p>

          <div style={{ width: "40px", height: "1px", background: "#2a2520", marginBottom: "40px" }} />

          {/* Comment */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a6a55", marginBottom: "10px" }}>
              Special Request
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="e.g. no onions, extra sauce..."
              rows={3}
              style={{
                width: "100%", background: "#1a1714", border: "1px solid #2a2520",
                borderRadius: "8px", padding: "14px", color: "#f5f0e8",
                fontFamily: "'Georgia', serif", fontSize: "14px", resize: "none",
                outline: "none", lineHeight: "1.6",
              }}
            />
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a6a55", marginBottom: "10px" }}>
              Quantity
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{
                width: "44px", height: "44px", background: "#1a1714",
                border: "1px solid #2a2520", color: "#f5f0e8", fontSize: "18px",
                cursor: "pointer", borderRadius: "8px 0 0 8px",
              }}>−</button>
              <span style={{
                width: "60px", height: "44px", background: "#1a1714",
                border: "1px solid #2a2520", borderLeft: "none", borderRight: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", color: "#f5f0e8",
              }}>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} style={{
                width: "44px", height: "44px", background: "#1a1714",
                border: "1px solid #2a2520", color: "#f5f0e8", fontSize: "18px",
                cursor: "pointer", borderRadius: "0 8px 8px 0",
              }}>+</button>
            </div>
          </div>

          {/* Total */}
          <p style={{ color: "#7a6a55", fontSize: "13px", marginBottom: "24px", letterSpacing: "0.05em" }}>
            Total: <span style={{ color: "#b8935a", fontSize: "18px" }}>${(item.price * quantity).toFixed(2)}</span>
          </p>

          {/* Add to Order Button */}
          <button
            onClick={handleAddToOrder}
            disabled={loading || success}
            style={{
              padding: "18px 40px", background: success ? "#2a4a2a" : "#b8935a",
              border: "none", borderRadius: "8px", color: success ? "#6abf6a" : "#0f0e0c",
              fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase",
              fontFamily: "'Georgia', serif", cursor: loading || success ? "default" : "pointer",
              transition: "all 0.3s ease", fontWeight: "700",
            }}
          >
            {success ? "✓ Added to Order!" : loading ? "Adding..." : `Add to Order — $${(item.price * quantity).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}