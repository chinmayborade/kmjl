"""
Accuracy and statistical metrics calculation service for UK Wind Forecast Portal.

Computes:
  - Bias (Mean Error, ME in MW)
  - MAE (Mean Absolute Error in MW)
  - RMSE (Root Mean Square Error in MW)
  - nMAE (Normalized MAE in %)
  - Absolute error percentiles (P50, P90, P95)
  - Signed error quantiles (P10, P50, P90)
  - Horizon bucket slicing
  - Error histogram distribution
"""

import math
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


HORIZON_BUCKET_ORDER = ["0-6h", "6-12h", "12-24h", "24-48h", "48h+"]


def assign_horizon_bucket(hours: float) -> str:
    """Assign a forecast lead time (in hours) to standard procurement horizon buckets."""
    if hours < 6.0:
        return "0-6h"
    elif hours < 12.0:
        return "6-12h"
    elif hours < 24.0:
        return "12-24h"
    elif hours < 48.0:
        return "24-48h"
    else:
        return "48h+"


def compute_accuracy_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute comprehensive accuracy metrics from a DataFrame containing
    'forecast_generation_mw' (or 'forecast_mw') and 'actual_generation_mw' (or 'actual_mw').
    """
    f_col = "forecast_generation_mw" if "forecast_generation_mw" in df.columns else "forecast_mw"
    a_col = "actual_generation_mw" if "actual_generation_mw" in df.columns else "actual_mw"

    if df.empty or f_col not in df.columns or a_col not in df.columns:
        return {
            "sample_count": 0,
            "mean_actual_mw": 0.0,
            "mean_forecast_mw": 0.0,
            "bias_mw": 0.0,
            "mae_mw": 0.0,
            "rmse_mw": 0.0,
            "nmae_pct": 0.0,
            "error_percentiles": {
                "p50_absolute_error_mw": 0.0,
                "p90_absolute_error_mw": 0.0,
                "p95_absolute_error_mw": 0.0,
            },
            "signed_error_quantiles": {
                "p10_error_mw": 0.0,
                "p50_error_mw": 0.0,
                "p90_error_mw": 0.0,
            },
        }

    valid = df.dropna(subset=[f_col, a_col]).copy()
    count = len(valid)
    if count == 0:
        return {
            "sample_count": 0,
            "mean_actual_mw": 0.0,
            "mean_forecast_mw": 0.0,
            "bias_mw": 0.0,
            "mae_mw": 0.0,
            "rmse_mw": 0.0,
            "nmae_pct": 0.0,
            "error_percentiles": {
                "p50_absolute_error_mw": 0.0,
                "p90_absolute_error_mw": 0.0,
                "p95_absolute_error_mw": 0.0,
            },
            "signed_error_quantiles": {
                "p10_error_mw": 0.0,
                "p50_error_mw": 0.0,
                "p90_error_mw": 0.0,
            },
        }

    actuals = valid[a_col].to_numpy(dtype=float)
    forecasts = valid[f_col].to_numpy(dtype=float)

    # Signed error: e = forecast - actual (positive = over-forecasting)
    errors = forecasts - actuals
    abs_errors = np.abs(errors)

    mean_actual = float(np.mean(actuals))
    mean_forecast = float(np.mean(forecasts))
    bias = float(np.mean(errors))
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors**2)))
    nmae = float((mae / mean_actual * 100.0) if mean_actual > 0 else 0.0)

    # Absolute error percentiles
    p50_abs = float(np.percentile(abs_errors, 50))
    p90_abs = float(np.percentile(abs_errors, 90))
    p95_abs = float(np.percentile(abs_errors, 95))

    # Signed error quantiles
    p10_signed = float(np.percentile(errors, 10))
    p50_signed = float(np.percentile(errors, 50))
    p90_signed = float(np.percentile(errors, 90))

    return {
        "sample_count": count,
        "mean_actual_mw": round(mean_actual, 2),
        "mean_forecast_mw": round(mean_forecast, 2),
        "bias_mw": round(bias, 2),
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "nmae_pct": round(nmae, 2),
        "error_percentiles": {
            "p50_absolute_error_mw": round(p50_abs, 2),
            "p90_absolute_error_mw": round(p90_abs, 2),
            "p95_absolute_error_mw": round(p95_abs, 2),
        },
        "signed_error_quantiles": {
            "p10_error_mw": round(p10_signed, 2),
            "p50_error_mw": round(p50_signed, 2),
            "p90_error_mw": round(p90_signed, 2),
        },
    }


def compute_metrics_by_horizon(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Compute accuracy metrics partitioned by forecast horizon bucket."""
    if df.empty or "horizon_hours" not in df.columns:
        return []

    df_copy = df.copy()
    df_copy["horizon_bucket"] = df_copy["horizon_hours"].apply(assign_horizon_bucket)

    results = []
    for bucket in HORIZON_BUCKET_ORDER:
        bucket_df = df_copy[df_copy["horizon_bucket"] == bucket]
        if bucket_df.empty:
            continue
        metrics = compute_accuracy_metrics(bucket_df)
        metrics["horizon_bucket"] = bucket
        results.append(metrics)

    return results


def compute_error_distribution(df: pd.DataFrame, bin_count: int = 25) -> Dict[str, Any]:
    """Compute histogram bin distribution of signed errors."""
    f_col = "forecast_generation_mw" if "forecast_generation_mw" in df.columns else "forecast_mw"
    a_col = "actual_generation_mw" if "actual_generation_mw" in df.columns else "actual_mw"

    if df.empty or f_col not in df.columns or a_col not in df.columns:
        return {"total_samples": 0, "min_error_mw": 0.0, "max_error_mw": 0.0, "bins": []}

    valid = df.dropna(subset=[f_col, a_col])
    if valid.empty:
        return {"total_samples": 0, "min_error_mw": 0.0, "max_error_mw": 0.0, "bins": []}

    errors = (valid[f_col] - valid[a_col]).to_numpy(dtype=float)
    total_samples = len(errors)

    min_err = float(np.min(errors))
    max_err = float(np.max(errors))

    counts, bin_edges = np.histogram(errors, bins=bin_count)
    bins = []
    for i in range(len(counts)):
        bins.append({
            "bin_start_mw": round(float(bin_edges[i]), 1),
            "bin_end_mw": round(float(bin_edges[i + 1]), 1),
            "count": int(counts[i]),
            "frequency_pct": round(float(counts[i] / total_samples * 100.0), 2),
        })

    return {
        "total_samples": total_samples,
        "min_error_mw": round(min_err, 2),
        "max_error_mw": round(max_err, 2),
        "bins": bins,
    }
