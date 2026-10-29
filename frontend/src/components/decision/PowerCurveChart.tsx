/**
 * Recharts 48 Settlement Period Power Curve Chart
 * Plots Zero Look-Ahead Forecast, Realized Actuals, and P10/P90 Prediction Envelope
 */

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PeriodForecast } from '../../types';

interface PowerCurveChartProps {
  periods: PeriodForecast[];
}

export const PowerCurveChart: React.FC<PowerCurveChartProps> = ({ periods }) => {
  // Format data for Recharts composed chart
  const chartData = periods.map((p) => {
    const timeStr = p.start_time ? p.start_time.slice(11, 16) : `SP ${p.settlement_period}`;
    const p10 = p.p10_bound_mw ?? 0;
    const p90 = p.p90_bound_mw ?? 0;

    return {
      sp: p.settlement_period,
      time: timeStr,
      forecast: p.forecast_generation_mw,
      actual: p.actual_generation_mw,
      error: p.error_mw,
      horizon: p.horizon_hours,
      p10,
      p90,
      // For shaded envelope [p10, p90]
      band: [p10, p90],
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div style={{
          background: 'rgba(13, 19, 31, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(12px)',
          fontSize: '0.82rem',
          minWidth: '220px',
        }}>
          <div style={{ 
            fontFamily: 'var(--font-heading)', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            marginBottom: '6px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>SP {data.sp} ({data.time} UTC)</span>
            <span style={{ color: 'var(--cyan-light)', fontWeight: 500 }}>+{data.horizon}h lead</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cyan-light)' }}>
              <span>Day-Ahead Forecast:</span>
              <strong className="tabular-nums">{data.forecast?.toLocaleString()} MW</strong>
            </div>

            {data.actual !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--emerald-light)' }}>
                <span>Actual Delivered:</span>
                <strong className="tabular-nums">{data.actual?.toLocaleString()} MW</strong>
              </div>
            )}

            {data.error !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: data.error > 0 ? 'var(--amber-light)' : 'var(--crimson-light)' }}>
                <span>Signed Error:</span>
                <strong className="tabular-nums">{data.error > 0 ? `+${data.error}` : data.error} MW</strong>
              </div>
            )}

            <div style={{ 
              marginTop: '4px', 
              paddingTop: '4px', 
              borderTop: '1px dashed rgba(255,255,255,0.08)', 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <span>P10 - P90 Bound:</span>
              <span className="tabular-nums" style={{ color: 'var(--amber-light)' }}>
                {data.p10.toFixed(0)} - {data.p90.toFixed(0)} MW
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 20, left: 35, bottom: 25 }}>
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--amber-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--amber-primary)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--cyan-primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--cyan-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

          <XAxis
            dataKey="sp"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            tickFormatter={(sp) => (sp % 4 === 1 ? `SP ${sp}` : '')}
            label={{
              value: 'Settlement Period (SP 1–48 · 30-min intervals · 00:00–24:00 UTC)',
              position: 'insideBottom',
              offset: -12,
              fill: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 500,
            }}
          />

          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            domain={[0, 'auto']}
            width={45}
            label={{
              value: 'Wind Generation (MW)',
              angle: -90,
              position: 'insideLeft',
              offset: -20,
              fill: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 500,
              style: { textAnchor: 'middle' },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Uncertainty Range [P10, P90] */}
          <Area
            type="monotone"
            dataKey="band"
            stroke="var(--amber-primary)"
            strokeWidth={1}
            strokeDasharray="2 2"
            fill="url(#bandGradient)"
            name="P10-P90 Risk Envelope"
          />

          {/* Decision Forecast Curve */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="var(--cyan-primary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: 'var(--cyan-light)', stroke: '#080c14', strokeWidth: 2 }}
            name="Day-Ahead Decision Forecast"
          />

          {/* Realized Actuals Line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--emerald-primary)"
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--emerald-light)', stroke: '#080c14', strokeWidth: 2 }}
            name="National Grid Actual Outturn"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PowerCurveChart;
