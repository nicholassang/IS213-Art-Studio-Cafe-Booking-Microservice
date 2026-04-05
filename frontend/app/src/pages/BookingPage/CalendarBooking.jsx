import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Layout from "../../components/Layout";
import apiClient from "../../services/apiClient";
import { getFirstBookableDate, isFutureDaySlotSelection } from "../../utils/bookingCalendar";

const TWO_HOUR_MS = 2 * 60 * 60 * 1000;

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const passedActivity = location.state?.activity || null;

  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(passedActivity);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const firstBookableDate = getFirstBookableDate();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await apiClient.get("/activities");
        const activityList = res.data.activities || [];
        setActivities(activityList);
        if (passedActivity?.id) {
          const matched = activityList.find(item => item.id === passedActivity.id);
          if (matched) setSelectedActivity(matched);
        }
      } catch (error) {
        console.error("Failed to load activities:", error);
        setStatusMessage("Could not load activities.");
      }
    };
    fetchActivities();
  }, [passedActivity]);

  const handleSlotSelect = async (info) => {
    if (!isFutureDaySlotSelection(info, TWO_HOUR_MS)) {
      setSelectedSlot(null);
      setSlotAvailability(null);
      setStatusMessage("Please choose a slot from tomorrow onward.");
      return;
    }

    setSelectedSlot(info);
    setSlotAvailability(null);

    if (!selectedActivity?.id) {
      setStatusMessage("Please select an activity first.");
      return;
    }

    setLoadingAvailability(true);
    setStatusMessage("");

    try {
      const availability = await getSlotAvailability(
        info.start.toISOString(),
        info.end.toISOString(),
        selectedActivity.id
      );
      setSlotAvailability(availability);
    } catch (error) {
      setStatusMessage("Could not load slot availability.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const bookingState = {
    bookingActivity: selectedActivity,
    bookingSlot: selectedSlot ? {
      start: selectedSlot.start.toISOString(),
      end: selectedSlot.end.toISOString(),
    } : null,
  };

  const isDisabled = !selectedSlot || !selectedActivity || slotAvailability?.is_full;

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="bp-root">

          {/* Back buttons */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
            <button className="bp-back-btn" onClick={() => navigate("/activities")}>
              ← Back to Activities
            </button>
            {selectedActivity?.id && (
              <button className="bp-back-btn" onClick={() => navigate(`/activity/${selectedActivity.id}`)}>
                View Activity Details
              </button>
            )}
          </div>

        <div
          style={{
            background: "#fffdf9",
            border: "1px solid #e6ddd1",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "24px",
            boxShadow: "0 12px 30px rgba(42, 30, 18, 0.08)",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "10px" }}>Book Your Activity</h1>
          <p style={{ color: "#7d7468", marginTop: 0 }}>
            Choose an activity and select a 2-hour slot from the calendar.
          </p>

          {statusMessage && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#f8f2e8",
                border: "1px solid #e6ddd1",
              }}
            >
              {statusMessage}
            </div>
          )}
        </div>

        <div
          style={{
            background: "#fffdf9",
            border: "1px solid #e6ddd1",
            borderRadius: "24px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 12px 30px rgba(42, 30, 18, 0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Selected Activity</h2>

          {selectedActivity ? (
            <div
              style={{
                display: "flex",
                gap: "18px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <img
                src={selectedActivity.image}
                alt={selectedActivity.name}
                style={{
                  width: "160px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "16px",
                  border: "1px solid #e6ddd1",
                }}
              />

              <div>
                <h3 style={{ margin: "0 0 8px" }}>{selectedActivity.name}</h3>
                <p style={{ margin: "0 0 6px", color: "#7d7468" }}>{selectedActivity.category}</p>
                <p style={{ margin: 0, color: "#7d7468" }}>
                  {selectedActivity.duration} • {selectedActivity.level}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p style={{ color: "#7d7468" }}>No activity selected yet.</p>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "999px",
                      border: "1px solid #e6ddd1",
                      background: "#fffaf4",
                      cursor: "pointer",
                    }}
                  >
                    {activity.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            background: "#fffdf9",
            border: "1px solid #e6ddd1",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 12px 30px rgba(42, 30, 18, 0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Select Time Slot</h2>

          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotDuration="02:00:00"
            slotLabelInterval="02:00"
            selectable={true}
            selectMirror={true}
            editable={false}
            select={handleSlotSelect}
           selectAllow={(info) => info.end - info.start === 2 * 60 * 60 * 1000}
            events={
              selectedSlot
                ? [
                    {
                      title: "Selected",
                      start: selectedSlot.start,
                      end: selectedSlot.end,
                    },
                  ]
                : []
            }
            height="auto"
          />

          <div
            style={{
              marginTop: "18px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fffaf4",
              border: "1px solid #e6ddd1",
            }}
          >
            <p>
              <strong>Selected slot:</strong>{" "}
              {selectedSlot
                ? `${selectedSlot.start.toLocaleString()} - ${selectedSlot.end.toLocaleString()}`
                : "Choose a 2-hour slot."}
            </p>

            {loadingAvailability && <p>Loading slot availability...</p>}

            {!loadingAvailability && slotAvailability && (
              <p style={{ fontWeight: 700, color: slotAvailability.is_full ? "#b42318" : "#7a664d" }}>
                {slotAvailability.remaining_slots} of {slotAvailability.max_slots} slots left
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
    </>
  );
}