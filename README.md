# IS213 Art Studio Cafe Booking Microservice

Microservice-based booking platform for an art studio cafe. The project includes a React frontend, FastAPI backend services, Kong for routing, and RabbitMQ for asynchronous booking confirmation emails.

## Contributor Notes

- Branch from `main` and only merge working changes.
- Follow the existing flow from frontend -> Kong -> composite service -> atomic services.
- Easy login for local testing:
    - Username: `test`
    - Password: `test`

## Project Structure

```text
.
├─ backend/
│  ├─ docker-compose.yaml
│  ├─ api-gateway/
│  │  ├─ Dockerfile
│  │  ├─ main.py
│  │  └─ requirements.txt
│  ├─ composite-service/
│  │  ├─ ai-reccomendation-composite-service/
│  │  ├─ ai-recommender-composite-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  ├─ make-booking-composite-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  └─ process-payment-composite-service/
│  ├─ kong/
│  │  └─ kong.yml
│  ├─ services/
│  │  ├─ activity-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ images/
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  ├─ calendar-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  ├─ foodOrder-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  ├─ models.py
│  │  │  └─ requirements.txt
│  │  ├─ menu-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  ├─ notification_service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  ├─ quiz-service/
│  │  │  ├─ Dockerfile
│  │  │  ├─ main.py
│  │  │  └─ requirements.txt
│  │  └─ user-service/
│  │     ├─ Dockerfile
│  │     ├─ main.py
│  │     ├─ models.py
│  │     └─ requirements.txt
│  └─ wrappers/
│     ├─ ai-recommendation-wrapper/
│     │  ├─ Dockerfile
│     │  ├─ main.py
│     │  ├─ prompts.py
│     │  └─ requirements.txt
│     ├─ calendar_wrapper/
│     │  └─ main.py
│     ├─ notification_wrapper/
│     │  └─ main.py
│     └─ payment-wrapper/
│        ├─ Dockerfile
│        ├─ main.py
│        └─ requirements.txt
├─ frontend/
│  └─ app/
│     ├─ index.html
│     ├─ package.json
│     ├─ public/
│     └─ src/
│        ├─ api/
│        ├─ app/
│        ├─ components/
│        ├─ context/
│        ├─ pages/
│        └─ services/
├─ LICENSE
└─ README.md
```

## Architecture Summary

- `frontend/app`: React + Vite UI.
- `backend/kong`: public entrypoint on port `8000`.
- `make-booking-composite-service`: coordinates booking, food order creation, payment, persistence, and confirmation email queueing.
- `activity-service`: stores activities, saved activities, bookings, and slot availability.
- `notification_service`: consumes `booking.confirmed` events from RabbitMQ and sends email through Resend.
- `payment-wrapper`: mock payment processor.
- `rabbitmq`: broker for asynchronous booking confirmation emails.

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

Frontend runs on `http://localhost:5173` and sends requests to `http://localhost:8000`.

## Exposed Ports

- `8000`: Kong proxy
- `8001`: Kong admin API
- `8005`: user-service
- `8006`: ai-recommendation-wrapper
- `8007`: payment-wrapper
- `8010`: notification-service
- `8011`: activity-service
- `8012`: quiz-service
- `8013`: menu-service
- `8014`: foodorder-service
- `5672`: RabbitMQ AMQP
- `15672`: RabbitMQ management UI

## Booking Flow Notes

- Booking confirmation emails are published as `booking.confirmed` events and processed asynchronously.
- Slot availability is calculated from persisted bookings in the backend.
- Each 1-hour slot has a maximum capacity of `20` bookings.

## Notes

- Activity and food-order data are persisted through Supabase-backed services.
- The calendar service currently remains a lightweight stub; slot availability is enforced through the booking flow.
- CORS is enabled across the local development stack for the frontend dev server.

