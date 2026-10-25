"""
FastAPI Main Application for UK Wind Forecast Portal.

Serves REST API endpoints under /api and mounts React static files.
"""

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.data.loader import data_manager
from app.routes import forecast, health, metrics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("api_main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: load data cache on startup."""
    logger.info("Initializing application and loading data cache...")
    data_manager.load_data()
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title="UK Wind Forecast Portal API",
    description="Backend API for UK Day-Ahead Wind Generation Decision Forecasts & Accuracy Metrics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")


# Static files mount for single-container production deployment
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    logger.info("Mounting built frontend static files from %s", frontend_dist)
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
else:
    @app.get("/")
    def index_fallback():
        return {
            "message": "UK Wind Forecast Portal API is running.",
            "docs_url": "/docs",
            "health_url": "/api/health",
            "config_url": "/api/config",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
