"""
Decision forecast selection service for UK Wind Forecast Portal.

Enforces strict zero look-ahead decision rule:
  For delivery date D and cutoff time C on day D-1:
    1. Filter forecasts where startTime is on delivery date D.
    2. Filter publishTime <= cutoff timestamp (D-1 at C).
    3. Select latest publishTime for each target period.
    4. Resample/align to 48 half-hour settlement periods.
    5. Join actuals, compute lead horizon, error, and empirical uncertainty bounds.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.services.alignment import get_settlement_period
from app.services.metrics import assign_horizon_bucket


def select_decision_forecast(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    delivery_date: str,
    cutoff_time: str = "12:00:00",
    horizon_quantiles: Optional[Dict[str, Dict[str, float]]] = None,
) -> Dict[str, Any]:
    """
    Selects the decision forecast available at Day D-1 cutoff for delivery day D.

    Parameters:
      forecasts_df: DataFrame with 'publishTime', 'startTime', 'generation'
      actuals_df: DataFrame with 'startTime', 'generation'
      delivery_date: 'YYYY-MM-DD'
      cutoff_time: 'HH:MM:SS'
      horizon_quantiles: Optional mapping of horizon bucket to {'p10': float, 'p90': float}
    """
    # 1. Parse dates and compute cutoff datetime
    delivery_dt = pd.to_datetime(delivery_date).tz_localize("UTC")
    day_before_dt = delivery_dt - pd.Timedelta(days=1)
    cutoff_parts = cutoff_time.split(":")
    cutoff_h = int(cutoff_parts[0])
    cutoff_m = int(cutoff_parts[1]) if len(cutoff_parts) > 1 else 0
    cutoff_s = int(cutoff_parts[2]) if len(cutoff_parts) > 2 else 0

    cutoff_datetime = day_before_dt.replace(hour=cutoff_h, minute=cutoff_m, second=cutoff_s)
    delivery_start = delivery_dt.replace(hour=0, minute=0, second=0)
    delivery_end = delivery_dt.replace(hour=23, minute=59, second=59)

    # 2. Strict Zero Look-Ahead Filtering
    # Forecasts targeting delivery date D that were published at or before cutoff
    day_forecasts = forecasts_df[
        (forecasts_df["startTime"] >= delivery_start)
        & (forecasts_df["startTime"] <= delivery_end)
        & (forecasts_df["publishTime"] <= cutoff_datetime)
    ].copy()

    # 3. For each startTime, pick the latest publishTime
    if not day_forecasts.empty:
        day_forecasts = day_forecasts.sort_values(by=["startTime", "publishTime"]).drop_duplicates(
            subset=["startTime"], keep="last"
        )

    # 4. Filter actuals for delivery day D
    day_actuals = actuals_df[
        (actuals_df["startTime"] >= delivery_start)
        & (actuals_df["startTime"] <= delivery_end)
    ].copy()
    if not day_actuals.empty:
        day_actuals = day_actuals.sort_values(by="startTime").drop_duplicates(
            subset=["startTime"], keep="last"
        )
    actuals_map = dict(zip(day_actuals["startTime"], day_actuals["generation"]))

    # 5. Build 48 half-hour settlement periods grid
    periods: List[Dict[str, Any]] = []
    # Index forecasts by hour or exact timestamp
    forecast_map = {}
    for _, row in day_forecasts.iterrows():
        st = row["startTime"]
        forecast_map[st] = {
            "generation": float(row["generation"]),
            "publishTime": row["publishTime"],
        }

    for sp in range(1, 49):
        # sp 1 is 00:00, sp 2 is 00:30, etc.
        minute_offset = (sp - 1) * 30
        p_start = delivery_start + pd.Timedelta(minutes=minute_offset)
        p_hour = p_start.floor("1h")

        # Find matching forecast: direct half-hour match or hourly match
        f_info = forecast_map.get(p_start) or forecast_map.get(p_hour)

        forecast_mw: Optional[float] = None
        publish_time_iso: Optional[str] = None
        horizon_hours: Optional[float] = None

        if f_info is not None:
            forecast_mw = round(f_info["generation"], 1)
            pub_dt = f_info["publishTime"]
            publish_time_iso = pub_dt.isoformat()
            horizon_hours = round((p_start - pub_dt).total_seconds() / 3600.0, 1)

        # Actuals
        actual_mw: Optional[float] = None
        if p_start in actuals_map:
            actual_mw = round(float(actuals_map[p_start]), 1)

        # Error: forecast - actual
        error_mw: Optional[float] = None
        if forecast_mw is not None and actual_mw is not None:
            error_mw = round(forecast_mw - actual_mw, 1)

        # Uncertainty bounds (P10 and P90)
        p10_bound_mw: Optional[float] = None
        p90_bound_mw: Optional[float] = None

        if forecast_mw is not None:
            bucket = assign_horizon_bucket(horizon_hours if horizon_hours is not None else 24.0)
            if horizon_quantiles and bucket in horizon_quantiles:
                q = horizon_quantiles[bucket]
                p10_err = q.get("p10", -1000.0)
                p90_err = q.get("p90", 1000.0)
                # Lower bound is forecast minus high over-estimation error
                p10_bound_mw = round(max(0.0, forecast_mw - p90_err), 1)
                # Upper bound is forecast minus under-estimation error
                p90_bound_mw = round(max(0.0, forecast_mw - p10_err), 1)
            else:
                # Default heuristic bounds (±15%) if historical quantiles unavailable
                p10_bound_mw = round(max(0.0, forecast_mw * 0.85), 1)
                p90_bound_mw = round(forecast_mw * 1.15, 1)

        periods.append({
            "start_time": p_start.isoformat(),
            "settlement_period": sp,
            "forecast_generation_mw": forecast_mw,
            "actual_generation_mw": actual_mw,
            "publish_time": publish_time_iso,
            "horizon_hours": horizon_hours,
            "error_mw": error_mw,
            "p10_bound_mw": p10_bound_mw,
            "p90_bound_mw": p90_bound_mw,
        })

    # 6. Aggregate day summary
    valid_forecasts = [p["forecast_generation_mw"] for p in periods if p["forecast_generation_mw"] is not None]
    valid_actuals = [p["actual_generation_mw"] for p in periods if p["actual_generation_mw"] is not None]
    valid_errors = [p["error_mw"] for p in periods if p["error_mw"] is not None]

    total_f_mwh = sum(v * 0.5 for v in valid_forecasts) if valid_forecasts else 0.0
    total_a_mwh = sum(v * 0.5 for v in valid_actuals) if valid_actuals else 0.0
    peak_f_mw = max(valid_forecasts) if valid_forecasts else 0.0
    min_f_mw = min(valid_forecasts) if valid_forecasts else 0.0
    day_bias = float(np.mean(valid_errors)) if valid_errors else 0.0
    day_mae = float(np.mean(np.abs(valid_errors))) if valid_errors else 0.0

    return {
        "delivery_date": delivery_date,
        "cutoff_applied": cutoff_datetime.isoformat(),
        "summary": {
            "total_forecast_mwh": round(total_f_mwh, 1),
            "total_actual_mwh": round(total_a_mwh, 1),
            "peak_forecast_mw": round(peak_f_mw, 1),
            "min_forecast_mw": round(min_f_mw, 1),
            "day_bias_mw": round(day_bias, 2),
            "day_mae_mw": round(day_mae, 2),
        },
        "periods": periods,
        "meta": {
            "total_periods_expected": 48,
            "forecast_periods_count": len(valid_forecasts),
            "actual_periods_count": len(valid_actuals),
            "coverage_pct": round(len(valid_forecasts) / 48.0 * 100.0, 1),
        },
    }
