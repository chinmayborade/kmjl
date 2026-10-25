"""
Elexon BMRS Data Ingestion Script for UK Wind Forecast Portal.

Fetches historical generation data for January 2026 (plus padding):
  - Actual generation: FUELHH stream (fuelType == 'WIND')
  - Forecast generation: WINDFOR stream

Saves cleaned, deduplicated datasets to local Parquet files for offline caching.
"""

import argparse
import json
import logging
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("refresh_data")

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
DEFAULT_START = "2025-12-28T00:00:00Z"
DEFAULT_END = "2026-02-01T23:59:59Z"


def fetch_stream_chunk(
    dataset: str,
    from_time: str,
    to_time: str,
    timeout: int = 60,
) -> List[Dict]:
    """Fetch a time chunk from an Elexon BMRS stream endpoint."""
    params = {
        "publishDateTimeFrom": from_time,
        "publishDateTimeTo": to_time,
    }
    url = f"{ELEXON_BASE_URL}/{dataset}/stream?{urllib.parse.urlencode(params)}"
    logger.info("Fetching %s from %s to %s", dataset, from_time, to_time)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "UKWindForecastPortal/1.0 (+https://github.com)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} error from {url}")
        content = resp.read().decode("utf-8")
        return json.loads(content)


def fetch_dataset_in_chunks(
    dataset: str,
    start_dt: datetime,
    end_dt: datetime,
    chunk_days: int = 5,
) -> List[Dict]:
    """Fetch dataset over full date range using consecutive time chunks."""
    all_records: List[Dict] = []
    current_start = start_dt

    while current_start < end_dt:
        current_end = min(current_start + timedelta(days=chunk_days), end_dt)
        from_str = current_start.strftime("%Y-%m-%dT%H:%M:%SZ")
        to_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")

        try:
            records = fetch_stream_chunk(dataset, from_str, to_str)
            all_records.extend(records)
            logger.info(
                "Chunk [%s -> %s]: received %d records (total so far: %d)",
                from_str,
                to_str,
                len(records),
                len(all_records),
            )
        except Exception as exc:
            logger.error("Failed fetching %s chunk [%s -> %s]: %s", dataset, from_str, to_str, exc)
            raise

        current_start = current_end

    return all_records


def clean_actuals(records: List[Dict]) -> pd.DataFrame:
    """Filter and normalize FUELHH records for WIND generation."""
    if not records:
        logger.warning("No FUELHH records to clean.")
        return pd.DataFrame(
            columns=["publishTime", "startTime", "settlementDate", "settlementPeriod", "fuelType", "generation"]
        )

    df = pd.DataFrame(records)
    # Filter for wind only
    if "fuelType" in df.columns:
        df = df[df["fuelType"] == "WIND"].copy()
    else:
        logger.warning("'fuelType' column missing from FUELHH records.")

    # Convert timestamps
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    # Drop null generation
    df = df.dropna(subset=["startTime", "generation"])

    # Deduplicate: if multiple publishes for the same startTime, keep the latest publishTime
    df = df.sort_values(by=["startTime", "publishTime"]).drop_duplicates(
        subset=["startTime"], keep="last"
    )

    df = df.sort_values(by="startTime").reset_index(drop=True)
    logger.info("Cleaned actuals (WIND): %d half-hourly records", len(df))
    return df


def clean_forecasts(records: List[Dict]) -> pd.DataFrame:
    """Normalize and deduplicate WINDFOR records."""
    if not records:
        logger.warning("No WINDFOR records to clean.")
        return pd.DataFrame(columns=["publishTime", "startTime", "generation"])

    df = pd.DataFrame(records)
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df.dropna(subset=["publishTime", "startTime", "generation"])

    # Deduplicate exact duplicate rows
    df = df.drop_duplicates(subset=["publishTime", "startTime"]).reset_index(drop=True)
    df = df.sort_values(by=["publishTime", "startTime"]).reset_index(drop=True)
    logger.info("Cleaned forecasts: %d records across unique publish times", len(df))
    return df


def run_ingestion(
    start_str: str = DEFAULT_START,
    end_str: str = DEFAULT_END,
    output_dir: Optional[str] = None,
) -> None:
    """Run full ingestion and save Parquet caches."""
    if output_dir is None:
        # Default to workspace root / data
        script_dir = Path(__file__).resolve().parent
        output_dir = str(script_dir.parent.parent / "data")

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    start_dt = datetime.strptime(start_str, "%Y-%m-%dT%H:%M:%SZ")
    end_dt = datetime.strptime(end_str, "%Y-%m-%dT%H:%M:%SZ")

    logger.info("Starting ingestion: %s to %s", start_str, end_str)
    logger.info("Destination directory: %s", out_path.resolve())

    # 1. Fetch & clean FUELHH
    actual_records = fetch_dataset_in_chunks("FUELHH", start_dt, end_dt, chunk_days=5)
    actuals_df = clean_actuals(actual_records)
    actuals_parquet = out_path / "actuals.parquet"
    actuals_df.to_parquet(actuals_parquet, index=False)
    logger.info("Saved actuals cache to %s (%d rows)", actuals_parquet, len(actuals_df))

    # 2. Fetch & clean WINDFOR
    forecast_records = fetch_dataset_in_chunks("WINDFOR", start_dt, end_dt, chunk_days=5)
    forecasts_df = clean_forecasts(forecast_records)
    forecasts_parquet = out_path / "forecasts.parquet"
    forecasts_df.to_parquet(forecasts_parquet, index=False)
    logger.info("Saved forecasts cache to %s (%d rows)", forecasts_parquet, len(forecasts_df))

    # Save summary metadata
    meta = {
        "ingestion_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "start_requested": start_str,
        "end_requested": end_str,
        "actuals_count": len(actuals_df),
        "actuals_min_time": actuals_df["startTime"].min().isoformat() if not actuals_df.empty else None,
        "actuals_max_time": actuals_df["startTime"].max().isoformat() if not actuals_df.empty else None,
        "forecasts_count": len(forecasts_df),
        "forecasts_min_publish": forecasts_df["publishTime"].min().isoformat() if not forecasts_df.empty else None,
        "forecasts_max_publish": forecasts_df["publishTime"].max().isoformat() if not forecasts_df.empty else None,
    }
    with open(out_path / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    logger.info("Ingestion completed successfully. Meta written to metadata.json.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Elexon BMRS January 2026 wind data.")
    parser.add_argument("--start", default=DEFAULT_START, help="Start ISO timestamp")
    parser.add_argument("--end", default=DEFAULT_END, help="End ISO timestamp")
    parser.add_argument("--output-dir", default=None, help="Target directory for parquet caches")
    args = parser.parse_args()

    run_ingestion(start_str=args.start, end_str=args.end, output_dir=args.output_dir)
