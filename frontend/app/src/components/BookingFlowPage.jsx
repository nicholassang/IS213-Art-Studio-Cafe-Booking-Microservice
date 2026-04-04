// BookingPage.jsx
import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getSlotAvailability } from "../api/calendar";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";

const DEFAULT_BOOKING_PAYMENT_METHOD = "pm_card_visa";

export default function BookingPage() {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedFood, setSelectedFood] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [loadingSlotAvailability, setLoadingSlotAvailability] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const { user } = useAuth();

  const getBookingErrorMessage = (error) => {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (detail && typeof detail === "object") {
      return detail.message || detail.downstream_response?.detail || detail.downstream_response?.message;
    }

    return error.response?.data?.message || "Failed to complete booking. Please try again.";
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const activityResp = await apiClient.get("/activities");
        const menuResp = await apiClient.get("/menu");
        setActivities(activityResp.data.activities || []);
        setMenuItems(menuResp.data.menu || []);
      } catch (err) {
        console.error("Could not load booking options", err);
        setStatusMessage("Unable to load activities or food menu. Try again soon.");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
      return;
    }

    if (user?.username) {
      setContactEmail(`${user.username}@example.com`);
    }
  }, [user]);

  const foodOptions = menuItems;

  const refreshSlotAvailability = async (slotInfo, activityInfo = selectedActivity) => {
    if (!slotInfo || !activityInfo?.id) {
      setSlotAvailability(null);
      return null;
    }

    setLoadingSlotAvailability(true);

    try {
      const availability = await getSlotAvailability(
        slotInfo.start.toISOString(),
        slotInfo.end.toISOString(),
        activityInfo.id
      );
      setSlotAvailability(availability);
      return availability;
    } catch (error) {
      console.error("Could not load slot availability", error);
      setSlotAvailability(null);
      setStatusMessage("Unable to load slot availability right now.");
      return null;
    } finally {
      setLoadingSlotAvailability(false);
    }
  };

  useEffect(() => {
    if (!selectedSlot || !selectedActivity?.id) {
      setSlotAvailability(null);
      return;
    }

    refreshSlotAvailability(selectedSlot, selectedActivity);
  }, [selectedSlot, selectedActivity]);

  const handleBooking = async () => {
    const orderedFoodItems = Object.entries(selectedFood)
      .filter(([, quantity]) => quantity > 0)
      .map(([foodId, quantity]) => ({ id: Number(foodId), quantity, comment: "" }));

    if (!selectedActivity || !selectedSlot || orderedFoodItems.length === 0) {
      alert("Please select activity, slot, and at least one food item first");
      return;
    }
    if (!user?.username) {
      setStatusMessage("Please login to continue booking.");
      return;
    }

    if (slotAvailability?.remaining_slots === 0) {
      setStatusMessage("This slot is already full. Please choose a different time.");
      return;
    }

    setLoadingBooking(true);

    try {
      const resp = await apiClient.post("/booking", {
        user_name: user.username,
        user_email: contactEmail,
        activity_id: selectedActivity.id,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        food_items: orderedFoodItems,
        payment_method: DEFAULT_BOOKING_PAYMENT_METHOD,
      });

      setBookingId(resp.data.booking?.booking?.id || `BK-${Date.now()}`);
      setStatusMessage(
        resp.data.notification?.queued
          ? "Booking completed. Confirmation email queued."
          : "Booking completed, but the confirmation email could not be queued."
      );
      await refreshSlotAvailability(selectedSlot);
    } catch (error) {
      console.error("Booking request failed", error);
      setStatusMessage(getBookingErrorMessage(error));
      await refreshSlotAvailability(selectedSlot, selectedActivity);
    } finally {
      setLoadingBooking(false);
    }
  };

  const toggleFoodQuantity = (foodId, delta) => {
    setSelectedFood((prev) => {
      const current = prev[foodId] || 0;
      const nextQuantity = current + delta;

      if (nextQuantity <= 0) {
        const updated = { ...prev };
        delete updated[foodId];
        return updated;
      }

      return { ...prev, [foodId]: nextQuantity };
    });
  };

  const removeFoodItem = (foodId) => {
    setSelectedFood((prev) => {
      const updated = { ...prev };
      delete updated[foodId];
      return updated;
    });
  };

  const total = Object.entries(selectedFood).reduce((sum, [foodId, qty]) => {
    const foodItem = menuItems.find((item) => item.id === Number(foodId));
    return sum + (foodItem?.price || 0) * qty;
  }, 0);

  const selectedFoodEntries = Object.entries(selectedFood)
    .filter(([, qty]) => qty > 0)
    .map(([foodId, qty]) => {
      const item = menuItems.find((food) => food.id === Number(foodId));
      return item ? { ...item, quantity: qty } : null;
    })
    .filter(Boolean);

  return (
    <div className="booking-page">
      <h1 className="detail-title">Book Your Activity</h1>
      {statusMessage && <p className="status-message">{statusMessage}</p>}

      {/* Activity Selection */}
      <div className="activity-section detail-info-card">
        <h2 className="detail-section-title">Select Activity</h2>
        <div className="activity-grid">
          {activities.map((activity) => (
            <div
              key={activity.id || activity.name}
              className={`activity-card ${selectedActivity?.id === activity.id ? "selected" : ""}`}
              onClick={() => setSelectedActivity(activity)}
            >
              <span className="activity-emoji">{activity.emoji}</span>
              <h3>{activity.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-section detail-info-card">
        <h2 className="detail-section-title">Select Time Slot</h2>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00"
          selectable={true}
          selectMirror={true}
          editable={false}
          select={(info) => setSelectedSlot(info)}
          selectAllow={(info) => (info.end - info.start) === 60 * 60 * 1000}
          events={
            selectedSlot
              ? [{
                  title: "Selected",
                  start: selectedSlot.start,
                  end: selectedSlot.end,
                  backgroundColor: "var(--accent)",
                  borderColor: "var(--accent-deep)",
                  textColor: "var(--surface)"
                }]
              : []
          }
          height="auto"
        />
        <div className="slot-availability-card">
          <p>
            <strong>Selected slot:</strong>{" "}
            {selectedSlot
              ? `${selectedSlot.start.toLocaleString()} - ${selectedSlot.end.toLocaleString()}`
              : "Choose a 1 hour slot to see availability."}
          </p>
          {loadingSlotAvailability && <p>Loading slot availability...</p>}
          {!loadingSlotAvailability && selectedSlot && slotAvailability && (
            <p className={slotAvailability.is_full ? "slot-full" : "slot-open"}>
              {slotAvailability.remaining_slots} of {slotAvailability.max_slots} slots left
            </p>
          )}
        </div>
      </div>

      {/* Food & Summary */}
      <div className="food-section detail-info-card">
        <h2 className="detail-section-title">Select Food</h2>
        <div className="food-grid">
          {foodOptions.map((food) => (
            <div
              key={food.id || food.name}
              className={`food-card ${(selectedFood[food.id] || 0) > 0 ? "selected" : ""}`}
              onClick={() => toggleFoodQuantity(food.id, 1)}
            >
              <img src={food.image_url} alt={food.name} className="food-image" />
              <h3>{food.name}</h3>
              <p>${food.price?.toFixed(2) || "0.00"}</p>
              <div className="food-qty-controls" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => toggleFoodQuantity(food.id, -1)}>-</button>
                <span>{selectedFood[food.id] || 0}</span>
                <button type="button" onClick={() => toggleFoodQuantity(food.id, 1)}>+</button>
                <button type="button" className="remove-btn" onClick={() => removeFoodItem(food.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {selectedFoodEntries.length > 0 && (
          <div className="cart-preview">
            <h4>Selected Food</h4>
            {selectedFoodEntries.map((item) => (
              <div key={item.id} className="cart-row">
                <span>{item.name}</span>
                <div className="food-qty-controls">
                  <button type="button" onClick={() => toggleFoodQuantity(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => toggleFoodQuantity(item.id, 1)}>+</button>
                  <button type="button" className="remove-btn" onClick={() => removeFoodItem(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="summary-card">
          <h3>Booking Summary</h3>
          <p><strong>Email:</strong></p>
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}
            type="email"
            placeholder="Enter email for confirmation"
          />
          <p><strong>Activity:</strong> {selectedActivity?.name || "Not selected"}</p>
          <p><strong>Slot:</strong> {selectedSlot ? `${selectedSlot.start.toLocaleString()} - ${selectedSlot.end.toLocaleString()}` : "Not selected"}</p>
          <p><strong>Slots Left:</strong> {slotAvailability ? slotAvailability.remaining_slots : "Select a slot"}</p>
          <p><strong>Food:</strong> {selectedFoodEntries.length > 0 ? selectedFoodEntries.map((item) => `${item.name} x${item.quantity}`).join(", ") : "Not selected"}</p>
          <p><strong>Total:</strong> ${total.toFixed(2)}</p>
          <button className="detail-cta-row detail-cta" onClick={handleBooking} disabled={loadingBooking || slotAvailability?.is_full || selectedFoodEntries.length === 0}>
            {loadingBooking ? "Processing..." : "Confirm & Pay"}
          </button>
          {bookingId && <p className="confirmation">✅ Booking Confirmed! ID: {bookingId}</p>}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .booking-page {
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          background: var(--bg);
          padding: 20px;
          max-width: 800px;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .activity-grid, .food-grid {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        .activity-card, .food-card {
          cursor: pointer;
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 12px;
          text-align: center;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
          background: var(--surface-2);
        }
        .activity-card.selected, .food-card.selected {
          border-color: var(--accent);
          transform: scale(1.05);
          box-shadow: var(--shadow);
        }
        .activity-card:hover, .food-card:hover {
          transform: translateY(-3px);
          border-color: var(--accent-deep);
          box-shadow: var(--shadow);
        }
        .activity-emoji {
          font-size: 2rem;
          display: block;
          margin-bottom: 6px;
        }
        .food-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 6px;
        }
        .food-qty-controls {
          margin-top: 8px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }
        .food-qty-controls button {
          border: 1px solid var(--line);
          background: var(--surface);
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
        }
        .food-qty-controls .remove-btn {
          border-color: #b42318;
          color: #b42318;
        }
        .cart-preview {
          margin-top: 16px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
        }
        .cart-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }
        .summary-card {
          margin-top: 20px;
          padding: 20px;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--line);
        }
        .slot-availability-card {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
        }
        .slot-open {
          color: var(--accent-deep);
          font-weight: 700;
        }
        .slot-full {
          color: #b42318;
          font-weight: 700;
        }
        .confirmation {
          margin-top: 10px;
          color: var(--accent-deep);
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}