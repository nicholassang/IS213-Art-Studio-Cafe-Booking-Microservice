# IS213 Art Studio Cafe Booking Microservice

A sample micro‑service application built for the Enterprise Solutions Development
(IS213) course.  The system consists of a React frontend and a set of Python
FastAPI backend services orchestrated with Docker Compose.

## Note to Contributors
- Remember to branch from main, and only merge with main if there's no broken functionality or merge conflicts
- Follow how the frontend make calls to the backend, and how it flows into its taomic microservices
- Currently, API Gateway and Composite has the same API endpoints (we can add more composites if it makes sense)

## Project Structure

```
/                            # workspace root
├─ backend/                  # Python micro‑services and compose config
│  ├─ api-gateway/           # reverse proxy & routing layer
│  ├─ composite-service/     # aggregates other services (auth, bookings, etc.)
│  ├─ services/              # individual micro‑services
│  │  ├─ auth-service/       # user authentication
│  │  ├─ booking-service/    # stores bookings
│  │  ├─ calendar-service/   # availability checking
│  │  ├─ art-supply-service/ # external reservation stub
│  │  └─ food-order-service/ # external order stub
│  ├─ docker-compose.yaml    # development orchestrator
│  └─ server.py              # legacy/monolith placeholder
└─ frontend/                 # React application
   └─ app/                   # Vite project
      ├─ src/                # source code
      │  ├─ app/             # entrypoint and routing
      │  ├─ features/        # auth & bookings logic
      │  ├─ pages/           # UI pages (Home, Login, Booking, …)
      │  └─ services/        # shared HTTP client, etc.
      └─ public/             # static assets
```

## Running the Project (Development)

The easiest way to launch the entire stack is with Docker Compose.  Make sure
Docker Desktop is installed and running, then execute:

```bash
cd backend
# rebuild services when code changes have been made
# NOTE: you will need Docker Desktop to be running as well
docker compose down
docker compose up --build
```

This will start all backend containers with the following ports exposed to the
host:

- `8000` – API gateway (also frontend proxy target)
- `8001` – booking service (debug only)
- `8002` – calendar service (debug only)
- `8003` – art‑supply service (debug only)
- `8004` – food‑order service (debug only)
- `8005` – auth service (debug only)

Use the frontend dev server for the UI:

```bash
cd frontend/app
npm install        # first time only
npm run dev        # starts Vite on http://localhost:5173
```

The React app is configured to send requests to `http://localhost:8000`, which
is the gateway.  Backend cookies and sessions are handled automatically via
`withCredentials: true` in the HTTP client.

### Manual service startup

If you prefer running services individually (for debugging):

```bash
# example for composite service
cd backend/composite-service
python -m uvicorn main:app --reload --port 8001
```

Change the appropriate `COMPOSITE_URL` environment variable in
`api-gateway/main.py` or set it when launching the gateway.

## Testing endpoints

The frontend provides UI pages for registration, login, and booking.  You can
also exercise the API directly with `curl` or Python `requests`:

```python
import requests
r = requests.post('http://localhost:8000/register', json={
    'username':'foo','password':'bar'
})
print(r.json())
```

## Register
- I am using a Hash-based password, minimum length 4 for both username and password. There is a max length (maybe) as well.

## Notes

- CORS middleware is enabled on the gateway and every service to simplify
development.
- Sessions are managed via signed cookies using Starlette's
`SessionMiddleware`.
- The calendar, art‑supply and food‑order services are stubs that always
return success; they exist to demonstrate the micro‑service pattern.

