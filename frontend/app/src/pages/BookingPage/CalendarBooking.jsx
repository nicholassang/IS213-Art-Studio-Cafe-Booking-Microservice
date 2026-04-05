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

  const getSlotAvailability = async (startTime, endTime, activityId) => {
    try {
      const res = await apiClient.get("/bookings/availability", {
        params: {
          start_time: startTime,
          end_time: endTime,
          activity_id: activityId,
        },
      });

      return res.data;
    } catch (error) {
      console.error("Failed to get slot availability:", error);
      throw error;
    }
  };

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

      const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

      :root {
        --surface: #fffdf9;
      --surface-2: #f5efe6;
      --text: #241c17;
      --muted: #7d7468;
      --line: #e6ddd1;
      --accent: #c8a97e;
      --accent-deep: #b38d5e;
      --shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
  }

      .bp-root {font - family: 'DM Sans', sans-serif; color: var(--text); }

      .bp-hero {
        background: linear-gradient(135deg, #f7f1e8 0%, #fdfaf6 100%);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 36px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
  }

      .bp-eyebrow {
        font - size: 0.74rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent-deep);
      font-weight: 700;
      margin-bottom: 8px;
      display: block;
  }

      .bp-title {
        font - family: 'Playfair Display', serif;
      font-size: 2.6rem;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--text);
      line-height: 1.1;
  }

      .bp-subtitle {
        color: var(--muted);
      font-size: 0.97rem;
      margin: 0;
      line-height: 1.7;
  }

      .bp-card {
        background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 28px 32px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
  }

      .bp-card-title {
        font - family: 'Playfair Display', serif;
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0 0 20px;
      color: var(--text);
  }

      .bp-back-btn {
        display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      font-size: 0.88rem;
      font-family: 'DM Sans', sans-serif;
      font-weight: 500;
      margin-bottom: 24px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(36,28,23,0.06);
  }

      .bp-back-btn:hover {
        background: var(--text);
      color: #fff;
      border-color: var(--text);
  }

      .bp-activity-display {
        display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
  }

      .bp-activity-img {
        width: 140px;
      height: 100px;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid var(--line);
  }

      .bp-activity-info h3 {
        font - family: 'Playfair Display', serif;
      font-size: 1.2rem;
      margin: 0 0 6px;
      color: var(--text);
  }

      .bp-activity-info p {
        margin: 0 0 4px;
      color: var(--muted);
      font-size: 0.9rem;
  }

      .bp-activity-pick-btn {
        padding: 8px 16px;
      border-radius: 999px;
      border: 1.5px solid var(--line);
      background: var(--surface-2);
      color: var(--text);
      cursor: pointer;
      font-size: 0.85rem;
      font-family: 'DM Sans', sans-serif;
      font-weight: 500;
      transition: all 0.2s ease;
  }

      .bp-activity-pick-btn:hover {
        border - color: var(--accent);
      color: var(--accent-deep);
  }

      .bp-cal-wrap .fc {font - family: 'DM Sans', sans-serif !important; color: var(--text) !important; }
      .bp-cal-wrap .fc-toolbar-title {font - family: 'Playfair Display', serif !important; font-size: 1.1rem !important; color: var(--text) !important; }
      .bp-cal-wrap .fc-button-primary {background - color: var(--text) !important; border-color: var(--text) !important; font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important; border-radius: 8px !important; padding: 6px 14px !important; font-size: 0.82rem !important; color: #fff !important; }
      .bp-cal-wrap .fc-button-primary:hover {background - color: var(--accent-deep) !important; border-color: var(--accent-deep) !important; }
      .bp-cal-wrap .fc-button-primary:disabled {background - color: var(--muted) !important; border-color: var(--muted) !important; opacity: 0.6 !important; }
      .bp-cal-wrap .fc-col-header-cell {background: var(--surface-2) !important; padding: 8px 0 !important; font-size: 0.82rem !important; font-weight: 600 !important; color: var(--text) !important; }
      .bp-cal-wrap .fc-timegrid-slot-label-cushion {font - size: 0.8rem !important; color: var(--muted) !important; font-family: 'DM Sans', sans-serif !important; }
      .bp-cal-wrap .fc-timegrid-slot {border - color: var(--line) !important; height: 48px !important; }
      .bp-cal-wrap .fc-scrollgrid {border - color: var(--line) !important; }
      .bp-cal-wrap .fc-scrollgrid td, .bp-cal-wrap .fc-scrollgrid th {border - color: var(--line) !important; }
      .bp-cal-wrap .fc-highlight {background: rgba(200, 169, 126, 0.2) !important; }
      .bp-cal-wrap .fc-event {border - radius: 8px !important; font-size: 0.82rem !important; font-weight: 600 !important; }

      .bp-slot-info {
        margin - top: 20px;
      padding: 18px 20px;
      border-radius: 14px;
      background: var(--surface-2);
      border: 1px solid var(--line);
      font-size: 0.93rem;
      line-height: 1.7;
  }

      .bp-slot-info p {margin: 0 0 6px; }
      .bp-slot-info p:last-child {margin: 0; }
      .bp-slot-open {color: var(--accent-deep); font-weight: 700; }
      .bp-slot-full {color: #b42318; font-weight: 700; }

      .bp-status {
        padding: 14px 18px;
      border-radius: 12px;
      background: #f8f2e8;
      border: 1px solid var(--line);
      font-size: 0.93rem;
      color: var(--text);
      margin-bottom: 20px;
  }

      .bp-btn {
        flex: 1;
      padding: 17px;
      border: none;
      border-radius: 14px;
      color: #fff;
      font-size: 0.9rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: 'DM Sans', sans-serif;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 6px 20px rgba(36, 28, 23, 0.2);
  }

      .bp-btn-primary {background: var(--text); }
      .bp-btn-primary:hover:not(:disabled) {background: var(--accent-deep); transform: translateY(-1px); }

      .bp-btn-secondary {background: var(--accent-deep); }
      .bp-btn-secondary:hover:not(:disabled) {background: var(--accent); transform: translateY(-1px); }

      .bp-btn:disabled {opacity: 0.45; cursor: default; transform: none; }

      .bp-booking-grid {
        display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      align-items: start;
  }

      .bp-booking-sidebar {
        display: flex;
      flex-direction: column;
      gap: 20px;
      position: sticky;
      top: 24px;
  }

      .bp-step-label {
        font - size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-deep);
      font-weight: 700;
      margin: 0 0 8px;
  }

      .bp-sub-hint {
        color: var(--muted);
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 0.94rem;
  }

      .bp-chip-row {
        display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
  }

      .bp-chip {
        padding: 8px 12px;
      border-radius: 999px;
      background: #f4ece1;
      border: 1px solid var(--line);
      font-size: 0.82rem;
      color: #7a664d;
      font-weight: 600;
  }

      .bp-cal-shell {
        background: #fcf8f2;
      border: 1px solid #efe3d3;
      border-radius: 20px;
      padding: 16px;
  }

      .bp-activity-display-column {
        flex - direction: column;
      align-items: flex-start;
  }

      .bp-activity-img-large {
        width: 100%;
      height: 180px;
  }

      @media (max-width: 980px) {
    .bp - booking - grid {
        grid - template - columns: 1fr;
    }
      .bp-booking-sidebar {
        position: static;
    }
  }
      `;
