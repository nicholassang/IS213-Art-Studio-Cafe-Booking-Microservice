import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingPage from "../../components/BookingFlowPage";
import Layout from "../../components/Layout";
import apiClient from "../../services/apiClient";
import heroImage from "./art-booking-workshop.png";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;700&display=swap');

  :root {
    --bg: #faf7f2;
    --surface: #fffdf9;
    --surface-2: #f5efe6;
    --text: #241c17;
    --muted: #7d7468;
    --line: #e6ddd1;
    --accent: #c8a97e;
    --accent-deep: #b38d5e;
    --shadow: 0 12px 30px rgba(42, 30, 18, 0.08);
  }

  .home-root {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .home-hero {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 28px;
    align-items: stretch;
  }

  .home-hero-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 38px 34px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .home-badge {
    display: inline-block;
    width: fit-content;
    background: #f4ece1;
    color: #7a664d;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .home-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.2rem;
    line-height: 1.05;
    margin: 0 0 14px;
    color: var(--text);
  }

  .home-divider {
    width: 56px;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    margin-bottom: 18px;
  }

  .home-subtitle {
    color: var(--muted);
    line-height: 1.8;
    font-size: 1rem;
    margin: 0 0 26px;
    max-width: 620px;
  }

  .home-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .home-btn-primary {
    padding: 15px 22px;
    background: var(--text);
    color: #faf8f5;
    border: none;
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-btn-primary:hover {
    background: var(--accent-deep);
    transform: translateY(-1px);
  }

  .home-btn-secondary {
    padding: 15px 22px;
    background: #fffaf3;
    border: 1px solid var(--line);
    border-radius: 16px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-btn-secondary:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .home-image-card {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    min-height: 460px;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    display: flex;
    align-items: flex-end;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  .home-image-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(32, 23, 17, 0.45),
      rgba(32, 23, 17, 0.08)
    );
  }

  .home-image-caption {
    position: relative;
    z-index: 1;
    margin: 22px;
    background: rgba(255, 248, 240, 0.9);
    border: 1px solid rgba(228, 216, 198, 0.95);
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 0.76rem;
    color: #6a5a49;
    font-weight: 700;
    text-transform: uppercase;
  }

  .home-status-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 22px;
  }

  .home-status-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
  }

  .home-booking-wrap {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-bookings-panel {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 24px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .home-bookings-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .home-bookings-heading-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .home-bookings-subtitle {
    margin: 0;
    color: var(--muted);
  }

  .home-bookings-toggle {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: #fffaf3;
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-bookings-toggle:hover {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .home-bookings-content {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .home-bookings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    align-items: start;
  }

  .home-booking-card {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-self: start;
  }

  .home-booking-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .home-booking-card h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  .home-booking-card-toggle {
    width: 38px;
    height: 38px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    line-height: 1;
  }

  .home-booking-card-toggle:hover {
    background: #f6eee2;
  }

  .home-booking-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .home-booking-status {
    width: fit-content;
    padding: 4px 10px;
    border-radius: 999px;
    background: #f4ece1;
    color: #7a664d;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .home-booking-detail {
    margin: 0;
    color: var(--text);
    line-height: 1.6;
  }

  .home-booking-email {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .home-bookings-feedback {
    margin: 0;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: #fff8f1;
    color: var(--text);
  }

  .home-bookings-feedback.is-error {
    border-color: #e5b8b2;
    background: #fff4f2;
    color: #8a2f24;
  }

  .home-booking-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
  }

  .home-booking-action {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }

  .home-booking-action:hover:not(:disabled) {
    background: #f6eee2;
    transform: translateY(-1px);
  }

  .home-booking-action:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .home-booking-action.is-danger {
    border-color: #e5b8b2;
    color: #8a2f24;
    background: #fff6f4;
  }

  .home-bookings-empty {
    margin: 0;
    padding: 18px;
    border-radius: 18px;
    background: var(--surface-2);
    border: 1px dashed var(--line);
    color: var(--muted);
  }

  .home-section-heading {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    margin: 0;
    color: var(--text);
  }

  @media (max-width: 980px) {
    .home-hero {
      grid-template-columns: 1fr;
    }
  }
`;

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingActionMessage, setBookingActionMessage] = useState("");
  const [cancelingBookingId, setCancelingBookingId] = useState(null);
  const [collapsedBookings, setCollapsedBookings] = useState(() => Object.create(null));
  const [cancelConfirm, setCancelConfirm] = useState(null); // holds booking to confirm cancel

  useEffect(() => {
    if (!user?.username) {
      setBookings([]);
      setBookingsError("");
      setBookingActionMessage("");
      setBookingsLoading(false);
      return;
    }

    let ignore = false;

    const fetchBookings = async () => {
      setBookingsLoading(true);
      setBookingsError("");

      try {
        const response = await apiClient.get("/bookings", {
          params: { user_name: user.username },
        });

        if (!ignore) {
          setBookings(response.data.bookings || []);
        }
      } catch (error) {
        if (!ignore) {
          setBookings([]);
          setBookingsError("Unable to load your bookings right now.");
        }
      } finally {
        if (!ignore) {
          setBookingsLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      ignore = true;
    };
  }, [user?.username]);

  const handleCancelBooking = async (bookingId) => {
    if (!user?.username || cancelingBookingId === bookingId) {
      return;
    }

    // Get the PaymentIntentId from the booking record
    const booking = bookings.find((b) => b.id === bookingId);
    const paymentIntentId = booking?.payment?.PaymentIntentId;

    if (!paymentIntentId) {
      setBookingsError("Cannot process refund — payment reference not found.");
      return;
    }

    setCancelingBookingId(bookingId);
    setBookingsError("");
    setBookingActionMessage("");

    try {
      // Call composite service — handles refund + booking status update
      const response = await apiClient.post(`/booking/${bookingId}/cancel`, {
        user_name: user.username,
        payment_intent_id: paymentIntentId,
      });

      const updatedBooking = response.data.booking;

      setBookings((currentBookings) =>
        currentBookings.map((b) =>
          b.id === bookingId
            ? { ...b, ...(updatedBooking || {}), status: updatedBooking?.status || "cancelled" }
            : b
        )
      );
      setBookingActionMessage("We're sad to see you go! 💙 Your refund has been processed. Hope to welcome you back to the studio soon!");
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message =
        typeof detail === "object"
          ? detail?.message || "Unable to cancel this booking right now."
          : detail || error.response?.data?.message || "Unable to cancel this booking right now.";
      setBookingsError(message);
    } finally {
      setCancelingBookingId(null);
    }
  };

  const toggleBookingCard = (bookingId) => {
    setCollapsedBookings((currentValue) => ({
      ...currentValue,
      [bookingId]: !currentValue[bookingId],
    }));
  };

  const formatBookingDateTime = (value) => {
    if (!value) {
      return "Not scheduled";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatBookingAmount = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "Pending";
    }

    return `$${amount.toFixed(2)}`;
  };

  const openQuiz = () => {
    window.dispatchEvent(new CustomEvent("open-quiz"));
  };

  return (
    <>
      <style>{styles}</style>
      <Layout>
        <div className="home-root">
          <div className="home-hero">
            <div className="home-hero-card">
              <span className="home-badge">Art Studio Café</span>

              <h1 className="home-title">
                Warm art workshops, cosy café moments, and creative gatherings.
              </h1>

              <div className="home-divider" />

              <p className="home-subtitle">
                Step into a thoughtfully curated space where art, coffee, and connection come together.
              </p>

              <div className="home-actions">
                {!user ? (
                  <>
                    <button className="home-btn-primary" onClick={() => navigate("/login")}>
                      Login
                    </button>
                    <button className="home-btn-secondary" onClick={() => navigate("/register")}>
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    <button className="home-btn-primary" onClick={openQuiz}>
                      ✨ Discover Your Creative Type
                    </button>
                    <button className="home-btn-primary" onClick={() => navigate("/activities")}>
                      Explore Activities
                    </button>
                    <button className="home-btn-secondary" onClick={() => navigate("/my-recommendations")}>
                      My Recommendations
                    </button>
                    <button className="home-btn-secondary" onClick={logout}>
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className="home-image-card"
              style={{
                backgroundImage: `linear-gradient(rgba(36, 28, 23, 0.22), rgba(36, 28, 23, 0.34)), url(${heroImage})`,
              }}
            >
              <div className="home-image-caption">
                Warm Workshops • Café Moments • Creative Gatherings
              </div>
            </div>
          </div>

          <div className="home-status-card">
            <h2 className="home-status-title">
              {user ? `Welcome back, ${user.username}!` : "Welcome to the studio."}
            </h2>
            <p>
              {user
                ? "You’re ready to book your next experience."
                : "Login to start your booking journey."}
            </p>
          </div>

          {user && (
            <>
              <div className="home-bookings-panel">
                <div className="home-bookings-header">
                  <div className="home-bookings-heading-group">
                    <h2 className="home-section-heading">Your bookings</h2>
                    <p className="home-bookings-subtitle">Remember to mark your calendars!</p>
                  </div>
                </div>

                <div className="home-bookings-content">
                  {bookingActionMessage && !bookingsError && (
                    <p className="home-bookings-feedback">{bookingActionMessage}</p>
                  )}
                  {bookingsLoading && <p className="home-bookings-empty">Loading your bookings...</p>}
                  {!bookingsLoading && bookingsError && <p className="home-bookings-feedback is-error">{bookingsError}</p>}
                  {!bookingsLoading && !bookingsError && bookings.length === 0 && (
                    <p className="home-bookings-empty">You have no bookings yet. Reserve your first session below.</p>
                  )}

                  {!bookingsLoading && !bookingsError && bookings.length > 0 && (
                    <div className="home-bookings-grid">
                      {bookings.map((booking) => {
                        const isCollapsed = collapsedBookings[booking.id] ?? true;

                        return (
                          <article key={booking.id} className="home-booking-card">
                            <div className="home-booking-card-header">
                              <div>
                                <div className="home-booking-meta">
                                  <span className="home-booking-status">{booking.status || "confirmed"}</span>
                                  <span>Booking #{booking.id}</span>
                                </div>
                                <h3>{booking.activity_name || booking.activity_id || "Activity booking"}</h3>
                              </div>
                              <button
                                type="button"
                                className="home-booking-card-toggle"
                                onClick={() => toggleBookingCard(booking.id)}
                                aria-expanded={!isCollapsed}
                                aria-label={isCollapsed ? "Expand booking details" : "Collapse booking details"}
                                title={isCollapsed ? "Expand booking details" : "Collapse booking details"}
                              >
                                <span aria-hidden="true">{isCollapsed ? "+" : "-"}</span>
                              </button>
                            </div>
                            {!isCollapsed && (
                              <>
                                <p className="home-booking-detail">
                                  <strong>Starts:</strong> {formatBookingDateTime(booking.start_time)}
                                </p>
                                <p className="home-booking-detail">
                                  <strong>Ends:</strong> {formatBookingDateTime(booking.end_time)}
                                </p>
                                <p className="home-booking-detail">
                                  <strong>Total:</strong> {formatBookingAmount(booking.total_amount)}
                                </p>
                                <p className="home-booking-detail home-booking-email">
                                  <strong>Email:</strong> {booking.user_email || "Not provided"}
                                </p>
                                <div className="home-booking-actions">
                                  <button
                                    type="button"
                                    className="home-booking-action is-danger"
                                    onClick={() => booking.status !== "cancelled" && setCancelConfirm(booking)}
                                    disabled={booking.status === "cancelled" || cancelingBookingId === booking.id}
                                  >
                                    {booking.status === "cancelled"
                                      ? "Cancelled"
                                      : cancelingBookingId === booking.id
                                        ? "Cancelling..."
                                        : "Cancel booking"}
                                  </button>
                                </div>
                              </>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

{/*               <div className="home-booking-wrap">
                <h2 className="home-section-heading">Start your booking</h2>
                <BookingPage />
              </div> */}
            </>
          )}
        </div>
      </Layout>

      {/* Cancellation confirmation modal */}
      {cancelConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(36,28,23,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}>
          <div style={{
            background: "#fffdf9",
            border: "1px solid #e6ddd1",
            borderRadius: "28px",
            padding: "36px 32px",
            maxWidth: "440px",
            width: "100%",
            boxShadow: "0 24px 48px rgba(36,28,23,0.18)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            <div>
              <p style={{ fontSize: "0.74rem", letterSpacing: "0.13em", textTransform: "uppercase", color: "#b38d5e", fontWeight: 700, margin: "0 0 8px" }}>
                Confirm Cancellation
              </p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", margin: 0, color: "#241c17" }}>
                Cancel your booking?
              </h3>
            </div>

            <div style={{ background: "#f5efe6", border: "1px solid #e6ddd1", borderRadius: "16px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                <span style={{ color: "#7d7468" }}>Activity</span>
                <span style={{ fontWeight: 600, color: "#241c17" }}>{cancelConfirm.activity_name || cancelConfirm.activity_id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                <span style={{ color: "#7d7468" }}>Date</span>
                <span style={{ fontWeight: 600, color: "#241c17" }}>{formatBookingDateTime(cancelConfirm.start_time)}</span>
              </div>
              <div style={{ height: "1px", background: "#e6ddd1" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem" }}>
                <span style={{ fontWeight: 700, color: "#241c17" }}>Refund amount</span>
                <span style={{ fontWeight: 700, color: "#2d6e2d", fontFamily: "'Playfair Display', serif", fontSize: "1.2rem" }}>
                  {formatBookingAmount(cancelConfirm.total_amount)}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#7d7468", margin: 0, lineHeight: 1.6 }}>
              Your refund will be processed immediately back to your original payment method. This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setCancelConfirm(null)}
                style={{
                  flex: 1, padding: "14px", borderRadius: "14px",
                  border: "1px solid #e6ddd1", background: "#fffaf3",
                  color: "#241c17", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem",
                  transition: "0.2s",
                }}
              >
                Keep booking
              </button>
              <button
                onClick={async () => {
                  const bookingToCancel = cancelConfirm;
                  setCancelConfirm(null);
                  await handleCancelBooking(bookingToCancel.id);
                }}
                disabled={cancelingBookingId === cancelConfirm?.id}
                style={{
                  flex: 1, padding: "14px", borderRadius: "14px",
                  border: "1px solid #e5b8b2", background: "#fff6f4",
                  color: "#8a2f24", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem",
                  transition: "0.2s",
                }}
              >
                Yes, cancel & refund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}