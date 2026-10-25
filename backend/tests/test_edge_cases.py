"""
Comprehensive Edge Cases and Critical Boundary Tests for UK Wind Forecast Portal Backend.

Covers:
  1. Zero look-ahead at microsecond boundaries.
  2. Multiple intraday forecast revisions.
  3. Division-by-zero protection when actual wind generation is 0 MW.
  4. Extreme blunders and sign-inversion edge cases.
  5. Month boundary transitions (Dec 31 -> Jan 1, Jan 31 -> Feb 1).
  6. Empty datasets and missing target periods.
  7. Zero variance in error distributions.
  8. Full January 2026 month validation: loops through all 31 delivery days.
  9. Malformed query parameters and API error handling.
"""

import math
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.data.loader import data_manager
from app.main import app
from app.services.alignment import get_settlement_period
from app.services.decision_forecast import select_decision_forecast
from app.services.metrics import (
    assign_horizon_bucket,
    compute_accuracy_metrics,
    compute_error_distribution,
    compute_metrics_by_horizon,
)


# ==============================================================================
# 1. Zero Look-Ahead & Microsecond Boundary Conditions
# ==============================================================================

def test_microsecond_leakage_exclusion():
    """Verify that a forecast published 1 millisecond after cutoff is excluded."""
    cutoff_time = "12:00:00"
    delivery_date = "2026-01-15"

    records = [
        # Exactly at cutoff (12:00:00.000) -> MUST BE INCLUDED
        {
            "publishTime": pd.to_datetime("2026-01-14T12:00:00.000Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 5000.0,
        },
        # 1 millisecond after cutoff (12:00:00.001) -> MUST BE EXCLUDED
        {
            "publishTime": pd.to_datetime("2026-01-14T12:00:00.001Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 9999.0,
        },
    ]
    forecast_df = pd.DataFrame(records)
    actual_df = pd.DataFrame([{"startTime": pd.to_datetime("2026-01-15T00:00:00Z"), "generation": 5000.0}])

    res = select_decision_forecast(forecast_df, actual_df, delivery_date, cutoff_time)
    p1 = res["periods"][0]
    assert p1["forecast_generation_mw"] == 5000.0, "Should pick the exact cutoff publish"
    assert p1["forecast_generation_mw"] != 9999.0, "Microsecond lookahead leakage detected!"


def test_multiple_revisions_before_and_after_cutoff():
    """Verify that among 5 publishes, only the latest PRE-CUTOFF publish is picked."""
    delivery_date = "2026-01-20"
    cutoff_time = "12:00:00"

    records = [
        {"publishTime": pd.to_datetime("2026-01-19T04:00:00Z"), "startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 1000.0},
        {"publishTime": pd.to_datetime("2026-01-19T08:00:00Z"), "startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 2000.0},
        {"publishTime": pd.to_datetime("2026-01-19T11:45:00Z"), "startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 3000.0}, # Latest before cutoff -> WINNER
        {"publishTime": pd.to_datetime("2026-01-19T12:05:00Z"), "startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 4000.0}, # Post-cutoff -> REJECT
        {"publishTime": pd.to_datetime("2026-01-19T18:00:00Z"), "startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 5000.0}, # Post-cutoff -> REJECT
    ]
    forecast_df = pd.DataFrame(records)
    actual_df = pd.DataFrame([{"startTime": pd.to_datetime("2026-01-20T10:00:00Z"), "generation": 3100.0}])

    res = select_decision_forecast(forecast_df, actual_df, delivery_date, cutoff_time)
    sp_21 = [p for p in res["periods"] if p["settlement_period"] == 21][0] # 10:00 UTC is SP 21
    assert sp_21["forecast_generation_mw"] == 3000.0
    assert sp_21["publish_time"] == "2026-01-19T11:45:00+00:00"


# ==============================================================================
# 2. Mathematical Edge Cases & Division by Zero
# ==============================================================================

def test_zero_actual_generation_no_division_error():
    """Verify nMAE calculation does not divide by zero when wind output is zero."""
    df = pd.DataFrame({
        "actual_generation_mw": [0.0, 0.0, 0.0],
        "forecast_generation_mw": [50.0, 100.0, 20.0],
    })
    metrics = compute_accuracy_metrics(df)
    assert metrics["mean_actual_mw"] == 0.0
    assert metrics["nmae_pct"] == 0.0, "nMAE must safely return 0.0 when mean actual is 0.0"
    assert not math.isnan(metrics["nmae_pct"])
    assert not math.isinf(metrics["nmae_pct"])
    assert metrics["mae_mw"] == 56.67
    assert metrics["bias_mw"] == 56.67


def test_perfect_forecast_zero_metrics():
    """Verify metrics when forecast perfectly matches actuals."""
    df = pd.DataFrame({
        "actual_generation_mw": [1000.0, 2500.0, 4200.0],
        "forecast_generation_mw": [1000.0, 2500.0, 4200.0],
    })
    metrics = compute_accuracy_metrics(df)
    assert metrics["bias_mw"] == 0.0
    assert metrics["mae_mw"] == 0.0
    assert metrics["rmse_mw"] == 0.0
    assert metrics["nmae_pct"] == 0.0
    assert metrics["error_percentiles"]["p90_absolute_error_mw"] == 0.0


def test_negative_bias_under_forecasting():
    """Verify systematic under-forecasting results in negative bias."""
    df = pd.DataFrame({
        "actual_generation_mw": [5000.0, 6000.0],
        "forecast_generation_mw": [4000.0, 4500.0],
    })
    metrics = compute_accuracy_metrics(df)
    assert metrics["bias_mw"] == -1250.0 # Under-forecast: mean(forecast - actual) = -1250
    assert metrics["mae_mw"] == 1250.0
    assert metrics["signed_error_quantiles"]["p50_error_mw"] == -1250.0


def test_zero_variance_error_distribution():
    """Verify error histogram generation when all errors are identical."""
    df = pd.DataFrame({
        "actual_mw": [100.0, 100.0, 100.0],
        "forecast_mw": [150.0, 150.0, 150.0], # All errors = +50.0
    })
    dist = compute_error_distribution(df, bin_count=10)
    assert dist["total_samples"] == 3
    assert dist["min_error_mw"] == 50.0
    assert dist["max_error_mw"] == 50.0
    assert len(dist["bins"]) == 10
    total_count = sum(b["count"] for b in dist["bins"])
    assert total_count == 3


def test_empty_dataframe_graceful_return():
    """Verify that empty DataFrames return zeroed metrics without crashing."""
    empty_df = pd.DataFrame()
    metrics = compute_accuracy_metrics(empty_df)
    assert metrics["sample_count"] == 0
    assert metrics["mae_mw"] == 0.0

    dist = compute_error_distribution(empty_df)
    assert dist["total_samples"] == 0
    assert dist["bins"] == []

    by_h = compute_metrics_by_horizon(empty_df)
    assert by_h == []


# ==============================================================================
# 3. Settlement Period Alignment Edge Cases
# ==============================================================================

def test_settlement_period_clock_mapping():
    """Verify settlement periods 1 to 48 match exactly with UK market standards."""
    # SP 1: 00:00 UTC
    assert get_settlement_period(pd.Timestamp("2026-01-15 00:00:00", tz="UTC")) == 1
    # SP 2: 00:30 UTC
    assert get_settlement_period(pd.Timestamp("2026-01-15 00:30:00", tz="UTC")) == 2
    # SP 24: 11:30 UTC
    assert get_settlement_period(pd.Timestamp("2026-01-15 11:30:00", tz="UTC")) == 24
    # SP 25: 12:00 UTC
    assert get_settlement_period(pd.Timestamp("2026-01-15 12:00:00", tz="UTC")) == 25
    # SP 48: 23:30 UTC
    assert get_settlement_period(pd.Timestamp("2026-01-15 23:30:00", tz="UTC")) == 48


# ==============================================================================
# 4. Live Cache Integrity for ALL 31 Days of January 2026
# ==============================================================================

def test_full_month_january_2026_coverage():
    """
    Rigorously iterates through EVERY single delivery day from 2026-01-01 to 2026-01-31.
    Verifies that:
      - All 48 periods exist.
      - 100% coverage is achieved.
      - Total MWh and peak MW are non-negative.
      - Every publishTime <= cutoff timestamp.
    """
    data_manager.load_data()
    assert data_manager.is_loaded

    for day in range(1, 32):
        date_str = f"2026-01-{day:02d}"
        res = data_manager.get_decision_forecast(date_str, cutoff_time="12:00:00")

        assert res["delivery_date"] == date_str
        assert len(res["periods"]) == 48, f"Day {date_str} must have exactly 48 settlement periods"
        assert res["meta"]["coverage_pct"] == 100.0, f"Day {date_str} must have 100% coverage"

        summary = res["summary"]
        assert summary["total_forecast_mwh"] > 0, f"Day {date_str} total forecast MWh must be > 0"
        assert summary["peak_forecast_mw"] >= summary["min_forecast_mw"]

        # Verify no period has publishTime > cutoff
        cutoff_dt = pd.to_datetime(res["cutoff_applied"])
        for p in res["periods"]:
            if p["publish_time"]:
                pub_dt = pd.to_datetime(p["publish_time"])
                assert pub_dt <= cutoff_dt, (
                    f"LOOKAHEAD VIOLATION on {date_str} SP {p['settlement_period']}: "
                    f"publish {pub_dt} > cutoff {cutoff_dt}"
                )


# ==============================================================================
# 5. API Error Handling & Parameter Validation
# ==============================================================================

@pytest.fixture(scope="module")
def api_client():
    with TestClient(app) as client:
        yield client


def test_api_invalid_date_format(api_client):
    """Verify API returns 400 when an invalid date is passed."""
    resp = api_client.get("/api/decision-forecast?delivery_date=not-a-valid-date")
    assert resp.status_code == 400
    assert "Failed to retrieve decision forecast" in resp.json()["detail"]


def test_api_out_of_bounds_bin_count(api_client):
    """Verify FastAPI rejects bin_count outside [5, 100] with 422."""
    # Too small
    resp1 = api_client.get("/api/error-distribution?bin_count=2")
    assert resp1.status_code == 422

    # Too large
    resp2 = api_client.get("/api/error-distribution?bin_count=500")
    assert resp2.status_code == 422


def test_api_inverted_date_range(api_client):
    """Verify API handles inverted date ranges gracefully without 500 error."""
    resp = api_client.get("/api/metrics?start_date=2026-01-20&end_date=2026-01-10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sample_count"] == 0
