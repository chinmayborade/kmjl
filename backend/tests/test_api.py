"""
API contract and integration tests for UK Wind Forecast Portal.

Validates:
  1. GET /api/health
  2. GET /api/config
  3. GET /api/decision-forecast
  4. GET /api/forecast-vs-actual
  5. GET /api/metrics
  6. GET /api/metrics/by-horizon
  7. GET /api/error-distribution
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    """Verify /api/health returns operational status."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data
    assert "cache_loaded" in data


def test_config_endpoint(client):
    """Verify /api/config returns default operational parameters."""
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["default_cutoff_time"] == "12:00:00"
    assert data["timezone"] == "UTC"
    assert data["min_delivery_date"] == "2026-01-01"
    assert data["max_delivery_date"] == "2026-01-31"


def test_decision_forecast_endpoint(client):
    """Verify /api/decision-forecast for a January 2026 delivery date."""
    resp = client.get("/api/decision-forecast?delivery_date=2026-01-15&cutoff_time=12:00:00")
    assert resp.status_code == 200
    data = resp.json()
    assert data["delivery_date"] == "2026-01-15"
    assert "summary" in data
    assert "periods" in data
    assert len(data["periods"]) == 48
    assert data["meta"]["total_periods_expected"] == 48


def test_forecast_vs_actual_endpoint(client):
    """Verify /api/forecast-vs-actual series response."""
    resp = client.get("/api/forecast-vs-actual?start_date=2026-01-01&end_date=2026-01-03")
    assert resp.status_code == 200
    data = resp.json()
    assert "series" in data
    assert len(data["series"]) > 0


def test_metrics_endpoint(client):
    """Verify /api/metrics overall and with horizon bucket filtering."""
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "mae_mw" in data
    assert "rmse_mw" in data
    assert "bias_mw" in data
    assert "nmae_pct" in data
    assert "error_percentiles" in data

    resp_bucket = client.get("/api/metrics?horizon_bucket=12-24h")
    assert resp_bucket.status_code == 200
    assert resp_bucket.json()["horizon_bucket"] == "12-24h"


def test_metrics_by_horizon_endpoint(client):
    """Verify /api/metrics/by-horizon returns partitioned buckets."""
    resp = client.get("/api/metrics/by-horizon")
    assert resp.status_code == 200
    data = resp.json()
    assert "buckets" in data
    assert len(data["buckets"]) > 0


def test_error_distribution_endpoint(client):
    """Verify /api/error-distribution histogram response."""
    resp = client.get("/api/error-distribution?bin_count=20")
    assert resp.status_code == 200
    data = resp.json()
    assert "bins" in data
    assert len(data["bins"]) == 20
