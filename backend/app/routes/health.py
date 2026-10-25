"""
Health and Configuration endpoints for UK Wind Forecast Portal.
"""

from fastapi import APIRouter
from app.config import settings
from app.data.loader import data_manager

router = APIRouter(tags=["System"])


@router.get("/health")
def get_health():
    """Returns backend service operational health and data cache status."""
    return data_manager.get_health()


@router.get("/config")
def get_config():
    """Returns operational configuration and supported parameters."""
    return {
        "default_cutoff_time": settings.DEFAULT_CUTOFF_TIME,
        "timezone": settings.TIMEZONE,
        "display_timezone": settings.DISPLAY_TIMEZONE,
        "min_delivery_date": settings.MIN_DELIVERY_DATE,
        "max_delivery_date": settings.MAX_DELIVERY_DATE,
        "market_name": settings.MARKET_NAME,
        "auction_gate_closure": settings.AUCTION_GATE_CLOSURE,
        "horizon_buckets": ["0-6h", "6-12h", "12-24h", "24-48h", "48h+"],
    }
