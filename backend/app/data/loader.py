"""
In-memory Data Manager and Cache Loader for UK Wind Forecast Portal.

Loads cached Parquet files on application startup, pre-computes empirical
error quantiles by horizon, and provides indexed data access for all API routes.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.config import settings
from app.services.alignment import get_settlement_period
from app.services.decision_forecast import select_decision_forecast
from app.services.metrics import (
    assign_horizon_bucket,
    compute_accuracy_metrics,
    compute_error_distribution,
    compute_metrics_by_horizon,
)

logger = logging.getLogger("data_loader")


class DataManager:
    """Manages cached actuals and forecasts, providing high-performance query execution."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.actuals_df: pd.DataFrame = pd.DataFrame()
        self.forecasts_df: pd.DataFrame = pd.DataFrame()
        self.aligned_df: pd.DataFrame = pd.DataFrame()
        self.horizon_quantiles: Dict[str, Dict[str, float]] = {}
        self.is_loaded: bool = False

    def load_data(self) -> None:
        """Load Parquet caches and build indexed alignment tables."""
        actuals_file = self.data_dir / "actuals.parquet"
        forecasts_file = self.data_dir / "forecasts.parquet"

        if not actuals_file.exists() or not forecasts_file.exists():
            logger.warning(
                "Parquet cache missing in %s. Please run refresh_data.py.",
                self.data_dir,
            )
            return

        logger.info("Loading actuals from %s", actuals_file)
        self.actuals_df = pd.read_parquet(actuals_file)
        self.actuals_df["startTime"] = pd.to_datetime(self.actuals_df["startTime"], utc=True)
        self.actuals_df["publishTime"] = pd.to_datetime(self.actuals_df["publishTime"], utc=True)

        logger.info("Loading forecasts from %s", forecasts_file)
        self.forecasts_df = pd.read_parquet(forecasts_file)
        self.forecasts_df["startTime"] = pd.to_datetime(self.forecasts_df["startTime"], utc=True)
        self.forecasts_df["publishTime"] = pd.to_datetime(self.forecasts_df["publishTime"], utc=True)

        # Build day-ahead decision forecast aligned dataset for the entire month
        self._build_aligned_evaluation_dataset()
        self.is_loaded = True
        logger.info(
            "DataManager successfully initialized. Loaded %d actuals and %d forecasts.",
            len(self.actuals_df),
            len(self.forecasts_df),
        )

    def _build_aligned_evaluation_dataset(self) -> None:
        """
        Builds evaluation pairs across the entire month based on standard day-ahead cutoff
        (12:00 UTC D-1) and variable lead times to derive empirical horizon quantiles.
        """
        if self.actuals_df.empty or self.forecasts_df.empty:
            return

        # Prepare hourly actuals for clean 1-to-1 matching with hourly WINDFOR forecasts
        actuals_hourly = (
            self.actuals_df.copy()
            .assign(hourlyStartTime=lambda x: x["startTime"].dt.floor("1h"))
            .groupby("hourlyStartTime", as_index=False)
            .agg(actual_generation_mw=("generation", "mean"))
            .rename(columns={"hourlyStartTime": "startTime"})
        )

        # Merge WINDFOR forecasts with hourly actuals
        merged = pd.merge(
            self.forecasts_df.rename(columns={"generation": "forecast_generation_mw"}),
            actuals_hourly,
            on="startTime",
            how="inner",
        )

        # Compute lead horizon in hours
        merged["horizon_hours"] = (
            (merged["startTime"] - merged["publishTime"]).dt.total_seconds() / 3600.0
        )
        # Keep positive horizons up to 72 hours
        merged = merged[(merged["horizon_hours"] >= 0) & (merged["horizon_hours"] <= 72.0)].copy()

        # Signed error: forecast - actual
        merged["error_mw"] = merged["forecast_generation_mw"] - merged["actual_generation_mw"]
        merged["horizon_bucket"] = merged["horizon_hours"].apply(assign_horizon_bucket)

        self.aligned_df = merged

        # Calculate empirical signed error quantiles (P10, P90) per horizon bucket
        for bucket, group in merged.groupby("horizon_bucket"):
            errs = group["error_mw"].to_numpy()
            if len(errs) > 0:
                self.horizon_quantiles[str(bucket)] = {
                    "p10": float(np.percentile(errs, 10)),
                    "p50": float(np.percentile(errs, 50)),
                    "p90": float(np.percentile(errs, 90)),
                }

        logger.info("Empirical horizon quantiles calculated: %s", self.horizon_quantiles)

    def get_health(self) -> Dict[str, Any]:
        """Return system health and data coverage summary."""
        if not self.is_loaded:
            self.load_data()

        min_actual = self.actuals_df["startTime"].min().isoformat() if not self.actuals_df.empty else None
        max_actual = self.actuals_df["startTime"].max().isoformat() if not self.actuals_df.empty else None

        return {
            "status": "healthy" if self.is_loaded else "degraded",
            "version": "1.0.0",
            "cache_loaded": self.is_loaded,
            "data_range": {
                "start": min_actual,
                "end": max_actual,
            },
            "total_actual_rows": len(self.actuals_df),
            "total_forecast_rows": len(self.forecasts_df),
            "total_evaluated_pairs": len(self.aligned_df),
        }

    def get_decision_forecast(
        self,
        delivery_date: str,
        cutoff_time: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute decision forecast for chosen delivery date and cutoff."""
        if not self.is_loaded:
            self.load_data()
        applied_cutoff = cutoff_time or settings.DEFAULT_CUTOFF_TIME
        return select_decision_forecast(
            self.forecasts_df,
            self.actuals_df,
            delivery_date,
            applied_cutoff,
            self.horizon_quantiles,
        )

    def get_forecast_vs_actual(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        horizon_bucket: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve aligned time-series of forecast vs actual for charting."""
        if not self.is_loaded:
            self.load_data()
        start = start_date or settings.MIN_DELIVERY_DATE
        end = end_date or settings.MAX_DELIVERY_DATE

        start_dt = pd.to_datetime(start).tz_localize("UTC")
        end_dt = pd.to_datetime(end).tz_localize("UTC") + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)

        current_date = start_dt
        all_series = []

        while current_date <= end_dt:
            d_str = current_date.strftime("%Y-%m-%d")
            res = self.get_decision_forecast(d_str, settings.DEFAULT_CUTOFF_TIME)
            for p in res["periods"]:
                if p["forecast_generation_mw"] is not None or p["actual_generation_mw"] is not None:
                    all_series.append({
                        "start_time": p["start_time"],
                        "settlement_period": p["settlement_period"],
                        "forecast_mw": p["forecast_generation_mw"],
                        "actual_mw": p["actual_generation_mw"],
                        "error_mw": p["error_mw"],
                        "horizon_hours": p["horizon_hours"],
                        "p10_bound_mw": p["p10_bound_mw"],
                        "p90_bound_mw": p["p90_bound_mw"],
                    })
            current_date += pd.Timedelta(days=1)

        return {
            "start_date": start,
            "end_date": end,
            "cutoff_used": settings.DEFAULT_CUTOFF_TIME,
            "series": all_series,
        }

    def get_metrics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        horizon_bucket: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute aggregated metrics over date range and optional horizon bucket."""
        if not self.is_loaded:
            self.load_data()
        df = self.aligned_df.copy()
        if df.empty:
            metrics = compute_accuracy_metrics(df)
            metrics["start_date"] = start_date or settings.MIN_DELIVERY_DATE
            metrics["end_date"] = end_date or settings.MAX_DELIVERY_DATE
            metrics["horizon_bucket"] = horizon_bucket or "all"
            return metrics

        if start_date:
            s_dt = pd.to_datetime(start_date).tz_localize("UTC")
            df = df[df["startTime"] >= s_dt]
        if end_date:
            e_dt = pd.to_datetime(end_date).tz_localize("UTC") + pd.Timedelta(days=1)
            df = df[df["startTime"] < e_dt]

        if horizon_bucket and horizon_bucket.lower() != "all":
            df = df[df["horizon_bucket"] == horizon_bucket]

        metrics = compute_accuracy_metrics(df)
        metrics["start_date"] = start_date or settings.MIN_DELIVERY_DATE
        metrics["end_date"] = end_date or settings.MAX_DELIVERY_DATE
        metrics["horizon_bucket"] = horizon_bucket or "all"
        return metrics

    def get_metrics_by_horizon(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute metrics breakdown across all horizon buckets."""
        if not self.is_loaded:
            self.load_data()
        df = self.aligned_df.copy()
        if start_date:
            s_dt = pd.to_datetime(start_date).tz_localize("UTC")
            df = df[df["startTime"] >= s_dt]
        if end_date:
            e_dt = pd.to_datetime(end_date).tz_localize("UTC") + pd.Timedelta(days=1)
            df = df[df["startTime"] < e_dt]

        buckets = compute_metrics_by_horizon(df)
        return {
            "start_date": start_date or settings.MIN_DELIVERY_DATE,
            "end_date": end_date or settings.MAX_DELIVERY_DATE,
            "buckets": buckets,
            "horizons": buckets,
        }

    def get_error_distribution(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bin_count: int = 25,
    ) -> Dict[str, Any]:
        """Compute error distribution histogram."""
        if not self.is_loaded:
            self.load_data()
        df = self.aligned_df.copy()
        if start_date:
            s_dt = pd.to_datetime(start_date).tz_localize("UTC")
            df = df[df["startTime"] >= s_dt]
        if end_date:
            e_dt = pd.to_datetime(end_date).tz_localize("UTC") + pd.Timedelta(days=1)
            df = df[df["startTime"] < e_dt]

        dist = compute_error_distribution(df, bin_count=bin_count)
        dist["start_date"] = start_date or settings.MIN_DELIVERY_DATE
        dist["end_date"] = end_date or settings.MAX_DELIVERY_DATE
        return dist


# Global singleton instance
data_manager = DataManager()
