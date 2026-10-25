"""
Metrics and evaluation endpoints for UK Wind Forecast Portal.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.data.loader import data_manager

router = APIRouter(tags=["Metrics"])


@router.get("/metrics")
def get_metrics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    horizon_bucket: Optional[str] = Query(None, description="Horizon bucket: all, 0-6h, 6-12h, 12-24h, 24-48h, 48h+"),
):
    """
    Returns quantitative accuracy metrics: Bias (ME), MAE, RMSE, nMAE,
    absolute error percentiles (P50, P90, P95), and signed error quantiles.
    """
    try:
        return data_manager.get_metrics(start_date, end_date, horizon_bucket)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to compute metrics: {exc}")


@router.get("/metrics/by-horizon")
def get_metrics_by_horizon(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Returns accuracy metrics sliced across each horizon bucket (0-6h, 6-12h, 12-24h, 24-48h, 48h+).
    """
    try:
        return data_manager.get_metrics_by_horizon(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to compute metrics by horizon: {exc}")


@router.get("/error-distribution")
def get_error_distribution(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    bin_count: int = Query(25, ge=5, le=100, description="Number of histogram bins"),
):
    """
    Returns signed error frequency histogram bins for risk distribution visualization.
    """
    try:
        return data_manager.get_error_distribution(start_date, end_date, bin_count)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to compute error distribution: {exc}")
