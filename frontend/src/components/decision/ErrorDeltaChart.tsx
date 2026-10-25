/**
 * Settlement Period Error Delta Chart
 * Bar chart showing period-by-period signed error (Forecast - Actual) in MW
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { PeriodForecast } from '../../types';

interface ErrorDeltaChartProps {
  periods: PeriodForecast[];
}

export const ErrorDeltaChart: React.FC<ErrorDeltaChartProps> = ({ periods }) => {
  const data = periods
    .filter((p) => p.error_mw !== null)
    .map((p) => ({
      sp: p.settlement_period,
      time: p.start_time ? p.start_time.slice(11, 16) : `SP ${p.settlement_period}`,
      error: p.error_mw as number,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0]?.payload;
      const isOver = d.error > 0;
      return (
        <div style={{
          background: 'rgba(13, 19, 31, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          fontSize: '0.8rem',
        }}>
          <div><strong>SP {d.sp} ({d.time} UTC)</strong></div>
          <div style={{ color: isOver ? 'var(--amber-light)' : 'var(--emerald-light)', marginTop: '2px' }}>
            {isOver ? 'Over-Forecast (Deficit)' : 'Under-Forecast (Surplus)'}: {d.error > 0 ? `+${d.error}` : d.error} MW
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 130, marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <XAxis dataKey="sp" hide />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" strokeWidth={1} />
          <Bar dataKey="error" radius={[2, 2, 2, 2]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.error > 0 ? 'var(--amber-primary)' : 'var(--emerald-primary)'}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ErrorDeltaChart;
