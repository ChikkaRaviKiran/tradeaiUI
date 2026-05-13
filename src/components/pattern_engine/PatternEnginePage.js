// Pattern Engine UI — self-contained tabbed page.
// Tabs: Live | Library | Performance | Probes | Health
// Click a pattern row in Library → opens Pattern Detail modal.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  pePatternDetail, pePatternList, pePerformance, peProbes, peHealth, peLive,
  peSetPatternStatus, peSetPatternSize, peRefreshStats, peSeedPatterns,
  peSchedulerStatus, peSchedulerRunNow,
} from '../../api';

const TABS = ['Live', 'Library', 'Performance', 'Probes', 'Health'];
const STATUS_COLORS = {
  live: '#10b981', shadow: '#3b82f6', research: '#a78bfa',
  paused: '#f59e0b', retired: '#6b7280',
};
const TIER_COLORS = { S: '#10b981', A: '#3b82f6', B: '#f59e0b', REJECT: '#ef4444' };

function Pill({ children, color = '#6b7280', bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, color,
      background: bg || `${color}22`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function fmtPct(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * (Math.abs(v) <= 1 ? 100 : 1)).toFixed(digits)}%`;
}
function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toFixed(digits);
}

// ───────────────────────────────────────────────────────────────────────
// Live tab
// ───────────────────────────────────────────────────────────────────────
function LiveTab() {
  const [data, setData] = useState({ matches: [], ts: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await peLive();
      setData(r.data || { matches: [] });
      setError('');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load live state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  const snap = data.matches[0]?.snapshot;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Last evaluated: {data.ts ? new Date(data.ts).toLocaleTimeString() : '—'}
          {loading && ' · refreshing'}
        </div>
        <button className="btn" onClick={load} disabled={loading}>Re-evaluate now</button>
      </div>

      {error && <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 12 }}>{error}</div>}

      {snap && (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <Stat label="Spot" value={fmtNum(snap.spot, 2)} sub={`Open ${fmtNum(snap.day_open, 2)}`} />
          <Stat label="VWAP" value={fmtNum(snap.vwap, 2)} sub={`dist ${fmtNum(snap.vwap_dist_pct, 2)}%`} />
          <Stat label="Regime" value={(snap.regime || '—').toUpperCase()} sub={snap.time_bucket} />
          <Stat label="Gap" value={`${fmtNum(snap.gap_pct, 2)}%`} sub={snap.gap_class || '—'} />
        </div>
      )}

      <h3 style={{ margin: '12px 0 8px' }}>Active Pattern Matches</h3>
      {data.matches.length === 0 ? (
        <div className="card" style={{ padding: 16, color: 'var(--text-secondary)' }}>
          No patterns matching at this moment.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.matches.map((m) => (
            <div key={m.pattern_id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.pattern_id}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Pill color={m.direction === 'CE' ? '#10b981' : '#ef4444'}>{m.direction}</Pill>
                  <Pill color={STATUS_COLORS[m.status] || '#6b7280'}>{m.status.toUpperCase()}</Pill>
                  <Pill color={m.decision === 'taken' ? '#10b981' : (m.decision.startsWith('skipped') ? '#ef4444' : '#3b82f6')}>
                    {m.decision.toUpperCase()}
                  </Pill>
                </div>
              </div>

              <div className="grid grid-4" style={{ marginTop: 10 }}>
                <Stat label="Mini-sim N" value={m.minisim?.n ?? 0} />
                <Stat label="WR (30d)" value={fmtPct(m.minisim?.wr)} />
                <Stat label="PF (30d)" value={fmtNum(m.minisim?.pf, 2)} />
                <Stat label="Expectancy" value={`${fmtNum(m.minisim?.expectancy_pct, 2)}%`} />
              </div>

              {m.skip_reason && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
                  Skip reason: {m.skip_reason}
                </div>
              )}
              {m.minisim?.last_5_pnl?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Last 5 PnL %: {m.minisim.last_5_pnl.map((p, i) => (
                    <span key={i} style={{ color: p >= 0 ? '#10b981' : '#ef4444', marginLeft: 6 }}>
                      {p > 0 ? '+' : ''}{p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Library tab
// ───────────────────────────────────────────────────────────────────────
function LibraryTab({ onOpen }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await pePatternList()).data || []); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cycleStatus = async (p) => {
    const order = ['shadow', 'live', 'paused', 'retired'];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    setBusy(p.pattern_id);
    try { await peSetPatternStatus(p.pattern_id, next); await load(); } finally { setBusy(null); }
  };

  const setSize = async (p, mult) => {
    setBusy(p.pattern_id);
    try { await peSetPatternSize(p.pattern_id, mult); await load(); } finally { setBusy(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={load} disabled={loading}>Refresh</button>
        <button className="btn" onClick={async () => { await peSeedPatterns(); load(); }}>
          Re-seed defaults
        </button>
        <button className="btn" onClick={async () => { await peRefreshStats(); load(); }}>
          Refresh stats
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          No patterns yet. Run the backfill to populate (see Health tab for command).
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Dir</th>
                <th>Status</th>
                <th>Size</th>
                <th>Tier</th>
                <th>N</th>
                <th>WR</th>
                <th>PF</th>
                <th>Exp%</th>
                <th>PnL%</th>
                <th>30d N/WR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sa = p.stats_all || {};
                const s30 = p.stats_30d || {};
                return (
                  <tr key={p.pattern_id} onClick={() => onOpen(p.pattern_id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.pattern_id}</div>
                    </td>
                    <td><Pill color={p.direction === 'CE' ? '#10b981' : '#ef4444'}>{p.direction}</Pill></td>
                    <td><Pill color={STATUS_COLORS[p.status] || '#6b7280'}>{p.status}</Pill></td>
                    <td>{fmtNum(p.size_multiplier, 2)}x</td>
                    <td>{sa.suggested_tier ? <Pill color={TIER_COLORS[sa.suggested_tier]}>{sa.suggested_tier}</Pill> : '—'}</td>
                    <td>{sa.n_trades ?? 0}</td>
                    <td>{fmtPct(sa.win_rate)}</td>
                    <td>{fmtNum(sa.profit_factor)}</td>
                    <td>{fmtNum(sa.expectancy_pct)}</td>
                    <td style={{ color: (sa.total_pnl_pct || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      {fmtNum(sa.total_pnl_pct)}
                    </td>
                    <td>{(s30.n_trades ?? 0)} / {fmtPct(s30.win_rate)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn-mini" disabled={busy === p.pattern_id} onClick={() => cycleStatus(p)}>
                        Cycle
                      </button>
                      <select
                        value={p.size_multiplier}
                        onChange={(e) => setSize(p, parseFloat(e.target.value))}
                        style={{ marginLeft: 6, padding: 2, fontSize: 11 }}
                      >
                        {[0, 0.5, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v}x</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Pattern Detail modal
// ───────────────────────────────────────────────────────────────────────
function DetailModal({ patternId, onClose }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    pePatternDetail(patternId).then((r) => alive && setD(r.data)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [patternId]);

  if (!patternId) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{
        width: '92%', maxWidth: 1100, maxHeight: '92vh', overflow: 'auto', padding: 16,
      }}>
        {loading && <div>Loading…</div>}
        {!loading && d && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0 }}>{d.pattern.name}</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.pattern.pattern_id}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Pill color={d.pattern.direction === 'CE' ? '#10b981' : '#ef4444'}>{d.pattern.direction}</Pill>
                <Pill color={STATUS_COLORS[d.pattern.status]}>{d.pattern.status.toUpperCase()}</Pill>
                <button className="btn-mini" onClick={onClose}>✕</button>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0 }}>{d.pattern.description}</p>

            <div className="grid grid-4" style={{ marginBottom: 12 }}>
              {['all', '180d', '90d', '30d'].map((w) => {
                const s = d.stats?.[w];
                return (
                  <div key={w} className="card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtPct(s?.win_rate)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      N={s?.n_trades ?? 0} · PF={fmtNum(s?.profit_factor)} · Exp={fmtNum(s?.expectancy_pct)}%
                    </div>
                    <div style={{ fontSize: 11, color: (s?.total_pnl_pct || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      Total PnL: {fmtNum(s?.total_pnl_pct)}%
                    </div>
                    {s?.suggested_tier && (
                      <div style={{ marginTop: 4 }}>
                        <Pill color={TIER_COLORS[s.suggested_tier]}>Tier {s.suggested_tier}</Pill>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {d.equity_curve?.length > 0 && (
              <>
                <h3 style={{ marginBottom: 6 }}>Equity Curve (last 100 trades)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={d.equity_curve}>
                    <defs>
                      <linearGradient id="ec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="ts" tick={{ fontSize: 10 }} hide />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cum_pnl_pct" stroke="#10b981" fill="url(#ec)" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}

            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div>
                <h4>Win-rate by time bucket</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={d.by_time_bucket}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, n) => n === 'wr' ? `${(v * 100).toFixed(1)}%` : v} />
                    <Bar dataKey="wr">
                      {d.by_time_bucket.map((e, i) => (
                        <Cell key={i} fill={e.wr >= 0.5 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4>Win-rate by regime</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={d.by_regime}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, n) => n === 'wr' ? `${(v * 100).toFixed(1)}%` : v} />
                    <Bar dataKey="wr">
                      {d.by_regime.map((e, i) => (
                        <Cell key={i} fill={e.wr >= 0.5 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <h3 style={{ marginTop: 16 }}>Recent occurrences</h3>
            <div style={{ overflow: 'auto', maxHeight: 280 }}>
              <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                <thead><tr>
                  <th>Time</th><th>Spot</th><th>PnL%</th><th>Spot pts</th>
                  <th>Hold (m)</th><th>MAE%</th><th>MFE%</th><th>Exit</th><th>Regime</th>
                </tr></thead>
                <tbody>
                  {d.recent_occurrences.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.ts).toLocaleString()}</td>
                      <td>{fmtNum(r.spot_at_entry, 2)}</td>
                      <td style={{ color: r.outcome_pnl_pct >= 0 ? '#10b981' : '#ef4444' }}>
                        {fmtNum(r.outcome_pnl_pct, 2)}
                      </td>
                      <td>{fmtNum(r.outcome_spot_pts, 1)}</td>
                      <td>{r.hold_minutes}</td>
                      <td>{fmtNum(r.mae_pct, 2)}</td>
                      <td>{fmtNum(r.mfe_pct, 2)}</td>
                      <td>{r.exit_reason}</td>
                      <td>{r.regime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <div className="card" style={{ padding: 10 }}>
                <h4 style={{ marginTop: 0 }}>Trigger</h4>
                <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(d.pattern.trigger, null, 2)}
                </pre>
              </div>
              <div className="card" style={{ padding: 10 }}>
                <h4 style={{ marginTop: 0 }}>Exit Rule</h4>
                <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(d.pattern.exit_rule, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Performance tab
// ───────────────────────────────────────────────────────────────────────
function PerformanceTab() {
  const [days, setDays] = useState(30);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPerf((await pePerformance(days)).data); } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (!perf) return <div className="card" style={{ padding: 16 }}>{loading ? 'Loading…' : 'No data'}</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13 }}>Window:</span>
        {[7, 30, 90, 180, 365].map((d) => (
          <button key={d} className={`btn-mini ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
            {d}d
          </button>
        ))}
      </div>

      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Trades" value={perf.n_trades} sub={`${perf.wins}W / ${perf.losses}L`} />
        <Stat label="Win rate" value={fmtPct(perf.win_rate)} />
        <Stat label="Profit factor" value={fmtNum(perf.profit_factor)} />
        <Stat label="Total PnL %" value={`${fmtNum(perf.total_pnl_pct)}%`}
          color={perf.total_pnl_pct >= 0 ? '#10b981' : '#ef4444'} />
        <Stat label="Expectancy %" value={fmtNum(perf.expectancy_pct)} />
        <Stat label="Avg win %" value={fmtNum(perf.avg_win_pct)} color="#10b981" />
        <Stat label="Avg loss %" value={fmtNum(perf.avg_loss_pct)} color="#ef4444" />
        <Stat label="Max DD %" value={fmtNum(perf.max_drawdown_pct)} color="#ef4444" />
      </div>

      {perf.equity_curve?.length > 0 && (
        <div className="card" style={{ padding: 10, marginBottom: 12 }}>
          <h4 style={{ marginTop: 0 }}>Cumulative PnL</h4>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={perf.equity_curve}>
              <defs>
                <linearGradient id="eq2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="ts" tick={{ fontSize: 10 }} hide />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="cum_pnl_pct" stroke="#3b82f6" fill="url(#eq2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card" style={{ padding: 10 }}>
          <h4 style={{ marginTop: 0 }}>Weekly PnL</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={perf.weekly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="pnl">
                {perf.weekly.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 10 }}>
          <h4 style={{ marginTop: 0 }}>Monthly PnL</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={perf.monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="pnl">
                {perf.monthly.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3 style={{ marginTop: 16 }}>Per-Pattern Breakdown</h3>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
          <thead><tr>
            <th>Pattern</th><th>N</th><th>W/L</th><th>WR</th><th>PnL%</th><th>Avg PnL%</th>
          </tr></thead>
          <tbody>
            {perf.by_pattern.map((p) => (
              <tr key={p.pattern_id}>
                <td>{p.pattern_id}</td>
                <td>{p.n}</td>
                <td>{p.wins}/{p.losses}</td>
                <td>{fmtPct(p.wr)}</td>
                <td style={{ color: p.pnl_pct >= 0 ? '#10b981' : '#ef4444' }}>{fmtNum(p.pnl_pct)}</td>
                <td>{fmtNum(p.avg_pnl_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Probes tab (every live decision, taken or skipped)
// ───────────────────────────────────────────────────────────────────────
function ProbesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await peProbes(200)).data || []); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Last 200 live evaluations (taken + skipped). Skipped ones tell you whether your gates are too tight.
        </div>
        <button className="btn" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
          <thead><tr>
            <th>Time</th><th>Pattern</th><th>Decision</th>
            <th>N</th><th>WR</th><th>PF</th><th>Edge</th><th>Skip reason</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ts + r.pattern_id}>
                <td>{new Date(r.ts).toLocaleString()}</td>
                <td>{r.pattern_id}</td>
                <td>
                  <Pill color={r.decision === 'taken' ? '#10b981' : (r.decision.startsWith('skipped') ? '#ef4444' : '#3b82f6')}>
                    {r.decision}
                  </Pill>
                </td>
                <td>{r.minisim_n ?? '—'}</td>
                <td>{r.minisim_wr != null ? fmtPct(r.minisim_wr) : '—'}</td>
                <td>{r.minisim_pf != null ? fmtNum(r.minisim_pf) : '—'}</td>
                <td>{r.edge_score != null ? fmtNum(r.edge_score) : '—'}</td>
                <td style={{ color: '#ef4444' }}>{r.skip_reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Health tab
// ───────────────────────────────────────────────────────────────────────
function HealthTab() {
  const [h, setH] = useState(null);
  const [sched, setSched] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hr, sr] = await Promise.all([peHealth(), peSchedulerStatus()]);
      setH(hr.data); setSched(sr.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const runNow = async () => {
    setRunning(true); setMsg('');
    try {
      const r = await peSchedulerRunNow();
      setSched(r.data);
      setMsg(`Done at ${new Date(r.data.stats_refresh_at).toLocaleTimeString()} — wrote ${r.data.stats_rows_written} stat rows, ${r.data.auto_tier_changes} tier changes`);
      load();
    } catch (e) {
      setMsg('Failed: ' + (e?.response?.data?.detail || e.message));
    } finally { setRunning(false); }
  };

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Patterns" value={h?.patterns ?? '—'} />
        <Stat label="Occurrences" value={h?.occurrences ?? '—'} />
        <Stat label="Live probes" value={h?.live_probes ?? '—'} />
        <Stat label="Last occurrence" value={h?.last_occurrence_ts ? new Date(h.last_occurrence_ts).toLocaleString() : '—'} />
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Nightly Scheduler</h4>
          <button className="btn" onClick={runNow} disabled={running}>
            {running ? 'Running…' : 'Run nightly job now'}
          </button>
        </div>
        <div className="grid grid-2" style={{ marginTop: 10, fontSize: 12 }}>
          <div>
            <div><b>Last stats refresh:</b> {sched?.stats_refresh_at ? new Date(sched.stats_refresh_at).toLocaleString() : 'never'}</div>
            <div><b>Stat rows written:</b> {sched?.stats_rows_written ?? 0}</div>
            <div><b>Last auto-tier sync:</b> {sched?.auto_tier_at ? new Date(sched.auto_tier_at).toLocaleString() : 'never'}</div>
            <div><b>Auto-tier changes:</b> {sched?.auto_tier_changes ?? 0}</div>
          </div>
          <div>
            <div><b>Next scheduled run:</b> {sched?.next_run_at ? new Date(sched.next_run_at).toLocaleString() : '—'}</div>
            <div><b>Schedule:</b> 22:30 IST stats · 22:35 IST auto-tier</div>
            {sched?.last_error && (
              <div style={{ color: '#ef4444', marginTop: 6 }}><b>Last error:</b> {sched.last_error}</div>
            )}
          </div>
        </div>
        {msg && <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>{msg}</div>}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <h4 style={{ marginTop: 0 }}>One-time setup commands</h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Run on the EC2 backend to populate historical data. Idempotent — safe to re-run.
        </p>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: 10, fontSize: 11, overflow: 'auto' }}>
{`# 1. Backfill last 18 months (one-time, ~5–15 min)
ssh -i LightsailDefaultKey-ap-south-1.pem ubuntu@35.154.9.116
docker exec tradeai-backend python -m app.pattern_engine.backfill --days 540

# 2. After backfill, click “Run nightly job now” above (or it auto-runs at 22:30 IST)`}
        </pre>
        <button className="btn" onClick={load} disabled={loading} style={{ marginTop: 8 }}>Refresh health</button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────
export default function PatternEnginePage() {
  const [tab, setTab] = useState('Live');
  const [openId, setOpenId] = useState(null);

  return (
    <section className="section" style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >{t}</button>
        ))}
      </div>

      {tab === 'Live' && <LiveTab />}
      {tab === 'Library' && <LibraryTab onOpen={setOpenId} />}
      {tab === 'Performance' && <PerformanceTab />}
      {tab === 'Probes' && <ProbesTab />}
      {tab === 'Health' && <HealthTab />}

      <DetailModal patternId={openId} onClose={() => setOpenId(null)} />
    </section>
  );
}
