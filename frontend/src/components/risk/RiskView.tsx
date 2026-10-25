/**
 * Risk & Error Distribution View
 * Histogram distribution with theoretical Gaussian overlay and quantile risk analysis
 */

import React from 'react';
import { useProcurement } from '../../context/ProcurementContext';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Shield, AlertTriangle, Sliders, Layers, TrendingUp } from 'lucide-react';

export const RiskView: React.FC = () => {
  const {
    errorDistributionData,
    metricsData,
    selectedHorizonBucket,
    setSelectedHorizonBucket,
    distributionBins,
    setDistributionBins,
    isLoadingMetrics,
  } = useProcurement();

  if (isLoadingMetrics && !errorDistributionData) {
    return (
      <div className="loading-shimmer">
        <div className="spinner" />
        <span>Calculating empirical error quantiles and probability density...</span>
      </div>
    );
  }

  const bins: any[] = (errorDistributionData as any)?.bins || [];
  const totalSamples = (errorDistributionData as any)?.total_samples ?? metricsData?.sample_count ?? 1488;
  const meanBias = metricsData?.bias_mw ?? 0;
  const sigma = metricsData?.rmse_mw ?? 2200;
  const percentiles = metricsData?.error_percentiles;
  const quantiles = metricsData?.signed_error_quantiles;

  // Format data for Recharts composed chart
  const chartData = bins.map((b: any) => {
    const center = Math.round(((b.bin_start_mw ?? 0) + (b.bin_end_mw ?? 0)) / 2);
    const binWidth = Math.max(1, (b.bin_end_mw ?? 0) - (b.bin_start_mw ?? 0));
    // Normal probability density: f(x) * dx
    const z = (center - meanBias) / sigma;
    const normalDensity = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    const normalPct = +(normalDensity * binWidth * 100).toFixed(2);

    return {
      center: `${center > 0 ? '+' : ''}${center}`,
      count: b.count ?? 0,
      percentage: b.frequency_pct ?? b.percentage ?? 0,
      normalPct: normalPct,
      range: `${Math.round(b.bin_start_mw)} to ${Math.round(b.bin_end_mw)} MW`,
    };
  });

  const horizonOptions = ['all', '0-6h', '6-12h', '12-24h', '24-48h'];
  const binOptions = [10, 20, 30, 40];

  return (
    <div>
      {/* Header & Filter Controls */}
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-title">
            <Shield size={20} color="var(--amber-primary)" />
            Error Distribution & Downside Hedging Risk
          </h2>
          <p className="section-subtitle">
            Empirical frequency distribution of signed forecast error (MW = Forecast - Actual) compared against theoretical Gaussian normal curve.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="cutoff-toolbar">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '6px' }}>Horizon:</span>
            {horizonOptions.map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHorizonBucket(h)}
                className={`cutoff-btn ${selectedHorizonBucket === h ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {h}
              </button>
            ))}
          </div>

          <div className="cutoff-toolbar">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '6px' }}>Bins:</span>
            {binOptions.map((b) => (
              <button
                key={b}
                onClick={() => setDistributionBins(b)}
                className={`cutoff-btn ${distributionBins === b ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quantiles & Risk Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card amber">
          <div className="kpi-header">
            <span>P10 Signed Error (Downside Deficit)</span>
            <AlertTriangle size={16} color="var(--amber-light)" />
          </div>
          <div className="kpi-value">
            {quantiles ? `${quantiles.p10_error_mw > 0 ? '+' : ''}${quantiles.p10_error_mw.toFixed(1)}` : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>10% of periods see worse over-forecast</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>P50 Median Signed Error</span>
            <Shield size={16} color="var(--cyan-light)" />
          </div>
          <div className="kpi-value">
            {quantiles ? `${quantiles.p50_error_mw > 0 ? '+' : ''}${quantiles.p50_error_mw.toFixed(1)}` : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>Systematic January positive bias</span>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span>P90 Signed Error (Surplus Wind)</span>
            <TrendingUp size={16} color="var(--emerald-light)" />
          </div>
          <div className="kpi-value">
            {quantiles ? `${quantiles.p90_error_mw > 0 ? '+' : ''}${quantiles.p90_error_mw.toFixed(1)}` : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>90% of periods have error below this</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>P95 Absolute Error (Tail Risk)</span>
            <AlertTriangle size={16} color="var(--amber-light)" />
          </div>
          <div className="kpi-value">
            {percentiles ? `${percentiles.p95_absolute_error_mw.toFixed(1)}` : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>Severe storm tail error bound</span>
          </div>
        </div>
      </div>

      {/* Main Error Distribution Histogram */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Layers size={18} color="var(--cyan-primary)" />
              Error Frequency Histogram & Gaussian Fit
            </h3>
            <p className="section-subtitle">
              Evaluating {totalSamples.toLocaleString()} evaluated settlement period pairs with mean error of <strong style={{ color: 'var(--amber-light)' }}>+{meanBias.toFixed(1)} MW</strong> (RMSE: {sigma.toFixed(1)} MW).
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="center" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(13, 19, 31, 0.95)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="percentage" fill="var(--cyan-primary)" opacity={0.7} name="Empirical Frequency (%)" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="normalPct" stroke="var(--amber-primary)" strokeWidth={2.5} dot={false} name="Theoretical Gaussian Fit (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default RiskView;
