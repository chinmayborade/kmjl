import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShoppingCart, Zap } from 'lucide-react';

export interface ProcurementOrderNodeData {
  totalForecastMwh: number;
  deliveryDate: string;
}

export const ProcurementOrderNode: React.FC<{ data: ProcurementOrderNodeData }> = ({ data }) => {
  return (
    <div className="rf-node-card">
      <Handle
        type="target"
        position={Position.Left}
        id="order-in"
        style={{ top: '50%' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon cyan">
          <ShoppingCart size={18} />
        </div>
        <div>
          <div className="rf-node-title">Procurement Hedging Desk</div>
          <div className="rf-node-subtitle">Day-Ahead Wholesale Dispatch</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Delivery Target</span>
          <span className="value" style={{ color: 'var(--cyan-light)' }}>
            {data.deliveryDate}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Market Auction</span>
          <span className="value">EPEX / Nord Pool Day-Ahead</span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Reserve Buffer</span>
          <span className="value" style={{ color: 'var(--amber-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} /> P10 Wind Gap Protection
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="order-out"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default ProcurementOrderNode;
