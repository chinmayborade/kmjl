"""
Unit tests for zero look-ahead decision forecast selection.

Validates:
  1. Forecasts published after cutoff are strictly excluded (no look-ahead leakage).
  2. The latest forecast published at or before cutoff is chosen.
  3. Exact boundary condition (publishTime == cutoff) is included.
  4. Exact post-boundary condition (publishTime == cutoff + 1s) is excluded.
  5. 48 half-hour settlement periods are correctly populated.
"""

import pandas as pd
import pytest
from app.services.decision_forecast import select_decision_forecast


@pytest.fixture
def synthetic_forecast_data():
    """Create a synthetic dataset to rigorously test look-ahead and cutoff edge cases."""
    records = [
        # Target period: 2026-01-15 00:00:00 UTC (Delivery Day D)
        # Cutoff on Day D-1 is 2026-01-14 12:00:00 UTC

        # Publish 1: 08:00 on D-1 (Well before cutoff, generation = 5000)
        {
            "publishTime": pd.to_datetime("2026-01-14T08:00:00Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 5000.0,
        },
        # Publish 2: 11:30 on D-1 (Later before cutoff, generation = 6000) -> Should WIN
        {
            "publishTime": pd.to_datetime("2026-01-14T11:30:00Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 6000.0,
        },
        # Publish 3: 12:00:01 on D-1 (1 second AFTER cutoff, generation = 9999) -> MUST BE EXCLUDED!
        {
            "publishTime": pd.to_datetime("2026-01-14T12:00:01Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 9999.0,
        },
        # Publish 4: 16:00 on D-1 (Hindsight forecast, generation = 99999) -> MUST BE EXCLUDED!
        {
            "publishTime": pd.to_datetime("2026-01-14T16:00:00Z"),
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 99999.0,
        },

        # Target period: 2026-01-15 01:00:00 UTC (Boundary test: publishTime exactly at 12:00:00)
        {
            "publishTime": pd.to_datetime("2026-01-14T12:00:00Z"),
            "startTime": pd.to_datetime("2026-01-15T01:00:00Z"),
            "generation": 7500.0,
        },
    ]
    return pd.DataFrame(records)


@pytest.fixture
def synthetic_actual_data():
    """Create corresponding synthetic actual generation."""
    records = [
        {
            "startTime": pd.to_datetime("2026-01-15T00:00:00Z"),
            "generation": 5800.0,
        },
        {
            "startTime": pd.to_datetime("2026-01-15T00:30:00Z"),
            "generation": 5900.0,
        },
        {
            "startTime": pd.to_datetime("2026-01-15T01:00:00Z"),
            "generation": 7200.0,
        },
    ]
    return pd.DataFrame(records)


def test_zero_lookahead_and_latest_selection(synthetic_forecast_data, synthetic_actual_data):
    """Test that forecasts after cutoff are ignored and latest valid publish wins."""
    res = select_decision_forecast(
        synthetic_forecast_data,
        synthetic_actual_data,
        delivery_date="2026-01-15",
        cutoff_time="12:00:00",
    )

    periods = {p["settlement_period"]: p for p in res["periods"]}

    # Settlement period 1 (00:00 to 00:30)
    p1 = periods[1]
    assert p1["forecast_generation_mw"] == 6000.0, "Should pick 11:30 publish (6000 MW), not 08:00 (5000 MW)"
    assert p1["forecast_generation_mw"] != 9999.0, "LOOK-AHEAD LEAKAGE: 12:00:01 publish must not be selected!"
    assert p1["forecast_generation_mw"] != 99999.0, "LOOK-AHEAD LEAKAGE: 16:00 publish must not be selected!"
    assert p1["actual_generation_mw"] == 5800.0
    assert p1["error_mw"] == 200.0  # 6000 - 5800


def test_boundary_equality_included(synthetic_forecast_data, synthetic_actual_data):
    """Test that publishTime exactly equal to cutoff (12:00:00) is included."""
    res = select_decision_forecast(
        synthetic_forecast_data,
        synthetic_actual_data,
        delivery_date="2026-01-15",
        cutoff_time="12:00:00",
    )

    periods = {p["settlement_period"]: p for p in res["periods"]}
    # Settlement period 3 is 01:00:00
    p3 = periods[3]
    assert p3["forecast_generation_mw"] == 7500.0, "Forecast published exactly at 12:00:00 must be included"
    assert p3["actual_generation_mw"] == 7200.0
    assert p3["error_mw"] == 300.0


def test_all_48_periods_present(synthetic_forecast_data, synthetic_actual_data):
    """Verify that all 48 settlement periods are returned with proper metadata."""
    res = select_decision_forecast(
        synthetic_forecast_data,
        synthetic_actual_data,
        delivery_date="2026-01-15",
        cutoff_time="12:00:00",
    )

    assert len(res["periods"]) == 48
    assert res["meta"]["total_periods_expected"] == 48
    assert res["delivery_date"] == "2026-01-15"
    assert "cutoff_applied" in res
