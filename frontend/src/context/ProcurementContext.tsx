/**
 * Central State Management: ProcurementContext
 * Unifies Top Controls, Analytical Charts, and React Flow Pipeline Canvas
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '../api/client';
import {
  DecisionForecastResponse,
  TimeSeriesResponse,
  MetricsResponse,
  HorizonMetricsResponse,
  ErrorDistributionResponse,
  SystemHealthResponse,
} from '../types';

interface ProcurementContextType {
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
  cutoffTime: string;
  setCutoffTime: (time: string) => void;
  selectedHorizonBucket: string;
  setSelectedHorizonBucket: (bucket: string) => void;
  distributionBins: number;
  setDistributionBins: (bins: number) => void;

  decisionData: DecisionForecastResponse | null;
  timeSeriesData: TimeSeriesResponse | null;
  metricsData: MetricsResponse | null;
  horizonMetricsData: HorizonMetricsResponse | null;
  errorDistributionData: ErrorDistributionResponse | null;
  healthData: SystemHealthResponse | null;

  isLoadingDecision: boolean;
  isLoadingMetrics: boolean;
  error: string | null;

  refreshDecision: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default states for UK January 2026 procurement evaluations
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('12:00:00');
  const [selectedHorizonBucket, setSelectedHorizonBucket] = useState<string>('all');
  const [distributionBins, setDistributionBins] = useState<number>(20);

  const [decisionData, setDecisionData] = useState<DecisionForecastResponse | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [horizonMetricsData, setHorizonMetricsData] = useState<HorizonMetricsResponse | null>(null);
  const [errorDistributionData, setErrorDistributionData] = useState<ErrorDistributionResponse | null>(null);
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);

  const [isLoadingDecision, setIsLoadingDecision] = useState<boolean>(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load Initial System Health
  useEffect(() => {
    apiClient.getHealth()
      .then(setHealthData)
      .catch((err) => console.warn('Health check warning:', err));
  }, []);

  // Fetch Decision Forecast whenever deliveryDate or cutoffTime changes
  const refreshDecision = useCallback(async () => {
    setIsLoadingDecision(true);
    setError(null);
    try {
      const data = await apiClient.getDecisionForecast(deliveryDate, cutoffTime);
      setDecisionData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load decision forecast');
    } finally {
      setIsLoadingDecision(false);
    }
  }, [deliveryDate, cutoffTime]);

  useEffect(() => {
    refreshDecision();
  }, [refreshDecision]);

  // Fetch Accuracy Metrics & Distribution whenever horizon or bins change
  const refreshMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const [m, hm, dist, ts] = await Promise.all([
        apiClient.getMetrics('2026-01-01', '2026-01-31', selectedHorizonBucket),
        apiClient.getMetricsByHorizon('2026-01-01', '2026-01-31'),
        apiClient.getErrorDistribution('2026-01-01', '2026-01-31', selectedHorizonBucket, distributionBins),
        apiClient.getForecastVsActual('2026-01-01', '2026-01-31'),
      ]);
      setMetricsData(m);
      setHorizonMetricsData(hm);
      setErrorDistributionData(dist);
      setTimeSeriesData(ts);
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [selectedHorizonBucket, distributionBins]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return (
    <ProcurementContext.Provider
      value={{
        deliveryDate,
        setDeliveryDate,
        cutoffTime,
        setCutoffTime,
        selectedHorizonBucket,
        setSelectedHorizonBucket,
        distributionBins,
        setDistributionBins,
        decisionData,
        timeSeriesData,
        metricsData,
        horizonMetricsData,
        errorDistributionData,
        healthData,
        isLoadingDecision,
        isLoadingMetrics,
        error,
        refreshDecision,
        refreshMetrics,
      }}
    >
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = (): ProcurementContextType => {
  const context = useContext(ProcurementContext);
  if (!context) {
    throw new Error('useProcurement must be used within a ProcurementProvider');
  }
  return context;
};
