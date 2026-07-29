import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  fetchAllSnapshots,
  fetchGlobalIndices,
  fetchSystemStatus,
  fetchIntelligence,
  fetchAlerts,
  fetchBrokerStatus,
  startSystem,
  stopSystem,
  setTradingMode,
} from './api';
import MarketOverview from './components/MarketOverview';
import ScannersPanel from './components/ScannersPanel';
import ATMStrategyPage from './components/ATMStrategyPage';
import PositionsPage from './components/PositionsPage';
import HistoryPage from './components/HistoryPage';
import AlertsPanel from './components/AlertsPanel';
import BrokerSettings from './components/BrokerSettings';
import StrategySettingsPanel from './components/StrategySettingsPanel';
import ResearchStraddleSettingsPanel from './components/ResearchStraddleSettingsPanel';
import SettingsAccountsPanel from './components/SettingsAccountsPanel';
import StrategyInstancesPanel from './components/StrategyInstancesPanel';
import CondorSetupPanel from './components/CondorSetupPanel';
import LevelZonesPanel from './components/LevelZonesPanel';
import ExpiryLevelsPanel from './components/ExpiryLevelsPanel';
import PaperTradesPanel from './components/PaperTradesPanel';
import PatternEnginePage from './components/pattern_engine/PatternEnginePage';

const REFRESH_INTERVAL = 12000;

