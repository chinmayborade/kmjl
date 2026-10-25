/**
 * React Flow Pipeline Canvas View
 * Interactive visual decision workflow and zero look-ahead audit lineage
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useProcurement } from '../../context/ProcurementContext';
import DataSourceNode from './nodes/DataSourceNode';
import CutoffGateNode from './nodes/CutoffGateNode';
import DecisionForecastNode from './nodes/DecisionForecastNode';
import RiskQuantileNode from './nodes/RiskQuantileNode';
import ProcurementOrderNode from './nodes/ProcurementOrderNode';
import SettlementOutturnNode from './nodes/SettlementOutturnNode';
import BlockedLookaheadNode from './nodes/BlockedLookaheadNode';
import { ShieldCheck, Zap } from 'lucide-react';

const nodeTypes = {
  dataSource: DataSourceNode,
  cutoffGate: CutoffGateNode,
  decisionForecast: DecisionForecastNode,
  riskQuantile: RiskQuantileNode,
  procurementOrder: ProcurementOrderNode,
  settlementOutturn: SettlementOutturnNode,
  blockedLookahead: BlockedLookaheadNode,
};

export const PipelineCanvasView: React.FC = () => {
  const {
    deliveryDate,
    cutoffTime,
    setCutoffTime,
    decisionData,
    healthData,
  } = useProcurement();

  // Dynamic Node Definitions
  const nodes: Node[] = useMemo(() => {
    const summary = decisionData?.summary;

    return [
      {
        id: '1',
        type: 'dataSource',
        position: { x: 50, y: 160 },
        data: {
          totalForecasts: healthData?.total_forecast_rows || 21024,
          totalActuals: healthData?.total_actual_rows || 1728,
          status: 'LIVE',
        },
      },
      {
        id: '2',
        type: 'cutoffGate',
        position: { x: 380, y: 150 },
        data: {
          cutoffTime,
          onCutoffChange: setCutoffTime,
        },
      },
      {
        id: '2-blocked',
        type: 'blockedLookahead',
        position: { x: 740, y: 440 },
        data: {},
      },
      {
        id: '3',
        type: 'decisionForecast',
        position: { x: 740, y: 150 },
        data: {
          totalMwh: summary?.total_forecast_mwh || 0,
          peakMw: summary?.peak_forecast_mw || 0,
          minMw: summary?.min_forecast_mw || 0,
          deliveryDate,
        },
      },
      {
        id: '4',
        type: 'riskQuantile',
        position: { x: 1100, y: 150 },
        data: {},
      },
      {
        id: '5',
        type: 'procurementOrder',
        position: { x: 1460, y: 150 },
        data: {
          totalForecastMwh: summary?.total_forecast_mwh || 0,
          deliveryDate,
        },
      },
      {
        id: '6',
        type: 'settlementOutturn',
        position: { x: 1820, y: 150 },
        data: {
          totalActualMwh: summary?.total_actual_mwh ?? null,
          dayBiasMw: summary?.day_bias_mw ?? null,
          dayMaeMw: summary?.day_mae_mw ?? null,
        },
      },
    ];
  }, [deliveryDate, cutoffTime, setCutoffTime, decisionData, healthData]);

  // Edges connecting the decision and power flow stages
  const edges: Edge[] = useMemo(() => [
    {
      id: 'e1-2',
      source: '1',
      sourceHandle: 'source-out',
      target: '2',
      targetHandle: 'gate-in',
      animated: true,
      className: 'animated-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cyan-primary)' },
    },
    {
      id: 'e2-3',
      source: '2',
      sourceHandle: 'gate-out',
      target: '3',
      targetHandle: 'forecast-in',
      animated: true,
      className: 'animated-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cyan-primary)' },
    },
    {
      id: 'e2-blocked',
      source: '2',
      sourceHandle: 'gate-blocked',
      target: '2-blocked',
      targetHandle: 'blocked-in',
      className: 'blocked-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--crimson-primary)' },
    },
    {
      id: 'e3-4',
      source: '3',
      sourceHandle: 'forecast-out',
      target: '4',
      targetHandle: 'risk-in',
      animated: true,
      className: 'animated-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cyan-primary)' },
    },
    {
      id: 'e4-5',
      source: '4',
      sourceHandle: 'risk-out',
      target: '5',
      targetHandle: 'order-in',
      animated: true,
      className: 'animated-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cyan-primary)' },
    },
    {
      id: 'e5-6',
      source: '5',
      sourceHandle: 'order-out',
      target: '6',
      targetHandle: 'settlement-in',
      animated: true,
      className: 'animated-edge',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cyan-primary)' },
    },
  ], []);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '14px' }}>
        <div>
          <h2 className="section-title">
            <Zap size={20} color="var(--cyan-primary)" />
            Interactive Day-Ahead Procurement Pipeline Canvas
          </h2>
          <p className="section-subtitle">
            Visual workflow connecting national wind generation data, Day D-1 cutoff enforcement, zero look-ahead decision selection, and risk hedging.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="badge-tag emerald">
            <ShieldCheck size={13} />
            <span>Zero Look-Ahead Certified</span>
          </div>
        </div>
      </div>

      <div className="react-flow-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#162236" gap={20} size={1.5} variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap
            nodeStrokeColor="#06b6d4"
            nodeColor="#131c2c"
            maskColor="rgba(8, 12, 20, 0.75)"
          />
        </ReactFlow>
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px 18px', 
        background: 'var(--bg-glass)', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)'
      }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Interactive Guide:</strong> Click any preset time inside the <em>Day D-1 Cutoff Gate</em> node to dynamically adjust the auction gate boundary and observe downstream power volume updates.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyan-primary)' }} />
            Approved Hindsight-Free Flow
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--crimson-primary)' }} />
            Blocked Post-Cutoff Revisions
          </span>
        </div>
      </div>
    </div>
  );
};

export default PipelineCanvasView;
