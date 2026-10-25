"""
Configuration settings for UK Wind Forecast Portal backend.
"""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable override support."""

    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Path(os.environ.get("DATA_DIR", BASE_DIR / "data"))

    # Operational defaults
    DEFAULT_CUTOFF_TIME: str = "12:00:00"
    TIMEZONE: str = "UTC"
    DISPLAY_TIMEZONE: str = "Europe/London (GMT)"
    MIN_DELIVERY_DATE: str = "2026-01-01"
    MAX_DELIVERY_DATE: str = "2026-01-31"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = int(os.environ.get("PORT", 8000))
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"
    CORS_ORIGINS: List[str] = ["*"]

    # Market context
    MARKET_NAME: str = "UK Day-Ahead Wholesale Power Market"
    AUCTION_GATE_CLOSURE: str = "12:00:00 UTC (Day D-1)"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
