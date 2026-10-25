import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Shield, AlertTriangle } from 'lucide-react';

export interface RiskQuantileNodeData {
  p10SignedError?: number;
  p90SignedError?: number;
  reserveMarginMw?: number;
}

export const RiskQuantileNode: React.FC<{ data: RiskQuantileNodeData }> = ({ data }) => {
  return (
    <div className="rf-node-card">
      <Handle
        type="target"
        position={Position.Left}
        id="risk-in"
        style={{ top: '50%' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon amber">
          <Shield size={18} />
        </div>
        <div>
          <div className="rf-node-title">Risk & Uncertainty Engine</div>
          <div className="rf-node-subtitle">P10 / P90 Empirical Quantiles</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">P10 Floor Bound</span>
          <span className="value" style={{ color: 'var(--amber-light)' }}>
            Empirical 10th %ile
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">P90 Ceiling Bound</span>
          <span className="value" style={{ color: 'var(--amber-light)' }}>
            Empirical 90th %ile
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Non-Negativity</span>
          <span className="value" style={{ color: 'var(--emerald-light)' }}>
            Clamped ≥ 0 MW
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="risk-out"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default RiskQuantileNode;
