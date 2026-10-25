import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Ban, ShieldCheck } from 'lucide-react';

export const BlockedLookaheadNode: React.FC = () => {
  return (
    <div className="rf-node-card blocked">
      <Handle
        type="target"
        position={Position.Left}
        id="blocked-in"
        style={{ top: '50%', background: 'var(--crimson-primary)' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon crimson">
          <Ban size={18} />
        </div>
        <div>
          <div className="rf-node-title" style={{ color: 'var(--crimson-light)' }}>Hindsight Rejection</div>
          <div className="rf-node-subtitle">Post-Cutoff Revisions Blocked</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">Lookahead Leakage</span>
          <span className="value" style={{ color: 'var(--emerald-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} /> 0.00% Zero-Leak
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Forecasts with publish_time &gt; Cutoff are mathematically excluded from Day D purchase decisions.
        </div>
      </div>
    </div>
  );
};

export default BlockedLookaheadNode;
