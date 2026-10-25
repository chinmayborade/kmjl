/**
 * Flagship Decision Desk View
 * Primary operational view for Day-Ahead Power Buyers
 */

import React from 'react';
import { useProcurement } from '../../context/ProcurementContext';
import PowerCurveChart from './PowerCurveChart';
import ErrorDeltaChart from './ErrorDeltaChart';
import SettlementTable from './SettlementTable';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const DecisionDeskView: React.FC = () => {
  const {
    deliveryDate,
    setDeliveryDate,
    cutoffTime,
    setCutoffTime,
    decisionData,
    isLoadingDecision,
    error,
  } = useProcurement();

  if (isLoadingDecision && !decisionData) {
    return (
      <div className="loading-shimmer">
        <div className="spinner" />
        <span>Evaluating hindsight-free Day-Ahead decision forecast...</span>
      </div>
    );
  }

  if (error && !decisionData) {
    return (
      <div style={{
        padding: '30px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid var(--crimson-primary)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--crimson-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '1.1rem' }}>
          <AlertCircle size={20} />
          <span>Failed to load Decision Forecast</span>
        </div>
        <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  const summary = decisionData?.summary;
  const periods = decisionData?.periods || [];

  const presets = [
    { label: '11:00 Nord Pool', time: '11:00:00' },
    { label: '12:00 EPEX SPOT (Default)', time: '12:00:00' },
    { label: '14:00 Late Auction', time: '14:00:00' },
  ];

  return (
    <div>
      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span>Total Expected Energy</span>
            <Zap size={16} color="var(--cyan-light)" />
          </div>
          <div className="kpi-value">
            {summary?.total_forecast_mwh?.toLocaleString()}
            <span className="kpi-unit">MWh</span>
          </div>
          <div className="kpi-subtext">
            <span>Day-Ahead Decision Volume</span>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span>Actual Generation Delivered</span>
            <ShieldCheck size={16} color="var(--emerald-light)" />
          </div>
          <div className="kpi-value">
            {summary?.total_actual_mwh != null ? summary.total_actual_mwh.toLocaleString() : 'N/A'}
            <span className="kpi-unit">MWh</span>
          </div>
          <div className="kpi-subtext">
            <span>National Grid Outturn</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Peak Wind Generation</span>
            <TrendingUp size={16} color="var(--cyan-light)" />
          </div>
          <div className="kpi-value">
            {summary?.peak_forecast_mw?.toLocaleString()}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>Maximum System Supply</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Minimum Wind Generation</span>
            <TrendingDown size={16} color="var(--cyan-light)" />
          </div>
          <div className="kpi-value">
            {summary?.min_forecast_mw?.toLocaleString()}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>Maximum Thermal Backup Needed</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span>Day Bias (Mean Error)</span>
            <Clock size={16} color="var(--amber-light)" />
          </div>
          <div className="kpi-value">
            {summary?.day_bias_mw != null ? `${summary.day_bias_mw > 0 ? '+' : ''}${summary.day_bias_mw.toFixed(1)}` : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>{summary?.day_bias_mw && summary.day_bias_mw > 0 ? 'Over-forecast (Reserve needed)' : 'Under-forecast (Wind surplus)'}</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span>Day MAE</span>
            <AlertCircle size={16} color="var(--amber-light)" />
          </div>
          <div className="kpi-value">
            {summary?.day_mae_mw != null ? summary.day_mae_mw.toFixed(1) : 'N/A'}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-subtext">
            <span>Mean Absolute Deviation</span>
          </div>
        </div>
      </div>

      {/* Main Power Curve Section */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Zap size={20} color="var(--cyan-primary)" />
              Day-Ahead 48 Settlement Period Power Curve
            </h2>
            <p className="section-subtitle">
              Evaluating Delivery Date <strong style={{ color: 'var(--text-primary)' }}>{deliveryDate}</strong> with strict zero look-ahead cutoff at <strong style={{ color: 'var(--amber-light)' }}>{cutoffTime} UTC (Day D-1)</strong>.
            </p>
          </div>

          {/* Quick Cutoff Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="cutoff-toolbar">
              {presets.map((p) => (
                <button
                  key={p.time}
                  onClick={() => setCutoffTime(p.time)}
                  className={`cutoff-btn ${cutoffTime === p.time ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-line cyan" />
                <span>Decision Forecast</span>
              </div>
              <div className="legend-item">
                <div className="legend-line emerald" />
                <span>Actual Outturn</span>
              </div>
              <div className="legend-item">
                <div className="legend-line amber" />
                <span>P10 - P90 Bound</span>
              </div>
            </div>
          </div>
        </div>

        {/* 48-Period Chart */}
        <PowerCurveChart periods={periods} />

        {/* SP Signed Error Bar Chart */}
        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Settlement Period Signed Error Delta (MW = Forecast - Actual)</span>
            <span>Amber = Deficit (Over-forecast) | Emerald = Windfall (Under-forecast)</span>
          </div>
          <ErrorDeltaChart periods={periods} />
        </div>
      </div>

      {/* Settlement Period Breakdown Table */}
      <div className="section-card">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>
          <Calendar size={18} color="var(--cyan-primary)" />
          Settlement Period Dispatch Schedule & Audit Log
        </h3>
        <p className="section-subtitle">
          All 48 half-hourly periods with verified publication timestamps, forecast horizons, and empirical uncertainty bands.
        </p>

        <SettlementTable periods={periods} />
      </div>
    </div>
  );
};

export default DecisionDeskView;
