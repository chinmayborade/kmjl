/**
 * Settlement Period Detailed Table
 * 48 Half-Hourly Periods with sortable and filterable columns
 */

import React, { useState, useMemo } from 'react';
import { PeriodForecast } from '../../types';
import { Search, ArrowUpDown, Filter } from 'lucide-react';

interface SettlementTableProps {
  periods: PeriodForecast[];
}

export const SettlementTable: React.FC<SettlementTableProps> = ({ periods }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'over' | 'under'>('all');
  const [sortField, setSortField] = useState<keyof PeriodForecast>('settlement_period');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredPeriods = useMemo(() => {
    return periods
      .filter((p) => {
        const timeMatch = p.start_time?.includes(searchTerm) || `SP ${p.settlement_period}`.toLowerCase().includes(searchTerm.toLowerCase());
        if (!timeMatch) return false;

        if (filterType === 'over') return (p.error_mw ?? 0) > 0;
        if (filterType === 'under') return (p.error_mw ?? 0) < 0;
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [periods, searchTerm, filterType, sortField, sortOrder]);

  const handleSort = (field: keyof PeriodForecast) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search SP or time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                width: '140px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setFilterType('all')}
              className={`cutoff-btn ${filterType === 'all' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              All (48)
            </button>
            <button
              onClick={() => setFilterType('over')}
              className={`cutoff-btn ${filterType === 'over' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Over-Forecast
            </button>
            <button
              onClick={() => setFilterType('under')}
              className={`cutoff-btn ${filterType === 'under' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Under-Forecast
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredPeriods.length}</strong> of 48 Settlement Periods
        </div>
      </div>

      <div className="table-container">
        <table className="portal-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('settlement_period')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  SP <ArrowUpDown size={12} />
                </span>
              </th>
              <th>Clock Time (UTC)</th>
              <th onClick={() => handleSort('forecast_generation_mw')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Forecast MW <ArrowUpDown size={12} />
                </span>
              </th>
              <th onClick={() => handleSort('actual_generation_mw')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Actual Outturn <ArrowUpDown size={12} />
                </span>
              </th>
              <th onClick={() => handleSort('error_mw')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Signed Error <ArrowUpDown size={12} />
                </span>
              </th>
              <th>Lead Horizon</th>
              <th>P10 Floor</th>
              <th>P90 Cap</th>
              <th>Compliance</th>
            </tr>
          </thead>
          <tbody>
            {filteredPeriods.map((p) => {
              const timeDisplay = p.start_time ? p.start_time.slice(11, 16) : `SP ${p.settlement_period}`;
              const isOver = (p.error_mw ?? 0) > 0;
              const isZero = (p.error_mw ?? 0) === 0;

              return (
                <tr key={p.settlement_period}>
                  <td style={{ fontWeight: 600, color: 'var(--cyan-light)' }}>SP {p.settlement_period}</td>
                  <td className="tabular-nums">{timeDisplay} - {p.start_time ? new Date(new Date(p.start_time).getTime() + 30 * 60000).toISOString().slice(11, 16) : ''}</td>
                  <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--cyan-light)' }}>
                    {p.forecast_generation_mw?.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--emerald-light)' }}>
                    {p.actual_generation_mw != null ? `${p.actual_generation_mw.toLocaleString()} MW` : 'Pending'}
                  </td>
                  <td className="tabular-nums">
                    {p.error_mw != null ? (
                      <span className={`badge-tag ${isOver ? 'amber' : isZero ? 'cyan' : 'emerald'}`}>
                        {p.error_mw > 0 ? `+${p.error_mw}` : p.error_mw} MW
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    +{p.horizon_hours}h
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--amber-light)' }}>
                    {p.p10_bound_mw?.toFixed(0)} MW
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--amber-light)' }}>
                    {p.p90_bound_mw?.toFixed(0)} MW
                  </td>
                  <td>
                    <span className="badge-tag cyan">Hindsight-Free</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettlementTable;
