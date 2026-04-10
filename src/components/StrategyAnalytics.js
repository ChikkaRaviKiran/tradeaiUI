import React, { useState, useEffect, useCallback } from 'react';
import { fetchStrategyAnalytics } from '../api';

const INSTRUMENT_COLORS = {
  NIFTY: 'var(--accent-blue)',
  SENSEX: 'var(--accent-purple)',
};

function StrategyAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const load = useCallback(async () => {
    try {
      const res = await fetchStrategyAnalytics();
      setData(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (!data) return <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No analytics data available</div>;

  const { today_plan, strategy_rankings, condition_performance, eval_history, trade_stats, data_coverage, today } = data;
  const instruments = today_plan?.instruments || {};

  return (
    <div style={{ marginTop: 4 }}>
      {/* Sub-navigation */}
      <div className="analytics-subnav">
        {[
          ['overview', "Today's Plan"],
          ['rankings', 'Strategy Rankings'],
          ['trades', 'Trade Stats'],
          ['conditions', 'Best Conditions'],
          ['history', 'Eval History'],
          ['coverage', 'Data Coverage'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`analytics-subnav-btn ${activeSection === key ? 'active' : ''}`}
            onClick={() => setActiveSection(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <TodayPlanSection plan={today_plan} rankings={strategy_rankings} today={today} />
      )}
      {activeSection === 'rankings' && (
        <RankingsSection rankings={strategy_rankings} />
      )}
      {activeSection === 'trades' && (
        <TradeStatsSection stats={trade_stats} />
      )}
      {activeSection === 'conditions' && (
        <ConditionsSection conditions={condition_performance} />
      )}
      {activeSection === 'history' && (
        <EvalHistorySection history={eval_history} />
      )}
      {activeSection === 'coverage' && (
        <DataCoverageSection coverage={data_coverage} />
      )}
    </div>
  );
}

/* ─── Today's Plan ───────────────────────────────────────────────────── */
function TodayPlanSection({ plan, rankings, today }) {
  if (!plan || !plan.instruments || Object.keys(plan.instruments).length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        System not running — no plan generated yet. Start the system to generate today's trading plan.
      </div>
    );
  }

  const instruments = plan.instruments;
  const totalAlloc = Object.values(instruments).reduce((s, v) => s + (v.allocated_capital || 0), 0);

  return (
    <>
      {/* Config summary strip */}
      <div className="analytics-config-strip">
        <div className="analytics-config-item">
          <span className="analytics-config-label">Date</span>
          <span className="analytics-config-value">{today}</span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Day Type</span>
          <span className="analytics-config-value" style={{
            color: plan.day_type === 'trending' ? 'var(--accent-green)' :
              plan.day_type === 'ranging' ? 'var(--accent-yellow)' :
                plan.day_type === 'volatile' ? 'var(--accent-red)' : 'var(--text-secondary)'
          }}>
            {(plan.day_type || 'pending').toUpperCase()}
          </span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Total Capital</span>
          <span className="analytics-config-value">₹{(plan.total_capital || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Max Concurrent</span>
          <span className="analytics-config-value">{plan.max_concurrent} ({plan.max_per_instrument}/index)</span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Max Trades/Day</span>
          <span className="analytics-config-value">{plan.max_trades_per_day}</span>
        </div>
      </div>

      {/* Per-instrument cards */}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {Object.entries(instruments).map(([sym, info]) => {
          const pct = totalAlloc > 0 ? (info.allocated_capital / totalAlloc * 100) : 0;
          const instRankings = rankings.filter(r => r.instrument === sym);

          return (
            <div key={sym} className="card" style={{ borderTop: `3px solid ${INSTRUMENT_COLORS[sym] || 'var(--accent-cyan)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: INSTRUMENT_COLORS[sym] || 'var(--text-primary)' }}>{sym}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Lot: {info.lot_size}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>₹{(info.allocated_capital || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(0)}% of capital</div>
                </div>
              </div>

              {/* Capital allocation bar */}
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 12 }}>
                <div style={{
                  height: '100%', borderRadius: 2, width: `${pct}%`,
                  background: INSTRUMENT_COLORS[sym] || 'var(--accent-cyan)',
                }} />
              </div>

              {/* Active strategies */}
              <div className="analytics-config-label" style={{ marginBottom: 6 }}>Active Strategies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {info.strategies.map((s, i) => (
                  <span key={i} className="tag tag-strategy">{s.replace(/_/g, ' ')}</span>
                ))}
              </div>

              {/* Rankings for this instrument */}
              {instRankings.length > 0 && (
                <>
                  <div className="analytics-config-label" style={{ marginBottom: 6 }}>Backtest Rankings</div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Strategy</th>
                          <th>Score</th>
                          <th>Win%</th>
                          <th>PF</th>
                          <th>Trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instRankings.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, color: r.rank <= 3 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {r.rank}
                            </td>
                            <td>
                              <span className="tag tag-strategy">{r.strategy.replace(/_/g, ' ')}</span>
                            </td>
                            <td style={{ fontWeight: 600, color: r.composite_score >= 60 ? 'var(--accent-green)' : r.composite_score >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                              {r.composite_score}
                            </td>
                            <td style={{ color: r.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {r.win_rate}%
                            </td>
                            <td style={{ color: r.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {r.profit_factor}
                            </td>
                            <td>{r.total_trades}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Strategy Rankings (Full Table) ─────────────────────────────────── */
function RankingsSection({ rankings }) {
  if (!rankings || rankings.length === 0) {
    return <EmptyState message="No evaluation data yet. Run a backtest evaluation first." />;
  }

  const evalDate = rankings[0]?.eval_date;
  const evalDays = rankings[0]?.eval_days;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Strategy Rankings</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Eval: {evalDate} · {evalDays} days lookback
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Instrument</th>
              <th>Strategy</th>
              <th>Score</th>
              <th>Win Rate</th>
              <th>Profit Factor</th>
              <th>Sharpe</th>
              <th>Total P&L</th>
              <th>Avg P&L</th>
              <th>Trades</th>
              <th>Max DD</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, color: r.rank <= 3 ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '1rem' }}>
                  {r.rank}
                </td>
                <td>
                  <span style={{ color: INSTRUMENT_COLORS[r.instrument] || 'var(--text-primary)', fontWeight: 600 }}>
                    {r.instrument}
                  </span>
                </td>
                <td><span className="tag tag-strategy">{r.strategy.replace(/_/g, ' ')}</span></td>
                <td style={{ fontWeight: 700, color: scoreColor(r.composite_score) }}>{r.composite_score}</td>
                <td style={{ color: r.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{r.win_rate}%</td>
                <td style={{ color: r.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{r.profit_factor}</td>
                <td style={{ color: r.sharpe_ratio >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{r.sharpe_ratio}</td>
                <td style={{ fontWeight: 600, color: r.total_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ₹{r.total_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td style={{ color: r.avg_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ₹{r.avg_pnl.toFixed(0)}
                </td>
                <td>{r.total_trades}</td>
                <td style={{ color: 'var(--accent-red)' }}>₹{Math.abs(r.max_drawdown).toFixed(0)}</td>
                <td>{(r.signal_frequency * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Trade Stats (Actual Trades) ────────────────────────────────────── */
function TradeStatsSection({ stats }) {
  if (!stats || stats.length === 0) {
    return <EmptyState message="No closed trades recorded yet." />;
  }

  const totalPnl = stats.reduce((s, r) => s + r.total_pnl, 0);
  const totalTrades = stats.reduce((s, r) => s + r.total_trades, 0);
  const totalWins = stats.reduce((s, r) => s + r.wins, 0);

  return (
    <>
      {/* Summary strip */}
      <div className="analytics-config-strip" style={{ marginBottom: 16 }}>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Total Trades</span>
          <span className="analytics-config-value">{totalTrades}</span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Wins / Losses</span>
          <span className="analytics-config-value">
            <span style={{ color: 'var(--accent-green)' }}>{totalWins}W</span>
            {' / '}
            <span style={{ color: 'var(--accent-red)' }}>{totalTrades - totalWins}L</span>
          </span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Win Rate</span>
          <span className="analytics-config-value" style={{ color: totalTrades ? (totalWins / totalTrades * 100 >= 50 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)' }}>
            {totalTrades ? (totalWins / totalTrades * 100).toFixed(1) : 0}%
          </span>
        </div>
        <div className="analytics-config-item">
          <span className="analytics-config-label">Total P&L</span>
          <span className="analytics-config-value" style={{ color: totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Per Strategy Trade Stats</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Strategy</th>
                <th>Trades</th>
                <th>Win/Loss</th>
                <th>Win Rate</th>
                <th>Total P&L</th>
                <th>Avg P&L</th>
                <th>First Trade</th>
                <th>Last Trade</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span style={{ color: INSTRUMENT_COLORS[r.instrument] || 'var(--text-primary)', fontWeight: 600 }}>
                      {r.instrument}
                    </span>
                  </td>
                  <td><span className="tag tag-strategy">{r.strategy.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.total_trades}</td>
                  <td>
                    <span style={{ color: 'var(--accent-green)' }}>{r.wins}W</span>
                    {' / '}
                    <span style={{ color: 'var(--accent-red)' }}>{r.total_trades - r.wins}L</span>
                  </td>
                  <td style={{ fontWeight: 600, color: r.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {r.win_rate}%
                  </td>
                  <td style={{ fontWeight: 700, color: r.total_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    ₹{r.total_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ color: r.avg_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    ₹{r.avg_pnl.toFixed(0)}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.first_trade}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.last_trade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Best Conditions ────────────────────────────────────────────────── */
function ConditionsSection({ conditions }) {
  if (!conditions || conditions.length === 0) {
    return <EmptyState message="No condition performance data yet. Needs at least 3 trades per condition." />;
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top Performing Conditions</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Sorted by composite score · Min 3 trades
        </span>
      </div>
      <div className="table-container" style={{ maxHeight: 600, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Strategy</th>
              <th>Day Type</th>
              <th>Gap</th>
              <th>VIX</th>
              <th>Score</th>
              <th>Win%</th>
              <th>PF</th>
              <th>Trades</th>
              <th>Avg P&L</th>
              <th>Best Window</th>
              <th>Prob%</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((c, i) => (
              <tr key={i}>
                <td>
                  <span style={{ color: INSTRUMENT_COLORS[c.instrument] || 'var(--text-primary)', fontWeight: 600 }}>
                    {c.instrument}
                  </span>
                </td>
                <td><span className="tag tag-strategy">{c.strategy.replace(/_/g, ' ')}</span></td>
                <td>
                  <span style={{
                    color: c.day_type === 'trending' ? 'var(--accent-green)' :
                      c.day_type === 'ranging' ? 'var(--accent-yellow)' : 'var(--accent-red)'
                  }}>
                    {c.day_type}
                  </span>
                </td>
                <td style={{ fontSize: 11 }}>{c.gap_bucket}</td>
                <td style={{ fontSize: 11 }}>{c.vix_bucket}</td>
                <td style={{ fontWeight: 700, color: scoreColor(c.composite_score) }}>{c.composite_score}</td>
                <td style={{ color: c.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.win_rate}%</td>
                <td style={{ color: c.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.profit_factor}</td>
                <td>{c.total_trades}</td>
                <td style={{ color: c.avg_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>₹{c.avg_pnl.toFixed(0)}</td>
                <td style={{ fontSize: 11 }}>{c.best_entry_window}</td>
                <td>{c.probability}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Evaluation History ─────────────────────────────────────────────── */
function EvalHistorySection({ history }) {
  if (!history || history.length === 0) {
    return <EmptyState message="No evaluation history. Evaluations run daily after market close." />;
  }

  // Group by date
  const dateMap = {};
  history.forEach(h => {
    if (!dateMap[h.eval_date]) dateMap[h.eval_date] = [];
    dateMap[h.eval_date].push(h);
  });
  const dates = Object.keys(dateMap).sort().reverse();

  // Get unique strategy+instrument combos for the mini chart
  const combos = {};
  history.forEach(h => {
    const key = `${h.instrument}|${h.strategy}`;
    if (!combos[key]) combos[key] = { instrument: h.instrument, strategy: h.strategy, scores: [] };
    combos[key].scores.push({ date: h.eval_date, score: h.composite_score });
  });

  return (
    <>
      {/* Score trend cards */}
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        {Object.values(combos).map((c, i) => {
          const sorted = [...c.scores].sort((a, b) => a.date.localeCompare(b.date));
          const latest = sorted[sorted.length - 1]?.score || 0;
          const prev = sorted.length > 1 ? sorted[sorted.length - 2]?.score || 0 : latest;
          const delta = latest - prev;

          return (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: INSTRUMENT_COLORS[c.instrument] || 'var(--text-primary)', fontSize: 12 }}>
                  {c.instrument}
                </span>
                <span className="tag tag-strategy" style={{ fontSize: 10 }}>{c.strategy.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: scoreColor(latest) }}>{latest}</span>
                <span style={{ fontSize: 11, color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                </span>
              </div>
              {/* Mini sparkline (text-based) */}
              <div style={{ display: 'flex', gap: 2, marginTop: 6, alignItems: 'flex-end', height: 24 }}>
                {sorted.slice(-14).map((s, j) => {
                  const h = Math.max(4, (s.score / 100) * 24);
                  return (
                    <div key={j} title={`${s.date}: ${s.score}`} style={{
                      flex: 1, height: h, borderRadius: 1,
                      background: scoreColor(s.score), opacity: 0.7,
                    }} />
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {sorted.length} evaluations
              </div>
            </div>
          );
        })}
      </div>

      {/* Full history table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Evaluation History (Last 30 Days)</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dates.length} evaluation days</span>
        </div>
        <div className="table-container" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Instrument</th>
                <th>Strategy</th>
                <th>Score</th>
                <th>Win Rate</th>
                <th>PF</th>
                <th>Trades</th>
              </tr>
            </thead>
            <tbody>
              {dates.map(date =>
                dateMap[date].map((h, i) => (
                  <tr key={`${date}-${i}`}>
                    {i === 0 ? (
                      <td rowSpan={dateMap[date].length} style={{ fontWeight: 600, verticalAlign: 'top' }}>{date}</td>
                    ) : null}
                    <td>
                      <span style={{ color: INSTRUMENT_COLORS[h.instrument] || 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
                        {h.instrument}
                      </span>
                    </td>
                    <td><span className="tag tag-strategy" style={{ fontSize: 10 }}>{h.strategy.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontWeight: 700, color: scoreColor(h.composite_score) }}>{h.composite_score}</td>
                    <td style={{ color: h.win_rate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{h.win_rate}%</td>
                    <td style={{ color: h.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{h.profit_factor}</td>
                    <td>{h.total_trades}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Data Coverage ──────────────────────────────────────────────────── */
function DataCoverageSection({ coverage }) {
  if (!coverage || Object.keys(coverage).length === 0) {
    return <EmptyState message="No candle data collected yet." />;
  }

  return (
    <div className="grid grid-2">
      {Object.entries(coverage).map(([sym, info]) => (
        <div key={sym} className="card" style={{ borderTop: `3px solid ${INSTRUMENT_COLORS[sym] || 'var(--accent-cyan)'}` }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: INSTRUMENT_COLORS[sym] || 'var(--text-primary)', marginBottom: 16 }}>
            {sym}
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            {/* Index candles */}
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Index Candles</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: '4px 0' }}>
                {info.index_candle_days || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>days collected</div>
              {info.from && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {info.from} → {info.to}
                </div>
              )}
            </div>

            {/* Option candles */}
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Option Candles</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-purple)', margin: '4px 0' }}>
                {info.option_candle_days || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>days collected</div>
              {info.option_from && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {info.option_from} → {info.option_to}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function EmptyState({ message }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
      {message}
    </div>
  );
}

function scoreColor(score) {
  if (score >= 65) return 'var(--accent-green)';
  if (score >= 45) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

export default StrategyAnalytics;
