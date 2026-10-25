import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';

export interface SettlementOutturnNodeData {
  totalActualMwh: number | null;
  dayBiasMw: number | null;
  dayMaeMw: number | null;
}

export const SettlementOutturnNode: React.FC<{ data: SettlementOutturnNodeData }> = ({ data }) => {
  const isOverForecast = (data.dayBiasMw ?? 0) > 0;

  return (
    <div className="rf-node-card">
      <Handle
        type="target"
        position={Position.Left}
        id="settlement-in"
        style={{ top: '50%' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon emerald">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <div className="rf-node-title">Settlement & Outturn</div>
          <div className="rf-node-subtitle">Actual Grid Delivery vs Plan</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Actual Delivered</span>
          <span className="value" style={{ color: 'var(--emerald-light)' }}>
            {data.totalActualMwh != null ? `${data.totalActualMwh.toLocaleString()} MWh` : 'Pending Delivery'}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Day Bias</span>
          <span className="value" style={{ 
            color: isOverForecast ? 'var(--amber-light)' : 'var(--cyan-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isOverForecast ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {data.dayBiasMw != null ? `${data.dayBiasMw.toFixed(1)} MW` : 'N/A'}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Day MAE</span>
          <span className="value">
            {data.dayMaeMw != null ? `${data.dayMaeMw.toFixed(1)} MW` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettlementOutturnNode;
