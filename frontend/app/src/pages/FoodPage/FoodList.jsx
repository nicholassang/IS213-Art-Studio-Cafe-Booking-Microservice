import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = ["All", "Main Meal", "Dessert", "Cake", "Drink"];

export default function FoodMenu() {
  const [menu, setMenu] = useState([]);
  const [active, setActive] = useState("All");
  const navigate = useNavigate(); 

  useEffect(() => {
    fetch("http://localhost:8000/menu/all")
      .then(res => res.json())
      .then(data => setMenu(data.menu ?? []))
      .catch(err => console.error("Fetch error:", err));
  }, []);

  const filtered = active === "All" ? menu : menu.filter(i => i.category === active);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0e0c",
      fontFamily: "'Georgia', serif",
      color: "#f5f0e8",
      padding: "0 0 60px",
    }}>

      {/* Cart Icon */ }
       <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 10 }}>
        <button onClick={() => navigate("/cart")} style={{
          background: "rgba(15,14,12,0.8)", border: "1px solid #2a2520",
          color: "#b8935a", padding: "10px 20px", borderRadius: "999px",
          cursor: "pointer", fontFamily: "'Georgia', serif", fontSize: "12px",
          letterSpacing: "0.15em", textTransform: "uppercase",
          backdropFilter: "blur(8px)",
        }}>
          🛒 Cart
        </button>
      </div>
     

      {/* Hero Header */}
      <div style={{
        textAlign: "center",
        padding: "60px 20px 30px",
        borderBottom: "1px solid #2a2520",
      }}>
        <p style={{
          letterSpacing: "0.3em",
          fontSize: "11px",
          color: "#b8935a",
          textTransform: "uppercase",
          marginBottom: "12px"
        }}>Est. 2025</p>
        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: "400",
          letterSpacing: "0.05em",
          margin: "0 0 8px",
          color: "#f5f0e8"
        }}>Food & Beverage</h1>
        <p style={{
          color: "#7a6a55",
          fontSize: "14px",
          letterSpacing: "0.15em",
          textTransform: "uppercase"
        }}>Crafted with passion · Served with care</p>
      </div>

      {/* Category Filter */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        padding: "32px 20px",
        flexWrap: "wrap",
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            style={{
              padding: "8px 24px",
              borderRadius: "999px",
              border: active === cat ? "1px solid #b8935a" : "1px solid #2a2520",
              background: active === cat ? "#b8935a" : "transparent",
              color: active === cat ? "#0f0e0c" : "#7a6a55",
              cursor: "pointer",
              fontSize: "12px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "'Georgia', serif",
              transition: "all 0.2s ease",
              fontWeight: active === cat ? "700" : "400",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "2px",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0 20px",
      }}>
        {filtered.map(item => (
          <div
            key={item.id}
            onClick={() => navigate(`/menu/${item.name.toLowerCase().replace(/\s+/g, "-")}`)}
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              background: "#1a1714",
              borderRadius: "4px",
            }}
            onMouseEnter={e => {
              e.currentTarget.querySelector(".overlay").style.opacity = "1";
              e.currentTarget.querySelector("img").style.transform = "scale(1.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.querySelector(".overlay").style.opacity = "0";
              e.currentTarget.querySelector("img").style.transform = "scale(1)";
            }}
          >
            {/* Image */}
            <div style={{ height: "240px", overflow: "hidden" }}>
              <img
                src={item.image_url}
                alt={item.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.5s ease",
                  display: "block",
                }}
              />
            </div>

            {/* Hover Overlay */}
            <div
              className="overlay"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(15,14,12,0.95) 40%, rgba(15,14,12,0.2))",
                opacity: 0,
                transition: "opacity 0.3s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "24px",
              }}
            >
              <p style={{ color: "#b8935a", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
                {item.category}
              </p>
              <p style={{ color: "#d4c5a9", fontSize: "13px", lineHeight: "1.6", margin: "0 0 12px" }}>
                {item.description}
              </p>
            </div>

            {/* Always visible bottom info */}
            <div style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "#b8935a", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
                  {item.category}
                </p>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "400", color: "#f5f0e8" }}>
                  {item.name}
                </h3>
              </div>
              <span style={{
                fontSize: "18px",
                color: "#b8935a",
                fontWeight: "300",
                letterSpacing: "0.05em"
              }}>
                ${item.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}