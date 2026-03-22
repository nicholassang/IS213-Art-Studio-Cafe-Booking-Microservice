import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const totalPrice = orders.reduce((sum, i) => sum + i.price * i.quantity, 0);

  useEffect(() => {
    fetch("http://localhost:8001/food-order/all")
      .then(res => res.json())
      .then(data => setOrders(data.orders ?? []))
      .catch(err => console.error("Fetch error:", err));
  }, []);

  const handleDelete = async (order_id) => {
    await fetch(`http://localhost:8001/food-order/${order_id}`, { method: "DELETE" });
    setOrders(prev => prev.filter(o => o.order_id !== order_id));
  };

  const handleUpdateQuantity = async (order_id, quantity) => {
    if (quantity < 1) return handleDelete(order_id);
    await fetch(`http://localhost:8001/food-order/${order_id}/quantity`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    setOrders(prev => prev.map(o => o.order_id === order_id ? { ...o, quantity } : o));
  };

  return (
    <div style={{ background: "#0f0e0c", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#f5f0e8", padding: "60px 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px", borderBottom: "1px solid #2a2520", paddingBottom: "24px" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "400", margin: 0 }}>Cart</h1>
        <button onClick={() => navigate("/menu")} style={{
          background: "transparent", border: "1px solid #2a2520", color: "#b8935a",
          padding: "10px 24px", borderRadius: "999px", cursor: "pointer",
          fontFamily: "'Georgia', serif", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>← Back to Menu</button>
      </div>

      {/* Empty */}
      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#7a6a55" }}>
          <p style={{ fontSize: "48px" }}>🍽️</p>
          <p style={{ fontSize: "18px", margin: "16px 0 24px" }}>Your cart is empty</p>
          <button onClick={() => navigate("/menu")} style={{
            background: "#b8935a", border: "none", color: "#0f0e0c",
            padding: "14px 32px", borderRadius: "8px", cursor: "pointer",
            fontFamily: "'Georgia', serif", fontSize: "12px",
            letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: "700",
          }}>Browse Menu</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "48px", alignItems: "start" }}>

          {/* Orders */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {orders.map(item => (
              <div key={item.order_id} style={{
                display: "grid", gridTemplateColumns: "90px 1fr auto",
                gap: "20px", alignItems: "center",
                background: "#1a1714", borderRadius: "12px",
                padding: "16px", border: "1px solid #2a2520",
              }}>
                {/* ✅ Image added */}
                <img src={item.image_url} alt={item.name} style={{
                  width: "90px", height: "75px", objectFit: "cover", borderRadius: "8px"
                }} />

                {/* Info ✅ removed gridColumn */}
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "400" }}>{item.name}</h3>
                  {item.comment && (
                    <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#7a6a55", fontStyle: "italic" }}>"{item.comment}"</p>
                  )}
                  <p style={{ margin: 0, color: "#b8935a", fontSize: "14px" }}>${item.price} each</p>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                  {/* Quantity */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button onClick={() => handleUpdateQuantity(item.order_id, item.quantity - 1)} style={{
                      width: "32px", height: "32px", background: "#0f0e0c", border: "1px solid #2a2520",
                      color: "#f5f0e8", cursor: "pointer", borderRadius: "6px 0 0 6px", fontSize: "16px",
                    }}>−</button>
                    <span style={{
                      width: "44px", height: "32px", background: "#0f0e0c",
                      border: "1px solid #2a2520", borderLeft: "none", borderRight: "none",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                    }}>{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.order_id, item.quantity + 1)} style={{
                      width: "32px", height: "32px", background: "#0f0e0c", border: "1px solid #2a2520",
                      color: "#f5f0e8", cursor: "pointer", borderRadius: "0 6px 6px 0", fontSize: "16px",
                    }}>+</button>
                  </div>

                  {/* Subtotal */}
                  <p style={{ margin: 0, color: "#b8935a", fontSize: "15px" }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  {/* Delete */}
                  <button onClick={() => handleDelete(item.order_id)} style={{
                    background: "transparent", border: "none", color: "#c0504d",
                    cursor: "pointer", fontSize: "12px", letterSpacing: "0.1em",
                    textTransform: "uppercase", fontFamily: "'Georgia', serif",
                  }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            background: "#1a1714", borderRadius: "12px", padding: "32px",
            border: "1px solid #2a2520", position: "sticky", top: "24px",
          }}>
            <h2 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: "400" }}>Order Summary</h2>

            {orders.map(item => (
              <div key={item.order_id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: "#7a6a55", fontSize: "13px" }}>{item.name} x{item.quantity}</span>
                <span style={{ fontSize: "13px" }}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ height: "1px", background: "#2a2520", margin: "20px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
              <span style={{ fontSize: "16px" }}>Total</span>
              <span style={{ fontSize: "20px", color: "#b8935a" }}>${totalPrice.toFixed(2)}</span>
            </div>

            <button onClick={() => navigate("/menu")} style={{
              width: "100%", padding: "18px", background: "#b8935a",
              border: "none", borderRadius: "8px", color: "#0f0e0c",
              fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase",
              fontFamily: "'Georgia', serif", cursor: "pointer", fontWeight: "700",
            }}>Place Order</button>
          </div>
        </div>
      )}
    </div>
  );
}