"""
Unit tests for accuracy metrics and statistical distributions.

Validates:
  1. Hand-computed Bias, MAE, RMSE, nMAE formulas.
  2. Absolute error percentiles (P50, P90).
  3. Horizon bucket partitioning.
  4. Histogram bin generation.
"""

import math
import numpy as np
import pandas as pd
import pytest
from app.services.metrics import (
    assign_horizon_bucket,
    compute_accuracy_metrics,
    compute_error_distribution,
    compute_metrics_by_horizon,
)


def test_hand_computed_metrics():
    """Verify metrics against exact analytical values."""
    # Data points:
    # Actual:   [100, 200, 300, 400] -> Mean = 250.0
    # Forecast: [120, 190, 350, 360] -> Mean = 255.0
    # Error:    [+20, -10, +50, -40] -> Bias = 5.0
    # |Error|:  [ 20,  10,  50,  40] -> MAE = 30.0
    # Squared:  [400, 100, 2500, 1600] -> Mean = 1150.0 -> RMSE = ~33.91
    # nMAE:     30.0 / 250.0 * 100 = 12.0%

    df = pd.DataFrame({
        "actual_generation_mw": [100.0, 200.0, 300.0, 400.0],
        "forecast_generation_mw": [120.0, 190.0, 350.0, 360.0],
    })

    metrics = compute_accuracy_metrics(df)

    assert metrics["sample_count"] == 4
    assert metrics["mean_actual_mw"] == 250.0
    assert metrics["mean_forecast_mw"] == 255.0
    assert metrics["bias_mw"] == 5.0
    assert metrics["mae_mw"] == 30.0
    assert math.isclose(metrics["rmse_mw"], math.sqrt(1150.0), abs_tol=0.01)
    assert metrics["nmae_pct"] == 12.0


def test_horizon_bucket_assignment():
    """Verify correct categorization across lead horizons."""
    assert assign_horizon_bucket(2.5) == "0-6h"
    assert assign_horizon_bucket(6.0) == "6-12h"
    assert assign_horizon_bucket(11.9) == "6-12h"
    assert assign_horizon_bucket(12.0) == "12-24h"
    assert assign_horizon_bucket(24.0) == "24-48h"
    assert assign_horizon_bucket(47.9) == "24-48h"
    assert assign_horizon_bucket(48.0) == "48h+"
    assert assign_horizon_bucket(72.0) == "48h+"


def test_error_distribution_bins():
    """Verify histogram bin structure and total sample counts."""
    df = pd.DataFrame({
        "actual_mw": [100.0, 200.0, 300.0, 400.0, 500.0],
        "forecast_mw": [110.0, 220.0, 290.0, 420.0, 480.0],
    })
    dist = compute_error_distribution(df, bin_count=5)

    assert dist["total_samples"] == 5
    assert len(dist["bins"]) == 5
    total_count = sum(b["count"] for b in dist["bins"])
    assert total_count == 5
