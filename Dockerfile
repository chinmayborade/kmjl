# Multi-stage Dockerfile for UK Wind Forecast Portal
# Stage 1: Build React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATA_DIR=/app/data

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code, cached data, and documentation
COPY backend/ ./backend/
COPY data/ ./data/
COPY docs/ ./docs/
COPY pytest.ini ./.gitignore ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONPATH=/app/backend

EXPOSE 8000

# Run uvicorn bound to PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
