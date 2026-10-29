/**
 * UK Wind Forecast Portal - Master Application Shell
 * Day-Ahead Wholesale Power Procurement Desk
 */

import React, { useState } from 'react';
import { ProcurementProvider, useProcurement } from './context/ProcurementContext';
import DecisionDeskView from './components/decision/DecisionDeskView';
import PipelineCanvasView from './components/pipeline/PipelineCanvasView';
import AccuracyView from './components/accuracy/AccuracyView';
import RiskView from './components/risk/RiskView';
import {
  Wind,
  Zap,
  GitBranch,
  BarChart3,
  Shield,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

type TabType = 'decision' | 'pipeline' | 'accuracy' | 'risk';

const PortalApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('decision');
  const { deliveryDate, setDeliveryDate, cutoffTime, setCutoffTime } = useProcurement();

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Wind size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">UK Wind Forecast Portal</h1>
            <div className="brand-subtitle">Day-Ahead Power Procurement Desk</div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="header-controls">
          {/* Target Delivery Date Picker */}
          <div className="control-pill">
            <Calendar size={14} color="var(--cyan-light)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Day:</span>
            <input
              type="date"
              id="delivery-date-input"
              value={deliveryDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          {/* Cutoff Time Selector */}
          <div className="control-pill">
            <Clock size={14} color="var(--amber-light)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cutoff (D-1):</span>
            <select
              id="cutoff-select"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
            >
              <option value="11:00:00">11:00 UTC (Nord Pool)</option>
              <option value="12:00:00">12:00 UTC (EPEX SPOT)</option>
              <option value="14:00:00">14:00 UTC (Late)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="nav-tabs-container">
        <button
          id="tab-decision-desk"
          onClick={() => setActiveTab('decision')}
          className={`nav-tab-btn ${activeTab === 'decision' ? 'active' : ''}`}
        >
          <Zap size={16} />
          <span>Decision Desk</span>
        </button>

        <button
          id="tab-pipeline-canvas"
          onClick={() => setActiveTab('pipeline')}
          className={`nav-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
        >
          <GitBranch size={16} />
          <span>Total Flow Overview</span>
        </button>

        <button
          id="tab-accuracy-metrics"
          onClick={() => setActiveTab('accuracy')}
          className={`nav-tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
        >
          <BarChart3 size={16} />
          <span>Accuracy Benchmarks</span>
        </button>

        <button
          id="tab-risk-distribution"
          onClick={() => setActiveTab('risk')}
          className={`nav-tab-btn ${activeTab === 'risk' ? 'active' : ''}`}
        >
          <Shield size={16} />
          <span>Risk & Error Distribution</span>
        </button>
      </nav>

      {/* Main Dynamic View Content */}
      <main className="main-content">
        {activeTab === 'decision' && <DecisionDeskView />}
        {activeTab === 'pipeline' && <PipelineCanvasView />}
        {activeTab === 'accuracy' && <AccuracyView />}
        {activeTab === 'risk' && <RiskView />}
      </main>

      {/* Footer Info */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 28px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>UK Power Procurement Desk &bull; National Grid Transmission &amp; Outturn Feeds</span>
          <span>Scope: January 2026 Purchase Decisions</span>
          <span>Zero Look-Ahead Certified</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ProcurementProvider>
      <PortalApp />
    </ProcurementProvider>
  );
};

export default App;