function CockpitPage({ allSnapshots, globalIndices, systemStatus, intelligence, alerts }) {
  return (
    <section className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">Market</h2>
      <MarketOverview allSnapshots={allSnapshots} globalIndices={globalIndices} />

      <h2 className="section-title" style={{ marginTop: 16 }}>Scanner Status</h2>
      <ScannersPanel systemStatus={systemStatus} />

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>AI Bias</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {(intelligence?.insight?.market_bias || 'unknown').toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Confidence: {intelligence?.insight?.confidence ?? 0}%
          </div>
          {intelligence?.fii_dii && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Net Institutional: {(intelligence.fii_dii.net_institutional || 0) >= 0 ? '+' : ''}
              {(intelligence.fii_dii.net_institutional || 0).toFixed(0)} Cr
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Recent Alerts</div>
          <AlertsPanel alerts={alerts} compact />
        </div>
      </div>
    </section>
  );
}

function SettingsPage({ brokerStatus }) {
  return (
    <section className="section" style={{ marginTop: 4 }}>
      <div className="settings-subnav">
        <NavLink to="/settings/accounts" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
          Accounts & Strategies
        </NavLink>
        <NavLink to="/settings/levels" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
          Levels & Alerts
        </NavLink>
        <NavLink to="/settings/strategy" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
          Strategy
        </NavLink>
        <NavLink to="/settings/atm-research" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
          ATM Research
        </NavLink>
        <NavLink to="/settings/broker" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
          Broker
        </NavLink>
      </div>

      <Routes>
        <Route
          path="accounts"
          element={(
            <div style={{ marginTop: 12 }}>
              <SettingsAccountsPanel />
              <StrategyInstancesPanel />
            </div>
          )}
        />
        <Route
          path="levels"
          element={(
            <div style={{ marginTop: 12 }}>
              <CondorSetupPanel />
              <ExpiryLevelsPanel />
              <LevelZonesPanel />
              <PaperTradesPanel />
            </div>
          )}
        />
        <Route path="strategy" element={<StrategySettingsPanel />} />
        <Route path="atm-research" element={<ResearchStraddleSettingsPanel />} />
        <Route
          path="broker"
          element={(
            <div style={{ marginTop: 12 }}>
              <BrokerSettings />
              {brokerStatus && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="card-title" style={{ marginBottom: 6 }}>Broker Runtime</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Active Account: <strong>{String(brokerStatus.trading_account || 'angel').toUpperCase()}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Authenticated: <strong>{brokerStatus.authenticated ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        />
        <Route path="*" element={<Navigate to="/settings/accounts" replace />} />
      </Routes>
    </section>
  );
}

function App() {
  const location = useLocation();
  const [allSnapshots, setAllSnapshots] = useState({});
  const [globalIndices, setGlobalIndices] = useState([]);
  const [systemStatus, setSystemStatus] = useState({ status: 'stopped', scanners: {} });
  const [intelligence, setIntelligence] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [brokerStatus, setBrokerStatus] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const isFetchingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      const path = location.pathname || '/cockpit';
      const isCockpit = path.startsWith('/cockpit') || path === '/';
      const wantsBroker = path.startsWith('/settings/broker');

      const tasks = [fetchSystemStatus()];
      if (isCockpit) {
        tasks.push(fetchAllSnapshots(), fetchGlobalIndices(), fetchIntelligence(), fetchAlerts(20));
      }
      if (wantsBroker || isCockpit) {
        tasks.push(fetchBrokerStatus());
      }

      const results = await Promise.allSettled(tasks);
      let idx = 0;

      const statusRes = results[idx++];
      if (statusRes.status === 'fulfilled') {
        setSystemStatus(statusRes.value.data || { status: 'stopped', scanners: {} });
      }

      if (isCockpit) {
        const snapRes = results[idx++];
        const giRes = results[idx++];
        const intelRes = results[idx++];
        const alertsRes = results[idx++];

        if (snapRes?.status === 'fulfilled') setAllSnapshots(snapRes.value.data || {});
        if (giRes?.status === 'fulfilled') setGlobalIndices(giRes.value.data || []);
        if (intelRes?.status === 'fulfilled') setIntelligence(intelRes.value.data || null);
        if (alertsRes?.status === 'fulfilled') setAlerts(alertsRes.value.data || []);
      }

      if (wantsBroker || isCockpit) {
        const brokerRes = results[idx++];
        if (brokerRes?.status === 'fulfilled') setBrokerStatus(brokerRes.value.data || null);
      }

      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Backend is unreachable.');
    } finally {
      isFetchingRef.current = false;
    }
  }, [location.pathname]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStart = async () => {
    try {
      await startSystem();
      await loadData();
    } catch {
      setError('Failed to start system.');
    }
  };

  const handleStop = async () => {
    try {
      await stopSystem();
      await loadData();
    } catch {
      setError('Failed to stop system.');
    }
  };

  const handleModeToggle = async () => {
    const next = systemStatus.paper_trading ? 'live' : 'paper';
    if (next === 'live' && !window.confirm('Switch to LIVE mode? Real orders will be placed.')) return;
    try {
      await setTradingMode(next);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to switch trading mode.');
    }
  };

  const isRunning = systemStatus.status === 'running';

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <h1>TradeAI Console</h1>
          <nav className="tab-nav top-nav">
            <NavLink to="/cockpit" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Cockpit
            </NavLink>
            <NavLink to="/positions" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Positions
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              History
            </NavLink>
            <NavLink to="/atm" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              ATM Straddle
            </NavLink>
            <NavLink to="/patterns" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Patterns
            </NavLink>
            <NavLink to="/settings/accounts" className={({ isActive }) => `tab-btn ${isActive || location.pathname.startsWith('/settings') ? 'active' : ''}`}>
              Settings
            </NavLink>
          </nav>
        </div>
        <div className="header-controls">
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          <button
            onClick={handleModeToggle}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: systemStatus.paper_trading ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              color: systemStatus.paper_trading ? '#f59e0b' : '#ef4444',
            }}
          >
            {systemStatus.paper_trading ? 'PAPER' : 'LIVE'}
          </button>

          <span className={`status-badge ${isRunning ? 'running' : 'stopped'}`}>
            <span className="status-dot" />
            {isRunning ? 'Running' : 'Stopped'}
          </span>

          {isRunning ? (
            <button className="btn btn-stop" onClick={handleStop}>Stop</button>
          ) : (
            <button className="btn btn-start" onClick={handleStart}>Start</button>
          )}
        </div>
      </header>

      {error && (
        <div className="card" style={{ marginTop: 12, borderLeft: '4px solid var(--accent-red)' }}>
          <span style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      <Routes>
        <Route
          path="/cockpit"
          element={(
            <CockpitPage
              allSnapshots={allSnapshots}
              globalIndices={globalIndices}
              systemStatus={systemStatus}
              intelligence={intelligence}
              alerts={alerts}
            />
          )}
        />
        <Route path="/positions" element={<PositionsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/atm" element={<ATMStrategyPage />} />
        <Route path="/patterns" element={<PatternEnginePage />} />
        <Route path="/settings/*" element={<SettingsPage brokerStatus={brokerStatus} />} />
        <Route path="*" element={<Navigate to="/cockpit" replace />} />
      </Routes>
    </div>
  );
}

export default App;
