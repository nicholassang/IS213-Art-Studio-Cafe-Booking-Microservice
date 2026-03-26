FROM python:3.11-slim

WORKDIR /app

COPY services/notification_service/requirements.txt .
RUN pip install -r requirements.txt

COPY services/notification_service .
COPY wrappers ./wrappers

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]