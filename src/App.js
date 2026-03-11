import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  fetchMarketSnapshot,
  fetchGlobalIndices,
  fetchActiveTrades,
  fetchTodayTrades,
  fetchPerformance,
  fetchAlerts,
  fetchSystemStatus,
  startSystem,
  stopSystem,
} from './api';
import MarketOverview from './components/MarketOverview';
import ActiveTrades from './components/ActiveTrades';
import CompletedTrades from './components/CompletedTrades';
import PerformancePanel from './components/PerformancePanel';
import AlertsPanel from './components/AlertsPanel';
import HistoryDashboard from './components/HistoryDashboard';

const REFRESH_INTERVAL = 15000; // 15 seconds

function App() {
  return (
    <Routes>
      <Route path="/" element={<LiveDashboard />} />
      <Route path="/history" element={<HistoryDashboard />} />
    </Routes>
  );
}

function LiveDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [globalIndices, setGlobalIndices] = useState([]);
  const [activeTrades, setActiveTrades] = useState([]);
  const [todayTrades, setTodayTrades] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState({ status: 'stopped' });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [snapRes, activeRes, todayRes, perfRes, alertsRes, statusRes, globalRes] = await Promise.allSettled([
        fetchMarketSnapshot(),
        fetchActiveTrades(),
        fetchTodayTrades(),
        fetchPerformance(),
        fetchAlerts(),
        fetchSystemStatus(),
        fetchGlobalIndices(),
      ]);

      if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value.data);
      if (activeRes.status === 'fulfilled') setActiveTrades(activeRes.value.data);
      if (todayRes.status === 'fulfilled') setTodayTrades(todayRes.value.data);
      if (perfRes.status === 'fulfilled') setPerformance(perfRes.value.data);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data);
      if (statusRes.status === 'fulfilled') setSystemStatus(statusRes.value.data);
      if (globalRes.status === 'fulfilled') setGlobalIndices(globalRes.value.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend');
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStart = async () => {
    try {
      await startSystem();
      setSystemStatus((s) => ({ ...s, status: 'running' }));
    } catch {}
  };

  const handleStop = async () => {
    try {
      await stopSystem();
      setSystemStatus((s) => ({ ...s, status: 'stopped' }));
    } catch {}
  };

  const isRunning = systemStatus.status === 'running';

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1>TradeAI — NIFTY Options</h1>
          <Link to="/history" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem', border: '1px solid var(--accent-blue)', padding: '4px 12px', borderRadius: 6 }}>
            History
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {lastUpdated && (
              <div>Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            )}
            {systemStatus.cycle_count > 0 && (
              <div>Cycle #{systemStatus.cycle_count} · Expiry: {systemStatus.expiry || '—'}</div>
            )}
          </div>
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
        <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
          <p style={{ color: 'var(--accent-red)' }}>{error}</p>
        </div>
      )}

      {/* Market Overview */}
      <section className="section">
        <MarketOverview snapshot={snapshot} globalIndices={globalIndices} />
      </section>

      {/* Performance Metrics */}
      <section className="section">
        <h2 className="section-title">Performance Metrics</h2>
        <PerformancePanel performance={performance} />
      </section>

      {/* Active Trades + Alerts side by side */}
      <section className="section">
        <div className="grid grid-2">
          <div>
            <h2 className="section-title">Active Trades</h2>
            <ActiveTrades trades={activeTrades} />
          </div>
          <div>
            <h2 className="section-title">Alerts &amp; Signals</h2>
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
      </section>

      {/* Completed Trades */}
      <section className="section">
        <h2 className="section-title">Today's Completed Trades</h2>
        <CompletedTrades trades={todayTrades.filter((t) => t.status === 'closed')} />
      </section>
    </div>
  );
}

export default App;
