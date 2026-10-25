import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Wind, TrendingUp } from 'lucide-react';

export interface DecisionForecastNodeData {
  totalMwh: number;
  peakMw: number;
  minMw: number;
  deliveryDate: string;
}

export const DecisionForecastNode: React.FC<{ data: DecisionForecastNodeData }> = ({ data }) => {
  return (
    <div className="rf-node-card">
      <Handle
        type="target"
        position={Position.Left}
        id="forecast-in"
        style={{ top: '50%' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon cyan">
          <Wind size={18} />
        </div>
        <div>
          <div className="rf-node-title">Decision Forecast Engine</div>
          <div className="rf-node-subtitle">48 Settlement Periods (SPs 1-48)</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Total Energy</span>
          <span className="value" style={{ color: 'var(--cyan-light)' }}>
            {(data.totalMwh || 0).toLocaleString()} MWh
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Peak Generation</span>
          <span className="value">{(data.peakMw || 0).toLocaleString()} MW</span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Min Generation</span>
          <span className="value">{(data.minMw || 0).toLocaleString()} MW</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="forecast-out"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default DecisionForecastNode;
