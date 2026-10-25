/**
 * API Client for UK Wind Forecast Portal
 * Connects to FastAPI Backend at /api/*
 */

import axios from 'axios';
import {
  DecisionForecastResponse,
  TimeSeriesResponse,
  MetricsResponse,
  HorizonMetricsResponse,
  ErrorDistributionResponse,
  SystemHealthResponse,
  SystemConfigResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  getHealth: async (): Promise<SystemHealthResponse> => {
    const res = await api.get<SystemHealthResponse>('/health');
    return res.data;
  },

  getConfig: async (): Promise<SystemConfigResponse> => {
    const res = await api.get<SystemConfigResponse>('/config');
    return res.data;
  },

  getDecisionForecast: async (
    deliveryDate: string,
    cutoffTime?: string
  ): Promise<DecisionForecastResponse> => {
    const params: Record<string, string> = { delivery_date: deliveryDate };
    if (cutoffTime) params.cutoff_time = cutoffTime;
    const res = await api.get<DecisionForecastResponse>('/decision-forecast', { params });
    return res.data;
  },

  getForecastVsActual: async (
    startDate?: string,
    endDate?: string,
    horizonBucket?: string
  ): Promise<TimeSeriesResponse> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (horizonBucket) params.horizon_bucket = horizonBucket;
    const res = await api.get<TimeSeriesResponse>('/forecast-vs-actual', { params });
    return res.data;
  },

  getMetrics: async (
    startDate?: string,
    endDate?: string,
    horizonBucket?: string
  ): Promise<MetricsResponse> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (horizonBucket && horizonBucket !== 'all') params.horizon_bucket = horizonBucket;
    const res = await api.get<MetricsResponse>('/metrics', { params });
    return res.data;
  },

  getMetricsByHorizon: async (
    startDate?: string,
    endDate?: string
  ): Promise<HorizonMetricsResponse> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get<HorizonMetricsResponse>('/metrics/by-horizon', { params });
    return res.data;
  },

  getErrorDistribution: async (
    startDate?: string,
    endDate?: string,
    horizonBucket?: string,
    bins: number = 20
  ): Promise<any> => {
    const params: Record<string, string | number> = { bin_count: bins };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (horizonBucket && horizonBucket !== 'all') params.horizon_bucket = horizonBucket;
    const res = await api.get('/error-distribution', { params });
    return res.data;
  },
};

export default apiClient;
