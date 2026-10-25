"""
Temporal alignment service for UK Wind Forecast Portal.

Aligns hourly forecasts (WINDFOR) with half-hourly actuals (FUELHH).
"""

from datetime import datetime
from typing import Optional
import pandas as pd


def get_settlement_period(dt: pd.Timestamp) -> int:
    """
    Calculate the standard UK settlement period (1 to 48) for a given UTC timestamp.
    Period 1 starts at 00:00:00 UTC (00:00 to 00:30).
    Period 48 starts at 23:30:00 UTC (23:30 to 24:00).
    """
    return (dt.hour * 2) + (1 if dt.minute < 30 else 2)


def expand_hourly_forecast_to_half_hourly(df: pd.DataFrame) -> pd.DataFrame:
    """
    Expands hourly WINDFOR records to two 30-minute settlement periods.
    For an hourly record starting at HH:00:
      - Period 1: startTime = HH:00:00Z
      - Period 2: startTime = HH:30:00Z (same forecast generation value)
    """
    if df.empty:
        return df.copy()

    records = []
    for _, row in df.iterrows():
        # First 30-minute interval (:00)
        t1 = row["startTime"]
        rec1 = dict(row)
        rec1["startTime"] = t1
        rec1["settlementPeriod"] = get_settlement_period(t1)
        records.append(rec1)

        # Second 30-minute interval (:30)
        t2 = t1 + pd.Timedelta(minutes=30)
        rec2 = dict(row)
        rec2["startTime"] = t2
        rec2["settlementPeriod"] = get_settlement_period(t2)
        records.append(rec2)

    expanded_df = pd.DataFrame(records)
    return expanded_df


def aggregate_half_hourly_actuals_to_hourly(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregates 30-minute actuals to 60-minute mean generation.
    Floors startTime to the hour.
    """
    if df.empty:
        return df.copy()

    df_copy = df.copy()
    df_copy["hourlyStartTime"] = df_copy["startTime"].dt.floor("1h")
    agg_df = (
        df_copy.groupby("hourlyStartTime", as_index=False)
        .agg(
            generation=("generation", "mean"),
            period_count=("generation", "count"),
            publishTime=("publishTime", "max"),
        )
        .rename(columns={"hourlyStartTime": "startTime"})
    )
    return agg_df
