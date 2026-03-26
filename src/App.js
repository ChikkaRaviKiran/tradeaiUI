import React, { useState, useEffect, useCallback } from 'react';
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
import AlertsPanel from './components/AlertsPanel';
import RecommendationsPanel from './components/RecommendationsPanel';
import MarketIntelligence from './components/MarketIntelligence';
import SystemActivityLog from './components/SystemActivityLog';
import HistoryDashboard from './components/HistoryDashboard';
import V2ComparisonPanel from './components/V2ComparisonPanel';

const REFRESH_INTERVAL = 15000;

function App() {
  const [tab, setTab] = useState('dashboard');
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
      const results = await Promise.allSettled([
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

      const val = (i) => results[i].status === 'fulfilled' ? results[i].value.data : null;

      if (val(0) !== null) setSnapshot(val(0));
      if (val(9) !== null) setAllSnapshots(val(9) || {});
      if (val(1) !== null) setActiveTrades(val(1));
      if (val(2) !== null) setTodayTrades(val(2));
      if (val(3) !== null) setPerformance(val(3));
      if (val(4) !== null) setAlerts(val(4));
      if (val(5) !== null) setSystemStatus(val(5));
      if (val(6) !== null) setGlobalIndices(val(6));
      if (val(7) !== null) setRecommendations(val(7));
      if (val(8) !== null) setIntelligence(val(8));
      if (val(10) !== null) setActivity(val(10));
      if (val(11) !== null) setV2ActiveTrades(val(11));
      if (val(12) !== null) setV2TodayTrades(val(12));
      if (val(13) !== null) setV2Status(val(13));
      if (val(14) !== null) setComparison(val(14));
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
    try { await startSystem(); setSystemStatus((s) => ({ ...s, status: 'running' })); } catch {}
  };

  const handleStop = async () => {
    try { await stopSystem(); setSystemStatus((s) => ({ ...s, status: 'stopped' })); } catch {}
  };

  const handleRefreshIntelligence = async () => {
    try {
      await refreshIntelligence();
      setTimeout(async () => {
        try { const res = await fetchIntelligence(); setIntelligence(res.data); } catch {}
      }, 5000);
    } catch {}
  };

  const handleModeToggle = async () => {
    const next = systemStatus.paper_trading ? 'live' : 'paper';
    if (next === 'live' && !window.confirm('Switch to LIVE trading? Real orders will be placed.')) return;
    try {
      const res = await setTradingMode(next);
      setSystemStatus((s) => ({ ...s, paper_trading: res.data.paper_trading }));
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to switch mode');
    }
  };

  const isRunning = systemStatus.status === 'running';
  const p = performance || {};
  const v2s = v2Status || {};
  const allActive = [...activeTrades, ...v2ActiveTrades.map(t => ({ ...t, _engine: 'v2' }))];
  const v1Closed = todayTrades.filter((t) => t.status === 'closed');
  const v2Closed = (v2TodayTrades || []).filter((t) => t.status === 'closed');
  const allClosed = [...v1Closed, ...v2Closed.map(t => ({ ...t, _engine: 'v2' }))];

  return (
    <div className="app-container">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="header">
        <h1>TradeAI</h1>
        <div className="header-controls">
          <div className="header-meta">
            {lastUpdated && (
              <span>
                {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            {systemStatus.cycle_count > 0 && (
              <span style={{ marginLeft: 8 }}>
                · Cycle #{systemStatus.cycle_count}
              </span>
            )}
            {systemStatus.db_connected === false && (
              <span style={{ color: 'var(--accent-red)', marginLeft: 6 }}>· DB Down</span>
            )}
          </div>

          <button
            onClick={handleModeToggle}
            style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              border: 'none', cursor: 'pointer', letterSpacing: 0.5,
              background: systemStatus.paper_trading ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              color: systemStatus.paper_trading ? '#f59e0b' : '#ef4444',
            }}
          >
            {systemStatus.paper_trading ? 'PAPER' : '● LIVE'}
          </button>

          {systemStatus.capital > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              ₹{systemStatus.capital?.toLocaleString('en-IN')}
            </span>
          )}

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
        <div className="card" style={{ borderColor: 'var(--accent-red)', margin: '12px 0', padding: 12 }}>
          <span style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────── */}
      <div className="kpi-strip">
        <KPI label="Today P&L" value={`₹${(p.total_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          color={(p.total_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          sub={`${p.total_trades || 0} trades`} />
        <KPI label="Win Rate" value={`${(p.win_rate || 0).toFixed(1)}%`}
          color={(p.win_rate || 0) >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'}
          sub={`${p.winning_trades || 0}W / ${p.losing_trades || 0}L`} />
        <KPI label="Profit Factor" value={(p.profit_factor || 0).toFixed(2)}
          color={(p.profit_factor || 0) >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'}
          sub={`DD: ₹${(p.max_drawdown || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
        <KPI label="Active Trades" value={allActive.length}
          color={allActive.length > 0 ? 'var(--accent-blue)' : 'var(--text-muted)'}
          sub={`V1: ${activeTrades.length} · V2: ${v2ActiveTrades.length}`} />
        <KPI label="V2 P&L" value={`₹${(v2s.today_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          color={(v2s.today_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          sub={`${v2s.today_total || 0} trades · ${(v2s.day_type || '—').toUpperCase()}`} />
        <KPI label="V2 Win Rate"
          value={v2s.today_total > 0 ? `${((v2s.today_wins || 0) / v2s.today_total * 100).toFixed(0)}%` : '—'}
          color={(v2s.today_wins || 0) > 0 ? 'var(--accent-green)' : 'var(--text-muted)'}
          sub={`${v2s.today_wins || 0}W / ${(v2s.today_total || 0) - (v2s.today_wins || 0)}L`} />
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <nav className="tab-nav">
        {[
          ['dashboard', 'Dashboard'],
          ['intelligence', 'Intelligence'],
          ['system', 'System'],
          ['history', 'History'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'dashboard' && allActive.length > 0 && (
              <span className="tab-badge">{allActive.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Tab Content ────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <DashboardTab
          snapshot={snapshot} allSnapshots={allSnapshots} globalIndices={globalIndices}
          allActive={allActive} allClosed={allClosed}
          activeTrades={activeTrades} v2ActiveTrades={v2ActiveTrades}
          alerts={alerts}
          v2Status={v2Status} comparison={comparison}
          v2TodayTrades={v2TodayTrades}
        />
      )}

      {tab === 'intelligence' && (
        <IntelligenceTab
          intelligence={intelligence} onRefresh={handleRefreshIntelligence}
          recommendations={recommendations} onRecommendationsUpdate={setRecommendations}
        />
      )}

      {tab === 'system' && (
        <SystemTab
          activity={activity}
          v2Status={v2Status} comparison={comparison}
          v2ActiveTrades={v2ActiveTrades} v2TodayTrades={v2TodayTrades}
        />
      )}

      {tab === 'history' && (
        <HistoryDashboard />
      )}
    </div>
  );
}

/* ─── KPI Component ──────────────────────────────────────────────────── */
function KPI({ label, value, color, sub }) {
  return (
    <div className="kpi-item">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ─── Dashboard Tab ──────────────────────────────────────────────────── */
function DashboardTab({ snapshot, allSnapshots, globalIndices, allActive, allClosed, activeTrades, v2ActiveTrades, alerts, v2Status, comparison, v2TodayTrades }) {
  return (
    <>
      {/* Market Overview */}
      <section className="section" style={{ marginTop: 4 }}>
        <MarketOverview snapshot={snapshot} allSnapshots={allSnapshots} globalIndices={globalIndices} />
      </section>

      {/* Main content: Trades left, Alerts right */}
      <div className="dashboard-main">
        <div>
          {/* Active Trades — Unified V1+V2 */}
          <section className="section">
            <h2 className="section-title">Active Trades</h2>
            <ActiveTrades trades={allActive} showEngine />
          </section>

          {/* V2 Engine Status — compact */}
          {v2Status?.enabled && (
            <section className="section">
              <V2ComparisonPanel
                v2Status={v2Status} comparison={comparison}
                v2ActiveTrades={[]} v2TodayTrades={v2TodayTrades}
                compact
              />
            </section>
          )}

          {/* Completed Trades — Unified V1+V2 */}
          <section className="section">
            <h2 className="section-title">Completed Trades</h2>
            <CompletedTrades trades={allClosed} showEngine />
          </section>
        </div>

        {/* Right sidebar: Alerts */}
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Alerts</h2>
          <AlertsPanel alerts={alerts} compact />
        </div>
      </div>
    </>
  );
}

/* ─── Intelligence Tab ───────────────────────────────────────────────── */
function IntelligenceTab({ intelligence, onRefresh, recommendations, onRecommendationsUpdate }) {
  return (
    <>
      <section className="section" style={{ marginTop: 4 }}>
        <h2 className="section-title">Market Intelligence</h2>
        <MarketIntelligence intelligence={intelligence} onRefresh={onRefresh} />
      </section>

      <section className="section">
        <h2 className="section-title">Strategy Recommendations</h2>
        <RecommendationsPanel recommendations={recommendations} onRecommendationsUpdate={onRecommendationsUpdate} />
      </section>
    </>
  );
}

/* ─── System Tab ─────────────────────────────────────────────────────── */
function SystemTab({ activity, v2Status, comparison, v2ActiveTrades, v2TodayTrades }) {
  return (
    <>
      <section className="section" style={{ marginTop: 4 }}>
        <SystemActivityLog activity={activity} />
      </section>

      <section className="section">
        <h2 className="section-title">V2 Engine — Comparison</h2>
        <V2ComparisonPanel
          v2Status={v2Status} comparison={comparison}
          v2ActiveTrades={v2ActiveTrades} v2TodayTrades={v2TodayTrades}
        />
      </section>
    </>
  );
}

export default App;
