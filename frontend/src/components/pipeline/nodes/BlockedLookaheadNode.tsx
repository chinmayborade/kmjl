import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Ban, ShieldCheck, ShieldX } from 'lucide-react';

export interface BlockedLookaheadNodeData {
  excludedCount?: number | null;
  firstExcludedPublishTime?: string | null;
  leakedPeriods?: number | null;
}

const fmtUtc = (iso: string | null | undefined) =>
  iso
    ? `${new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      })} UTC`
    : '—';

export const BlockedLookaheadNode: React.FC<{ data: BlockedLookaheadNodeData }> = ({ data }) => {
  const leaked = data.leakedPeriods;
  const isClean = leaked === 0;

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
          <span className="label">Revisions Excluded</span>
          <span className="value" style={{ color: 'var(--crimson-light)' }}>
            {data.excludedCount == null ? '—' : data.excludedCount.toLocaleString('en-GB')}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">First Blocked Publish</span>
          <span className="value">{fmtUtc(data.firstExcludedPublishTime)}</span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Leaked Periods</span>
          <span
            className="value"
            style={{
              color: leaked == null ? 'var(--text-muted)' : isClean ? 'var(--emerald-light)' : 'var(--crimson-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isClean ? <ShieldCheck size={12} /> : leaked != null ? <ShieldX size={12} /> : null}
            {leaked == null ? '—' : `${leaked} / 48 verified`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlockedLookaheadNode;
