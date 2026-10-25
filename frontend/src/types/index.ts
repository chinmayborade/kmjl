/**
 * TypeScript Type Definitions for UK Wind Forecast Portal
 * Matching FastAPI Backend Pydantic Schemas
 */

export interface PeriodForecast {
  start_time: string;
  settlement_period: number;
  forecast_generation_mw: number | null;
  actual_generation_mw: number | null;
  publish_time: string | null;
  horizon_hours: number | null;
  error_mw: number | null;
  p10_bound_mw: number | null;
  p90_bound_mw: number | null;
}

export interface DecisionForecastSummary {
  total_forecast_mwh: number;
  total_actual_mwh: number | null;
  peak_forecast_mw: number;
  min_forecast_mw: number;
  day_bias_mw: number | null;
  day_mae_mw: number | null;
}

export interface DecisionForecastResponse {
  delivery_date: string;
  cutoff_applied: string;
  summary: DecisionForecastSummary;
  periods: PeriodForecast[];
}

export interface TimeSeriesPoint {
  start_time: string;
  settlement_period: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  horizon_hours: number | null;
  p10_bound_mw: number | null;
  p90_bound_mw: number | null;
}

export interface TimeSeriesResponse {
  start_date: string;
  end_date: string;
  cutoff_used: string;
  series: TimeSeriesPoint[];
}

export interface ErrorPercentiles {
  p50_absolute_error_mw: number;
  p90_absolute_error_mw: number;
  p95_absolute_error_mw: number;
}

export interface SignedErrorQuantiles {
  p10_error_mw: number;
  p50_error_mw: number;
  p90_error_mw: number;
}

export interface MetricsResponse {
  sample_count: number;
  mean_actual_mw: number;
  mean_forecast_mw: number;
  bias_mw: number;
  mae_mw: number;
  rmse_mw: number;
  nmae_pct: number;
  error_percentiles: ErrorPercentiles;
  signed_error_quantiles: SignedErrorQuantiles;
  start_date?: string;
  end_date?: string;
  horizon_bucket?: string;
}

export interface HorizonMetricsItem {
  horizon_bucket: string;
  sample_count: number;
  bias_mw: number;
  mae_mw: number;
  rmse_mw: number;
  nmae_pct: number;
  p50_abs_mw: number;
  p90_abs_mw: number;
  p95_abs_mw: number;
  p10_signed_mw: number;
  p50_signed_mw: number;
  p90_signed_mw: number;
}

export interface HorizonMetricsResponse {
  start_date: string;
  end_date: string;
  horizons: HorizonMetricsItem[];
}

export interface DistributionBin {
  bin_index: number;
  bin_start_mw: number;
  bin_end_mw: number;
  bin_center_mw: number;
  count: number;
  percentage: number;
  normal_fit_count: number;
  normal_fit_percentage: number;
}

export interface DistributionSummary {
  sample_count: number;
  mean_error_mw: number;
  std_error_mw: number;
  min_error_mw: number;
  max_error_mw: number;
  bin_count: number;
  bin_width_mw: number;
}

export interface ErrorDistributionResponse {
  start_date: string;
  end_date: string;
  horizon_bucket: string;
  summary: DistributionSummary;
  bins: DistributionBin[];
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  cache_loaded: boolean;
  data_range: {
    start: string;
    end: string;
  };
  total_actual_rows: number;
  total_forecast_rows: number;
  total_evaluated_pairs: number;
}

export interface SystemConfigResponse {
  default_cutoff_time: string;
  timezone: string;
  settlement_periods_per_day: number;
  supported_delivery_range: {
    min: string;
    max: string;
  };
  horizon_buckets: string[];
}
