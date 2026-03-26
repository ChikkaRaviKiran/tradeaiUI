import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  fetchMarketSnapshot,
  fetchAllSnapshots,
  fetchGlobalIndices,
  fetchActiveTrades,
  fetchTodayTrades,
  fetchPerformance,
  fetchAlerts,
  fetchSystemStatus,
  fetchSystemActivity,
  fetchRecommendations,
  fetchIntelligence,
  refreshIntelligence,
  startSystem,
  stopSystem,
  setTradingMode,
  fetchV2ActiveTrades,
  fetchV2TodayTrades,
  fetchV2Status,
  fetchPerformanceComparison,
} from './api';
import MarketOverview from './components/MarketOverview';
import ActiveTrades from './components/ActiveTrades';
import CompletedTrades from './components/CompletedTrades';
import PerformancePanel from './components/PerformancePanel';
import AlertsPanel from './components/AlertsPanel';
import RecommendationsPanel from './components/RecommendationsPanel';
import MarketIntelligence from './components/MarketIntelligence';
import SystemActivityLog from './components/SystemActivityLog';
import HistoryDashboard from './components/HistoryDashboard';
import V2ComparisonPanel from './components/V2ComparisonPanel';

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
  const [allSnapshots, setAllSnapshots] = useState({});
  const [globalIndices, setGlobalIndices] = useState([]);
  const [activeTrades, setActiveTrades] = useState([]);
  const [todayTrades, setTodayTrades] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState({ status: 'stopped' });
  const [recommendations, setRecommendations] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [activity, setActivity] = useState(null);
  const [v2ActiveTrades, setV2ActiveTrades] = useState([]);
  const [v2TodayTrades, setV2TodayTrades] = useState([]);
  const [v2Status, setV2Status] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [snapRes, activeRes, todayRes, perfRes, alertsRes, statusRes, globalRes, recsRes, intelRes, allSnapsRes, activityRes, v2ActiveRes, v2TodayRes, v2StatusRes, compRes] = await Promise.allSettled([
        fetchMarketSnapshot(),
        fetchActiveTrades(),
        fetchTodayTrades(),
        fetchPerformance(),
        fetchAlerts(),
        fetchSystemStatus(),
        fetchGlobalIndices(),
        fetchRecommendations(),
        fetchIntelligence(),
        fetchAllSnapshots(),
        fetchSystemActivity(),
        fetchV2ActiveTrades(),
        fetchV2TodayTrades(),
        fetchV2Status(),
        fetchPerformanceComparison(),
      ]);

      if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value.data);
      if (allSnapsRes.status === 'fulfilled') setAllSnapshots(allSnapsRes.value.data || {});
      if (activeRes.status === 'fulfilled') setActiveTrades(activeRes.value.data);
      if (todayRes.status === 'fulfilled') setTodayTrades(todayRes.value.data);
      if (perfRes.status === 'fulfilled') setPerformance(perfRes.value.data);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data);
      if (statusRes.status === 'fulfilled') setSystemStatus(statusRes.value.data);
      if (globalRes.status === 'fulfilled') setGlobalIndices(globalRes.value.data);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.data);
      if (intelRes.status === 'fulfilled') setIntelligence(intelRes.value.data);
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data);
      if (v2ActiveRes.status === 'fulfilled') setV2ActiveTrades(v2ActiveRes.value.data);
      if (v2TodayRes.status === 'fulfilled') setV2TodayTrades(v2TodayRes.value.data);
      if (v2StatusRes.status === 'fulfilled') setV2Status(v2StatusRes.value.data);
      if (compRes.status === 'fulfilled') setComparison(compRes.value.data);
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

  const handleRefreshIntelligence = async () => {
    try {
      await refreshIntelligence();
      // Reload after a short delay
      setTimeout(async () => {
        try {
          const res = await fetchIntelligence();
          setIntelligence(res.data);
        } catch {}
      }, 5000);
    } catch {}
  };

  const isRunning = systemStatus.status === 'running';

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1>TradeAI — Index Options</h1>
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
              <div>
                Cycle #{systemStatus.cycle_count}
                {systemStatus.expiries && Object.keys(systemStatus.expiries).length > 0 && (
                  <> · Expiry: {Object.entries(systemStatus.expiries).map(([sym, exp]) => `${sym}: ${exp}`).join(', ')}</>
                )}
                {systemStatus.db_connected === false && (
                  <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>· DB Disconnected</span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 2 }}>
              <button
                onClick={async () => {
                  const next = systemStatus.paper_trading ? 'live' : 'paper';
                  if (next === 'live' && !window.confirm('Switch to LIVE trading? Real orders will be placed.')) return;
                  try {
                    const res = await setTradingMode(next);
                    setSystemStatus((s) => ({ ...s, paper_trading: res.data.paper_trading }));
                  } catch (e) {
                    alert(e?.response?.data?.detail || 'Failed to switch mode');
                  }
                }}
                style={{
                  padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  border: 'none', cursor: 'pointer', letterSpacing: 0.5,
                  background: systemStatus.paper_trading ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                  color: systemStatus.paper_trading ? '#f59e0b' : '#ef4444',
                }}
                title={systemStatus.paper_trading ? 'Click to switch to LIVE' : 'Click to switch to PAPER'}
              >
                {systemStatus.paper_trading ? 'PAPER' : '● LIVE'}
              </button>
              {systemStatus.capital > 0 && (
                <span style={{ fontSize: 11 }}>Capital: ₹{systemStatus.capital?.toLocaleString('en-IN')}</span>
              )}
              {systemStatus.active_instruments && systemStatus.active_instruments.length > 0 && (
                <span style={{ fontSize: 11 }}>{systemStatus.active_instruments.join(', ')}</span>
              )}
            </div>
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

      {/* Market Overview — All 3 Instruments */}
      <section className="section">
        <MarketOverview snapshot={snapshot} allSnapshots={allSnapshots} globalIndices={globalIndices} />
      </section>

      {/* Market Intelligence — AI Pre-Market Analysis */}
      <section className="section">
        <h2 className="section-title">Market Intelligence</h2>
        <MarketIntelligence intelligence={intelligence} onRefresh={handleRefreshIntelligence} />
      </section>

      {/* System Pipeline Monitor — Every Step Visible */}
      <section className="section">
        <SystemActivityLog activity={activity} />
      </section>

      {/* Performance Metrics */}
      <section className="section">
        <h2 className="section-title">Performance Metrics</h2>
        <PerformancePanel performance={performance} />
      </section>

      {/* V2 Engine Comparison */}
      <section className="section">
        <h2 className="section-title">V2 Engine — Comparison</h2>
        <V2ComparisonPanel
          v2Status={v2Status}
          comparison={comparison}
          v2ActiveTrades={v2ActiveTrades}
          v2TodayTrades={v2TodayTrades}
        />
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

      {/* Strategy Recommendations */}
      <section className="section">
        <h2 className="section-title">Strategy Recommendations</h2>
        <RecommendationsPanel recommendations={recommendations} onRecommendationsUpdate={setRecommendations} />
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
