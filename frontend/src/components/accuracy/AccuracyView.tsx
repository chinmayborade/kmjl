/**
 * Forecast Accuracy & Horizon Degradation View
 * Evaluates performance degradation across forecast lead horizons
 */

import React from 'react';
import { useProcurement } from '../../context/ProcurementContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

export const AccuracyView: React.FC = () => {
  const {
    horizonMetricsData,
    timeSeriesData,
    isLoadingMetrics,
  } = useProcurement();

  if (isLoadingMetrics && !horizonMetricsData) {
    return (
      <div className="loading-shimmer">
        <div className="spinner" />
        <span>Computing lead-time accuracy metrics and historical outturn...</span>
      </div>
    );
  }

  const horizons = horizonMetricsData?.horizons || horizonMetricsData?.buckets || [];

  // Prepare data for horizon comparison bar chart
  const horizonChartData = horizons.map((h) => ({
    bucket: h.horizon_bucket,
    mae: Math.round(h.mae_mw),
    rmse: Math.round(h.rmse_mw),
    bias: Math.round(h.bias_mw),
    nmae: h.nmae_pct.toFixed(1),
    samples: h.sample_count,
  }));

  // Subsample multi-day time series data for performance (every 2nd point)
  const timeSeriesPoints = (timeSeriesData?.series || [])
    .filter((_, idx) => idx % 2 === 0)
    .map((p) => ({
      date: p.start_time?.slice(5, 10),
      time: p.start_time?.slice(11, 16),
      forecast: p.forecast_mw,
      actual: p.actual_mw,
    }));

  return (
    <div>
      {/* Horizon Comparison Header */}
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-title">
            <Clock size={20} color="var(--cyan-primary)" />
            Lead-Time Accuracy & Degradation Matrix
          </h2>
          <p className="section-subtitle">
            Evaluating how forecast accuracy compounds as lead time increases from intraday gate closure (0-6h) to Day-Ahead auction cutoff (12-24h, 24-48h).
          </p>
        </div>
      </div>

      {/* Horizon Cards Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {horizons.map((h) => (
          <div key={h.horizon_bucket} className="kpi-card">
            <div className="kpi-header">
              <span style={{ color: 'var(--cyan-light)', fontWeight: 700 }}>Horizon: {h.horizon_bucket}</span>
              <span className="badge-tag cyan">{h.sample_count.toLocaleString()} SPs</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAE</div>
                <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {Math.round(h.mae_mw).toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MW</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>nMAE %</div>
                <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cyan-light)' }}>
                  {h.nmae_pct.toFixed(1)}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RMSE</div>
                <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {Math.round(h.rmse_mw).toLocaleString()} MW
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed Bias</div>
                <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 600, color: h.bias_mw > 0 ? 'var(--amber-light)' : 'var(--emerald-light)' }}>
                  {h.bias_mw > 0 ? `+${Math.round(h.bias_mw)}` : Math.round(h.bias_mw)} MW
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Horizon Comparison Bar Chart */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <BarChart3 size={18} color="var(--cyan-primary)" />
              Comparative Error Degradation Across Lead Horizons
            </h3>
            <p className="section-subtitle">Comparing Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and Net Bias across lead buckets.</p>
          </div>
        </div>

        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={horizonChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="bucket" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `${v} MW`} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(13, 19, 31, 0.95)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="mae" fill="var(--cyan-primary)" name="MAE (Mean Absolute Error)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rmse" fill="#0284c7" name="RMSE (Root Mean Square Error)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bias" fill="var(--amber-primary)" name="Signed Bias (Over-forecast)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical January 2026 Multi-Day Outturn Explorer */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Calendar size={18} color="var(--cyan-primary)" />
              Full January 2026 Multi-Day Dispatch & Weather Explorer
            </h3>
            <p className="section-subtitle">Continuous time-series curve showing major storm events (Jan 1-3, Jan 11-12) and deep wind lulls (Jan 8).</p>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesPoints} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(13, 19, 31, 0.95)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Line type="monotone" dataKey="forecast" stroke="var(--cyan-primary)" strokeWidth={1.5} dot={false} name="Day-Ahead Forecast (MW)" />
              <Line type="monotone" dataKey="actual" stroke="var(--emerald-primary)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Actual Generation (MW)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AccuracyView;
