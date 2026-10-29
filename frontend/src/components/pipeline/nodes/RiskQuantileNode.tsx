import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Shield } from 'lucide-react';

export interface RiskQuantileNodeData {
  horizonBucket?: string | null;
  quantileSource?: 'empirical' | 'heuristic' | null;
  p10SignedError?: number | null;
  p90SignedError?: number | null;
  avgBandWidthMw?: number | null;
  p10ShortfallMwh?: number | null;
}

const fmtMw = (v: number | null | undefined, unit = 'MW') =>
  v === null || v === undefined
    ? '—'
    : `${v > 0 ? '+' : ''}${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })} ${unit}`;

export const RiskQuantileNode: React.FC<{ data: RiskQuantileNodeData }> = ({ data }) => {
  const sourceLabel =
    data.quantileSource === 'empirical'
      ? `Empirical, ${data.horizonBucket ?? '—'} lead`
      : data.quantileSource === 'heuristic'
        ? 'Heuristic ±15%'
        : 'No forecast';

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
          <div className="rf-node-title">Risk &amp; Uncertainty Engine</div>
          <div className="rf-node-subtitle">{sourceLabel}</div>
        </div>
      </div>

      <div className="rf-node-body">
        <div className="rf-node-stat">
          <span className="label">P10 Signed Error</span>
          <span className="value" style={{ color: 'var(--amber-light)' }}>
            {fmtMw(data.p10SignedError)}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">P90 Signed Error</span>
          <span className="value" style={{ color: 'var(--amber-light)' }}>
            {fmtMw(data.p90SignedError)}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">Avg P10–P90 Band</span>
          <span className="value">
            {data.avgBandWidthMw == null
              ? '—'
              : `${data.avgBandWidthMw.toLocaleString('en-GB', { maximumFractionDigits: 0 })} MW`}
          </span>
        </div>
        <div className="rf-node-stat">
          <span className="label">P10 Wind Shortfall</span>
          <span className="value" style={{ color: 'var(--crimson-light)' }}>
            {data.p10ShortfallMwh == null
              ? '—'
              : `${data.p10ShortfallMwh.toLocaleString('en-GB', { maximumFractionDigits: 0 })} MWh`}
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
