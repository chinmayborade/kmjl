import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Activity } from 'lucide-react';

export const DataSourceNode: React.FC<{ data: { totalForecasts: number; totalActuals: number; status: string } }> = ({ data }) => {
  return (
    <div className="rf-node-card">
      <div className="rf-node-header">
        <div className="rf-node-icon cyan">
          <Database size={18} />
        </div>
        <div>
          <div className="rf-node-title">National Wind Feed</div>
          <div className="rf-node-subtitle">Forecast & Grid Outturn Stream</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Stream Status</span>
          <span className="value" style={{ color: 'var(--emerald-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} /> {data.status || 'LIVE'}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Forecast Horizon</span>
          <span className="value">Hourly (:00)</span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Actual Outturn</span>
          <span className="value">Half-Hour (:00, :30)</span>
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
