"""
Forecast and Decision endpoints for UK Wind Forecast Portal.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app.data.loader import data_manager

router = APIRouter(tags=["Forecasts"])


@router.get("/decision-forecast")
def get_decision_forecast(
    delivery_date: str = Query(..., description="Target delivery date in YYYY-MM-DD format (e.g., 2026-01-15)"),
    cutoff_time: Optional[str] = Query(None, description="Day D-1 cutoff time in HH:MM:SS format (default 12:00:00)"),
):
    """
    Returns the decision forecast available at Day D-1 cutoff for delivery day D.
    Ensures strict zero look-ahead bias and overlays actual generation if available.
    """
    try:
        res = data_manager.get_decision_forecast(delivery_date, cutoff_time)
        return res
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve decision forecast: {exc}")


@router.get("/forecast-vs-actual")
def get_forecast_vs_actual(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    horizon_bucket: Optional[str] = Query(None, description="Horizon bucket filter"),
):
    """
    Returns time-series curves of forecast vs actual for charting across date ranges.
    """
    try:
        return data_manager.get_forecast_vs_actual(start_date, end_date, horizon_bucket)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve time-series: {exc}")
