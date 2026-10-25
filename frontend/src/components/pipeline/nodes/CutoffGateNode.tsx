import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldAlert, Clock, Lock } from 'lucide-react';

export interface CutoffGateNodeData {
  cutoffTime: string;
  onCutoffChange?: (newTime: string) => void;
}

export const CutoffGateNode: React.FC<{ data: CutoffGateNodeData }> = ({ data }) => {
  const presets = ['11:00:00', '12:00:00', '14:00:00'];

  return (
    <div className="rf-node-card gate">
      <Handle
        type="target"
        position={Position.Left}
        id="gate-in"
        style={{ top: '50%' }}
      />

      <div className="rf-node-header">
        <div className="rf-node-icon amber">
          <Clock size={18} />
        </div>
        <div>
          <div className="rf-node-title">Day D-1 Cutoff Gate</div>
          <div className="rf-node-subtitle">Zero Look-Ahead Enforcement</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div style={{ display: 'flex', gap: '6px', margin: '4px 0' }}>
          {presets.map((time) => (
            <button
              key={time}
              onClick={() => data.onCutoffChange?.(time)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: data.cutoffTime === time ? 'var(--amber-primary)' : 'rgba(255,255,255,0.1)',
                background: data.cutoffTime === time ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                color: data.cutoffTime === time ? 'var(--amber-light)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {time.slice(0, 5)}
            </button>
          ))}
        </div>

        <div className="rf-node-stat">
          <span className="label">Active Barrier</span>
          <span className="value" style={{ color: 'var(--amber-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> {data.cutoffTime} UTC
          </span>
        </div>

        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--emerald-light)', 
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '4px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <ShieldAlert size={12} />
          <span>Strict rule: publish_time ≤ Cutoff</span>
        </div>
      </div>

      {/* Primary output for approved hindsight-free data */}
      <Handle
        type="source"
        position={Position.Right}
        id="gate-out"
        style={{ top: '35%', background: 'var(--cyan-primary)' }}
      />

      {/* Secondary output for blocked look-ahead revisions */}
      <Handle
        type="source"
        position={Position.Right}
        id="gate-blocked"
        style={{ top: '75%', background: 'var(--crimson-primary)' }}
      />
    </div>
  );
};

export default CutoffGateNode;
