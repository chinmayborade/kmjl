import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Activity } from 'lucide-react';

export interface DataSourceNodeData {
  totalForecasts: number | null;
  totalActuals: number | null;
  cacheLoaded: boolean | null;
}

const fmtCount = (v: number | null) => (v == null ? '—' : v.toLocaleString('en-GB'));

export const DataSourceNode: React.FC<{ data: DataSourceNodeData }> = ({ data }) => {
  const statusLabel =
    data.cacheLoaded == null ? 'Connecting…' : data.cacheLoaded ? 'Grid Feed Active' : 'Feed Offline';
  const statusColor =
    data.cacheLoaded == null
      ? 'var(--text-muted)'
      : data.cacheLoaded
        ? 'var(--emerald-light)'
        : 'var(--crimson-light)';

  return (
    <div className="rf-node-card">
      <div className="rf-node-header">
        <div className="rf-node-icon cyan">
          <Database size={18} />
        </div>
        <div>
          <div className="rf-node-title">National Wind Feed</div>
          <div className="rf-node-subtitle">Forecast &amp; Outturn Telemetry</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Status</span>
          <span className="value" style={{ color: statusColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} /> {statusLabel}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Forecast Rows (hourly)</span>
          <span className="value">{fmtCount(data.totalForecasts)}</span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Actual Rows (half-hourly)</span>
          <span className="value">{fmtCount(data.totalActuals)}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source-out"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default DataSourceNode;
