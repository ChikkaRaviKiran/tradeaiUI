import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  runBacktest,
  fetchBacktestStatus,
  fetchBacktestJobs,
  exportBacktestExcel,
} from '../api';

function BacktestPanel() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('summary');
  const pollRef = useRef(null);

  // Default date range: last 2 weeks
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 14);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    fetchBacktestJobs().then((r) => setJobs(r.data || [])).catch(() => {});
  }, []);

  // Poll for status while running
  const pollStatus = useCallback(async (jid) => {
    try {
      const res = await fetchBacktestStatus(jid);
      const data = res.data;
      setProgress(data);
      if (data.status === 'completed') {
        setResult(data.result);
        setRunning(false);
        clearInterval(pollRef.current);
        fetchBacktestJobs().then((r) => setJobs(r.data || [])).catch(() => {});
      } else if (data.status === 'failed') {
        setError(data.error || 'Backtest failed');
        setRunning(false);
        clearInterval(pollRef.current);
      }
    } catch {
      // keep polling
    }
  }, []);

  const handleRun = async () => {
    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return;
    }
    setError(null);
    setResult(null);
    setProgress(null);
    setRunning(true);

    try {
      const res = await runBacktest({ start_date: startDate, end_date: endDate });
      const jid = res.data.job_id;
      setJobId(jid);
      pollRef.current = setInterval(() => pollStatus(jid), 2000);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to start backtest');
      setRunning(false);
    }
  };

  const handleExport = async (exportJobId) => {
    try {
      const res = await exportBacktestExcel(exportJobId || jobId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mob_backtest_${exportJobId || jobId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to export Excel');
    }
  };

  const handleLoadResult = async (jid) => {
    try {
      const res = await fetchBacktestStatus(jid);
      if (res.data.status === 'completed' && res.data.result) {
        setResult(res.data.result);
        setJobId(jid);
        setProgress(res.data);
        setActiveResultTab('summary');
      }
    } catch {
      setError('Failed to load result');
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div>
      {/* ── MOB Strategy Header + Config ── */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="card-title" style={{ margin: 0 }}>MOB Strategy Backtest</div>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)',
              border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '0.5px',
            }}>MOMENTUM OPTION BUYING</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="tag tag-strategy" style={{ fontSize: 10 }}>Capital: ₹1,00,000</span>
            <span className="tag tag-strategy" style={{ fontSize: 10 }}>SL: 20%</span>
            <span className="tag tag-strategy" style={{ fontSize: 10 }}>Max 2 trades/day</span>
            <span className="tag tag-strategy" style={{ fontSize: 10 }}>1 per instrument</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Date Range */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Date Range
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={running}
                style={inputStyle}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={running}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Quick Presets
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['1W', 7], ['2W', 14], ['1M', 30], ['3M', 90], ['6M', 180],
              ].map(([label, days]) => (
                <button
                  key={label}
                  disabled={running}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - days);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  style={presetBtnStyle}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Info */}
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span><b>Entry:</b> 3-candle pattern (Momentum → Pullback → Confirm)</span>
            <span><b>Exit:</b> T1 → cost+0.5% | T2 → lock 1R | 3-candle trail</span>
            <span><b>Instruments:</b> NIFTY + SENSEX</span>
            <span><b>Slippage:</b> 1.0%</span>
          </div>
        </div>

        {/* Run button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleRun}
            disabled={running || !startDate || !endDate}
            style={{
              padding: '8px 24px', borderRadius: 6, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: running ? 'not-allowed' : 'pointer',
              background: running ? 'rgba(107,114,128,0.2)' : 'var(--accent-blue)',
              color: running ? 'var(--text-muted)' : '#fff',
            }}
          >
            {running ? 'Running...' : 'Run Backtest'}
          </button>

          {result && (
            <button onClick={() => handleExport()} style={exportBtnStyle}>
              Export Excel
            </button>
          )}

          {error && (
            <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>{error}</span>
          )}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      {running && progress && (
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{progress.message}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {progress.processed_days}/{progress.total_days} days
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(107,114,128,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'var(--accent-blue)',
              width: progress.total_days > 0 ? `${(progress.processed_days / progress.total_days * 100)}%` : '0%',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {progress.current_date && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Processing: {progress.current_date}
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <>
          {/* KPI Summary */}
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <ResultKPI label="Total PnL" value={`₹${result.total_pnl?.toLocaleString('en-IN')}`}
                color={result.total_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <ResultKPI label="Return %" value={`${result.return_pct >= 0 ? '+' : ''}${result.return_pct}%`}
                color={result.return_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <ResultKPI label="Trades" value={`${result.total_trades} (${result.winners}W / ${result.losers}L)`} />
              <ResultKPI label="Win Rate" value={`${result.win_rate}%`}
                color={result.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <ResultKPI label="Profit Factor" value={result.profit_factor?.toFixed(2)}
                color={result.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <ResultKPI label="Sharpe" value={result.sharpe_ratio?.toFixed(2)}
                color={result.sharpe_ratio >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <ResultKPI label="Max DD" value={`₹${result.max_drawdown?.toLocaleString('en-IN')} (${result.max_drawdown_pct}%)`}
                color="var(--accent-red)" />
              <ResultKPI label="Capital" value={`₹${result.initial_capital?.toLocaleString('en-IN')} → ₹${result.ending_capital?.toLocaleString('en-IN')}`}
                color={result.ending_capital >= result.initial_capital ? 'var(--accent-green)' : 'var(--accent-red)'} />
            </div>
          </div>

          {/* Result Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[
              ['summary', 'Equity Curve'],
              ['trades', 'All Trades'],
              ['daily', 'Daily PnL'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveResultTab(key)}
                style={{
                  padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: activeResultTab === key ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.08)',
                  color: activeResultTab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Equity Curve */}
          {activeResultTab === 'summary' && result.equity_curve && (
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Capital Curve</div>
              <div style={{ overflowX: 'auto' }}>
                <EquityCurveChart data={result.equity_curve} initial={result.initial_capital} />
              </div>
            </div>
          )}

          {/* All Trades */}
          {activeResultTab === 'trades' && (
            <div className="card table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Instrument</th><th>Dir</th>
                    <th>Strike</th><th>Mom</th><th>Entry</th><th>Exit</th><th>PnL</th>
                    <th>PnL %</th><th>Exit Reason</th><th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 11 }}>{t.Date}</td>
                      <td>{t.Instrument}</td>
                      <td><span style={{ color: t.Direction === 'CE' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{t.Direction}</span></td>
                      <td style={{ fontWeight: 600 }}>{t.Strike}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t['Momentum Ratio']}x</td>
                      <td style={{ fontSize: 11 }}>{t['Entry Time']} @ ₹{t['Entry Price']}</td>
                      <td style={{ fontSize: 11 }}>{t['Exit Time']} @ ₹{t['Exit Price']}</td>
                      <td style={{ fontWeight: 700, color: t.PnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        ₹{t.PnL?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: t['PnL %'] >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {t['PnL %']}%
                      </td>
                      <td style={{ fontSize: 11 }}>{t['Exit Reason']}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: t.Result === 'WIN' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: t.Result === 'WIN' ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}>{t.Result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily PnL */}
          {activeResultTab === 'daily' && (
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Daily P&L</div>
              <DailyPnLView curve={result.equity_curve} />
            </div>
          )}
        </>
      )}

      {/* ── Past Jobs ── */}
      {jobs.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>Past Backtests</div>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Job ID</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Period</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Trades</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>PnL</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Win Rate</th>
                <th style={{ textAlign: 'center', padding: '4px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.job_id}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{j.job_id}</td>
                  <td style={{ padding: '4px 8px', fontSize: 11 }}>{j.start_date || '—'} → {j.end_date || '—'}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: j.status === 'completed' ? 'rgba(16,185,129,0.15)' : j.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: j.status === 'completed' ? 'var(--accent-green)' : j.status === 'failed' ? 'var(--accent-red)' : '#f59e0b',
                    }}>{j.status}</span>
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{j.total_trades ?? '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: (j.total_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {j.total_pnl != null ? `₹${j.total_pnl.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {j.win_rate != null ? `${j.win_rate}%` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    {j.status === 'completed' && (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => handleLoadResult(j.job_id)} style={smallBtnStyle}>View</button>
                        <button onClick={() => handleExport(j.job_id)} style={smallBtnStyle}>Excel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ResultKPI({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function EquityCurveChart({ data, initial }) {
  if (!data || data.length === 0) return null;
  const maxCap = Math.max(...data.map((d) => d.Capital));
  const minCap = Math.min(...data.map((d) => d.Capital));
  const range = maxCap - minCap || 1;
  const w = Math.max(data.length * 14, 600);
  const h = 180;
  const pad = 30;

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((d.Capital - minCap) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const initialY = h - pad - ((initial - minCap) / range) * (h - pad * 2);
  const endCap = data[data.length - 1].Capital;
  const color = endCap >= initial ? '#10b981' : '#ef4444';

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* Baseline */}
      <line x1={pad} y1={initialY} x2={w - pad} y2={initialY} stroke="rgba(107,114,128,0.3)" strokeDasharray="4,4" />
      <text x={pad - 2} y={initialY - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">₹{initial.toLocaleString('en-IN')}</text>
      {/* Curve */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      {/* End label */}
      <text x={w - pad + 4} y={h - pad - ((endCap - minCap) / range) * (h - pad * 2) + 4}
        fill={color} fontSize="10" fontWeight="700">
        ₹{endCap.toLocaleString('en-IN')}
      </text>
    </svg>
  );
}

function DailyPnLView({ curve }) {
  if (!curve || curve.length === 0) return null;
  const maxPnl = Math.max(...curve.map((d) => Math.abs(d.PnL)));

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      {curve.filter((d) => d.Trades > 0).map((d) => {
        const barWidth = maxPnl > 0 ? Math.abs(d.PnL) / maxPnl * 100 : 0;
        const isPositive = d.PnL >= 0;
        return (
          <div key={d.Date} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>{d.Date}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', minWidth: 20, textAlign: 'center' }}>{d.Trades}T</span>
            <div style={{ flex: 1, display: 'flex', justifyContent: isPositive ? 'flex-start' : 'flex-end' }}>
              <div style={{
                height: 14, borderRadius: 2,
                background: isPositive ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)',
                width: `${Math.max(barWidth, 2)}%`,
              }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, minWidth: 70, textAlign: 'right',
              color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {isPositive ? '+' : ''}₹{d.PnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Styles ── */
const inputStyle = {
  padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(107,114,128,0.3)',
  background: 'rgba(107,114,128,0.08)', color: 'var(--text-primary)', fontSize: 12,
  outline: 'none',
};

const presetBtnStyle = {
  padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
  border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
  background: 'rgba(59,130,246,0.08)', color: 'var(--accent-blue)',
};

const exportBtnStyle = {
  padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700,
  border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer',
  background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)',
};

const smallBtnStyle = {
  padding: '3px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600,
  border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
  background: 'rgba(59,130,246,0.08)', color: 'var(--accent-blue)',
};

export default BacktestPanel;
