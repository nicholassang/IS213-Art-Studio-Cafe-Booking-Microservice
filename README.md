# IS213 Art Studio Cafe Booking Microservice

This project is a microservice-based booking platform for an art studio cafe.
It uses:

- React (frontend)
- FastAPI services (backend)
- Kong (API gateway)
- RabbitMQ (async events)
- Resend (booking confirmation emails)
- Supabase (persistence for activities, bookings, and related data)

## Architecture

### High-Level Topology

```text
Frontend (React @ :5173)
                |
                v
Kong Gateway (@ :8000)
                |
                +--> user-service
                +--> make-booking-composite-service
                +--> ai-recommender-composite-service
                +--> activity-service (saved activity endpoints)

make-booking-composite-service orchestrates:
    - activity-service
    - menu-service
    - foodorder-service
    - payment-wrapper
    - RabbitMQ (booking.events / booking.confirmed)

notification-service consumes booking confirmation events:
    - primary queue: booking.confirmation.email.v2
    - DLQ: booking.confirmation.dlq.v2
    - sends email via Resend
```

### Mermaid Diagram

```mermaid
flowchart LR
        FE[Frontend React Vite\nlocalhost:5173] -->|HTTP| KONG[Kong Gateway\nlocalhost:8000]

        KONG -->|/register /login /profile /logout| USER[user-service]
        KONG -->|/activities /menu /booking /food-order| BOOKING[make-booking-composite-service]
        KONG -->|/saved-activities /saved-experiences| ACT[activity-service]
        KONG -->|/quiz /recommend| AICOMP[ai-recommender-composite-service]

        BOOKING --> ACT
        BOOKING --> MENU[menu-service]
        BOOKING --> FOOD[foodorder-service]
        BOOKING --> PAY[payment-wrapper]

        BOOKING -->|publish booking.confirmed| EX[(RabbitMQ exchange\nbooking.events)]
        EX -->|booking.confirmed| QMAIN[[booking.confirmation.email.v2]]
        QMAIN --> NOTIF[notification-service]
        NOTIF --> RESEND[Resend]
        RESEND --> CUSTOMER[User Email Inbox]

        QMAIN -.->|booking.confirmed.dead (on reject/nack)| QDLQ[[booking.confirmation.dlq.v2]]
```

### Request Routing via Kong

Kong declarative config is in `backend/kong/kong.yml`.

Main routed paths:

- `/register`, `/login`, `/profile`, `/logout` -> `user-service`
- `/activities`, `/menu`, `/booking`, `/food-order` -> `make-booking-composite-service`
- `/saved-activities`, `/saved-experiences` -> `activity-service`
- `/quiz`, `/recommend` -> `ai-recommender-composite-service`

Note: the legacy FastAPI gateway (`api-gateway-legacy`) exists only for reference and is disabled by default.

### Service Roles

- `frontend/app`
    - React + Vite UI.
    - Uses `http://localhost:8000` as backend base URL (Kong).

- `make-booking-composite-service`
    - Central orchestrator for booking flow.
    - Validates activity and slot availability.
    - Validates menu items and creates food orders.
    - Processes payment via payment wrapper.
    - Persists booking through activity service.
    - Publishes booking confirmation events to RabbitMQ.

- `activity-service`
    - Manages activities, saved activities, and bookings.
    - Computes slot availability from persisted bookings.
    - Availability is activity-specific per selected time window.
    - Enforces max capacity of 20 per activity per 1-hour slot.

- `menu-service`
    - Source of menu item catalog and pricing.

- `foodorder-service`
    - Stores item-level food orders.

- `notification-service`
    - Consumes booking confirmation events.
    - Sends confirmation email with activity summary, food summary, and total paid.
    - Uses RabbitMQ dead-letter queue for failed processing.

- `payment-wrapper`
    - Handles payment request/response simulation/integration layer.

- `ai-recommender-composite-service` + `ai-recommendation-wrapper` + `quiz-service`
    - Handles recommendation flow and quiz-based suggestion logic.

## Booking and Notification Flow

1. User confirms booking in frontend.
2. Frontend sends `POST /booking` to Kong.
3. Kong routes to `make-booking-composite-service`.
4. Composite service orchestrates activity check, food orders, payment, and booking persistence.
5. Composite publishes event to exchange `booking.events` with routing key `booking.confirmed`.
6. Notification service consumes from `booking.confirmation.email.v2`.
7. On success, email is delivered via Resend to the booking user email.
8. On processing failure, message is dead-lettered to `booking.confirmation.dlq.v2`.

## RabbitMQ Details

- Exchange: `booking.events` (topic)
- Normal routing key: `booking.confirmed`
- Primary queue: `booking.confirmation.email.v2`
- DLQ routing key: `booking.confirmed.dead`
- DLQ queue: `booking.confirmation.dlq.v2`

Operational note:
- If you previously used `booking.confirmation.email`, delete that legacy queue to avoid confusion and duplicate bindings.

## Environment and Email Delivery

Notification service env variables (from `backend/docker-compose.yaml`):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (default `artcafebookings@nicholassang.com`)
- `RESEND_TEST_RECIPIENT`
- `RESEND_FORCE_TEST_RECIPIENT`

For real user email delivery:

- Use a verified Resend domain sender in `RESEND_FROM_EMAIL`.
- Keep `RESEND_FORCE_TEST_RECIPIENT=false`.
- Leave `RESEND_TEST_RECIPIENT` empty unless intentionally forcing test delivery.

## Running the Project

### Backend

```bash
cd backend
docker compose down
docker compose up --build
```

### Frontend

```bash
cd frontend/app
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls backend through Kong at `http://localhost:8000`.

## Exposed Ports

- `8000` Kong proxy
- `8001` Kong admin API
- `8005` user-service
- `8006` ai-recommendation-wrapper
- `8007` payment-wrapper
- `8010` notification-service
- `8011` activity-service
- `8012` quiz-service
- `8013` menu-service
- `8014` foodorder-service
- `5672` RabbitMQ AMQP
- `15672` RabbitMQ management UI

## Repository Layout (Simplified)

```text
backend/
    docker-compose.yaml
    kong/kong.yml
    composite-service/
        make-booking-composite-service/
        ai-recommender-composite-service/
    services/
        activity-service/
        user-service/
        menu-service/
        foodOrder-service/
        notification_service/
        quiz-service/
    wrappers/
        payment-wrapper/
        notification_wrapper/
        ai-recommendation-wrapper/

frontend/
    app/
        src/
            api/
            components/
            context/
            pages/
            services/
```

## Contributor Notes

- Follow request path: frontend -> Kong -> composite/atomic services.
- Keep API payloads aligned between frontend and composite service.
- Treat booking confirmation email as asynchronous side effect.
- Validate queue topology after RabbitMQ or notification-service changes.

