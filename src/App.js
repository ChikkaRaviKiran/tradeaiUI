import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllSnapshots,
  fetchGlobalIndices,
  fetchSystemStatus,
  fetchIntelligence,
  refreshIntelligence,
  startSystem,
  stopSystem,
  setTradingMode,
  fetchBrokerStatus,
} from './api';
import MarketOverview from './components/MarketOverview';
import BrokerSettings from './components/BrokerSettings';
import BacktestPanel from './components/BacktestPanel';

const REFRESH_INTERVAL = 15000;

function App() {
  const [tab, setTab] = useState('market');
  const [allSnapshots, setAllSnapshots] = useState({});
  const [globalIndices, setGlobalIndices] = useState([]);
  const [systemStatus, setSystemStatus] = useState({ status: 'stopped' });
  const [intelligence, setIntelligence] = useState(null);
  const [brokerStatus, setBrokerStatus] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchAllSnapshots(),
        fetchGlobalIndices(),
        fetchSystemStatus(),
        fetchIntelligence(),
        fetchBrokerStatus(),
      ]);

      const val = (i) => results[i].status === 'fulfilled' ? results[i].value.data : null;

      if (val(0) !== null) setAllSnapshots(val(0) || {});
      if (val(1) !== null) setGlobalIndices(val(1));
      if (val(2) !== null) setSystemStatus(val(2));
      if (val(3) !== null) setIntelligence(val(3));
      if (val(4) !== null) setBrokerStatus(val(4));
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

  // Market KPI data
  const niftySnap = allSnapshots.NIFTY;
  const sensexSnap = allSnapshots.SENSEX;
  const niftyChange = niftySnap?.prev_day_close ? (((niftySnap.price || 0) - niftySnap.prev_day_close) / niftySnap.prev_day_close * 100) : null;
  const sensexChange = sensexSnap?.prev_day_close ? (((sensexSnap.price || 0) - sensexSnap.prev_day_close) / sensexSnap.prev_day_close * 100) : null;
  const vixIdx = globalIndices.find(i => i.symbol?.includes('VIX'));
  const aiBias = intelligence?.insight?.market_bias;
  const aiConf = intelligence?.insight?.confidence;
  const netInst = intelligence?.fii_dii?.net_institutional;

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
            {brokerStatus && !brokerStatus.authenticated && brokerStatus.configured && (
              <span
                style={{ color: 'var(--accent-yellow)', marginLeft: 6, cursor: 'pointer' }}
                onClick={() => setTab('settings')}
                title="Broker not authenticated — click to fix"
              >· Broker Auth ✗</span>
            )}
            {brokerStatus && !brokerStatus.configured && (
              <span
                style={{ color: 'var(--accent-red)', marginLeft: 6, cursor: 'pointer' }}
                onClick={() => setTab('settings')}
                title="Broker not configured — click to set up"
              >· Broker ✗</span>
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

      {/* ── KPI Strip (Market-Focused) ────────────────────────── */}
      <div className="kpi-strip">
        <KPI label="NIFTY"
          value={(niftySnap?.price || 0) > 0 ? (niftySnap.price).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          color={niftyChange != null ? (niftyChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)'}
          sub={niftyChange != null ? `${niftyChange >= 0 ? '+' : ''}${niftyChange.toFixed(2)}%` : ''} />
        <KPI label="SENSEX"
          value={(sensexSnap?.price || 0) > 0 ? (sensexSnap.price).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          color={sensexChange != null ? (sensexChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)'}
          sub={sensexChange != null ? `${sensexChange >= 0 ? '+' : ''}${sensexChange.toFixed(2)}%` : ''} />
        <KPI label="Market Bias"
          value={(aiBias || '—').toUpperCase()}
          color={aiBias === 'bullish' ? 'var(--accent-green)' : aiBias === 'bearish' ? 'var(--accent-red)' : 'var(--accent-yellow)'}
          sub={aiConf ? `${aiConf}% confidence` : ''} />
        <KPI label="India VIX"
          value={vixIdx?.last_price > 0 ? vixIdx.last_price.toFixed(2) : '—'}
          color={vixIdx?.last_price > 20 ? 'var(--accent-red)' : vixIdx?.last_price > 15 ? 'var(--accent-yellow)' : 'var(--accent-green)'}
          sub={vixIdx?.change_pct != null ? `${vixIdx.change_pct >= 0 ? '+' : ''}${vixIdx.change_pct.toFixed(2)}%` : ''} />
        <KPI label="FII/DII Net"
          value={netInst != null ? `${netInst >= 0 ? '+' : ''}${netInst.toFixed(0)} Cr` : '—'}
          color={netInst > 0 ? 'var(--accent-green)' : netInst < 0 ? 'var(--accent-red)' : 'var(--text-muted)'}
          sub={intelligence?.fii_dii ? `FII: ${(intelligence.fii_dii.fii_net || 0) >= 0 ? '+' : ''}${(intelligence.fii_dii.fii_net || 0).toFixed(0)} · DII: ${(intelligence.fii_dii.dii_net || 0) >= 0 ? '+' : ''}${(intelligence.fii_dii.dii_net || 0).toFixed(0)}` : ''} />
        <KPI label="Active Trades" value="—"
          color="var(--text-muted)"
          sub="MOB Backtest Mode" />
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <nav className="tab-nav">
        {[
          ['market', 'Market'],
          ['backtest', 'Backtest'],
          ['settings', 'Settings'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Tab Content ────────────────────────────────────────── */}
      {tab === 'market' && (
        <DashboardTab
          allSnapshots={allSnapshots} globalIndices={globalIndices}
          intelligence={intelligence}
        />
      )}

      {tab === 'backtest' && (
        <section className="section" style={{ marginTop: 4 }}>
          <h2 className="section-title">Backtest Simulator</h2>
          <BacktestPanel />
        </section>
      )}

      {tab === 'settings' && (
        <SettingsTab />
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

/* ─── Dashboard Tab (Market-Focused) ─────────────────────────────────── */
function DashboardTab({ allSnapshots, globalIndices, intelligence }) {
  const { insight, fii_dii, breadth } = intelligence || {};
  const keyLevels = insight?.key_levels || {};

  return (
    <>
      {/* Market Overview - Instrument Cards */}
      <section className="section" style={{ marginTop: 4 }}>
        <MarketOverview allSnapshots={allSnapshots} globalIndices={globalIndices} />
      </section>

      {/* Market Context */}
      <div className="dashboard-main">
        <div>
          {/* FII/DII, Breadth, Key Levels */}
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            {/* FII/DII */}
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>FII / DII Flow</div>
              {fii_dii ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>FII Net</span>
                    <span style={{ fontWeight: 600, color: fii_dii.fii_net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fii_dii.fii_net >= 0 ? '+' : ''}{fii_dii.fii_net?.toFixed(0)} Cr
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>DII Net</span>
                    <span style={{ fontWeight: 600, color: fii_dii.dii_net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fii_dii.dii_net >= 0 ? '+' : ''}{fii_dii.dii_net?.toFixed(0)} Cr
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Net</span>
                    <span style={{ fontWeight: 700, color: fii_dii.net_institutional >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fii_dii.net_institutional >= 0 ? '+' : ''}{fii_dii.net_institutional?.toFixed(0)} Cr
                    </span>
                  </div>
                </>
              ) : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Data unavailable</span>}
            </div>

            {/* Market Breadth */}
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Market Breadth</div>
              {breadth ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>Advancing</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{breadth.total_advancing}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>Declining</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{breadth.total_declining}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>A/D Ratio</span>
                    <span style={{ fontWeight: 700, color: breadth.advance_decline_ratio >= 1.0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {breadth.advance_decline_ratio?.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Data unavailable</span>}
            </div>

            {/* Key Levels */}
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Key Levels</div>
              {keyLevels.nifty_support || keyLevels.nifty_resistance ? (
                <>
                  {keyLevels.nifty_support && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>Support: </span>
                      {keyLevels.nifty_support.map((lvl, i) => (
                        <span key={i} style={{ padding: '1px 6px', background: 'rgba(16,185,129,0.12)', borderRadius: 4, fontSize: 12, fontWeight: 600, marginRight: 4 }}>
                          {lvl}
                        </span>
                      ))}
                    </div>
                  )}
                  {keyLevels.nifty_resistance && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--accent-red)', fontWeight: 600 }}>Resistance: </span>
                      {keyLevels.nifty_resistance.map((lvl, i) => (
                        <span key={i} style={{ padding: '1px 6px', background: 'rgba(239,68,68,0.12)', borderRadius: 4, fontSize: 12, fontWeight: 600, marginRight: 4 }}>
                          {lvl}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No levels identified</span>}
            </div>
          </div>

          {/* Sector Performance */}
          {breadth?.sectors && breadth.sectors.length > 0 && (
            <div className="card" style={{ marginBottom: 16, padding: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Sector Performance</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {breadth.sectors
                  .sort((a, b) => b.change_pct - a.change_pct)
                  .map((sector, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: sector.change_pct > 0.5 ? 'rgba(16,185,129,0.12)' : sector.change_pct < -0.5 ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
                      color: sector.change_pct > 0.5 ? 'var(--accent-green)' : sector.change_pct < -0.5 ? 'var(--accent-red)' : 'var(--text-secondary)',
                    }}>
                      {sector.name.replace('NIFTY ', '')}: {sector.change_pct > 0 ? '+' : ''}{sector.change_pct.toFixed(2)}%
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {insight?.summary && (
            <div className="card" style={{ borderLeft: '3px solid var(--accent-blue)', padding: '12px 16px' }}>
              <div className="card-title" style={{ marginBottom: 6 }}>AI Market Summary</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{insight.summary}</p>
              {insight?.trading_plan && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(59,130,246,0.06)', borderRadius: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Trading Plan</span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{insight.trading_plan}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Settings Tab ───────────────────────────────────────────────────── */
function SettingsTab() {
  return (
    <>
      <section className="section" style={{ marginTop: 4 }}>
        <h2 className="section-title">Broker Connection</h2>
        <BrokerSettings />
      </section>
    </>
  );
}

export default App;
