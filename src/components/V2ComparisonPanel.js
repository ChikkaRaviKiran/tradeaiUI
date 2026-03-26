import React from 'react';

const DAY_TYPE_COLORS = {
  trend: 'var(--accent-green)',
  range: 'var(--accent-blue)',
  volatile: 'var(--accent-red)',
  unclear: 'var(--accent-yellow)',
  pending: 'var(--text-secondary)',
};

function MetricCard({ label, v1, v2, format, better }) {
  // better: 'higher' or 'lower' — determines which side gets highlighted
  const v1Val = typeof v1 === 'number' ? v1 : 0;
  const v2Val = typeof v2 === 'number' ? v2 : 0;
  const v1Better = better === 'higher' ? v1Val > v2Val : v1Val < v2Val;
  const v2Better = better === 'higher' ? v2Val > v1Val : v2Val < v1Val;

  const fmt = (val) => {
    if (format === 'pct') return `${(val || 0).toFixed(1)}%`;
    if (format === 'inr') return `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    if (format === 'decimal') return (val || 0).toFixed(2);
    return val ?? 0;
  };

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-title" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>V1</div>
          <div style={{
            fontSize: '1.2rem', fontWeight: 700,
            color: v1Better ? 'var(--accent-green)' : 'var(--text-primary)',
          }}>{fmt(v1)}</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', margin: '0 4px' }} />
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginBottom: 2 }}>V2</div>
          <div style={{
            fontSize: '1.2rem', fontWeight: 700,
            color: v2Better ? 'var(--accent-green)' : 'var(--text-primary)',
          }}>{fmt(v2)}</div>
        </div>
      </div>
    </div>
  );
}

function V2ComparisonPanel({ v2Status, comparison, v2ActiveTrades, v2TodayTrades }) {
  const v1 = comparison?.v1 || {};
  const v2 = comparison?.v2 || {};
  const status = v2Status || {};

  const dayType = (status.day_type || 'pending').toLowerCase();
  const dayTypeColor = DAY_TYPE_COLORS[dayType] || 'var(--text-secondary)';

  const v2Closed = (v2TodayTrades || []).filter((t) => t.status === 'closed');

  return (
    <div>
      {/* V2 Status Bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: status.enabled ? 'var(--accent-green)' : 'var(--accent-red)',
            }} />
            <span style={{ fontWeight: 600 }}>V2 Engine</span>
            <span style={{
              padding: '2px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700,
              background: `${dayTypeColor}22`, color: dayTypeColor, textTransform: 'uppercase',
            }}>
              {dayType}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Active: <strong style={{ color: 'var(--text-primary)' }}>{status.active_count || 0}</strong></span>
            <span>Today: <strong style={{ color: 'var(--text-primary)' }}>{status.today_total || 0}</strong></span>
            <span>Wins: <strong style={{ color: 'var(--accent-green)' }}>{status.today_wins || 0}</strong></span>
            <span>PnL: <strong style={{ color: (status.today_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              ₹{(status.today_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </strong></span>
          </div>
        </div>
      </div>

      {/* Side-by-side metrics */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <MetricCard label="Win Rate" v1={v1.win_rate} v2={v2.win_rate} format="pct" better="higher" />
        <MetricCard label="Total PnL" v1={v1.total_pnl} v2={v2.total_pnl} format="inr" better="higher" />
        <MetricCard label="Profit Factor" v1={v1.profit_factor} v2={v2.profit_factor} format="decimal" better="higher" />
        <MetricCard label="Avg PnL/Trade" v1={v1.avg_pnl_per_trade} v2={v2.avg_pnl_per_trade} format="inr" better="higher" />
      </div>

      {/* V2 Active Trades */}
      {v2ActiveTrades && v2ActiveTrades.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--accent-blue)' }}>V2 Active Trades</h3>
          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Strategy</th>
                  <th>Type</th>
                  <th>Day</th>
                  <th>Entry</th>
                  <th>SL</th>
                  <th>T1</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {v2ActiveTrades.map((trade) => (
                  <tr key={trade.trade_id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{trade.time || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                    <td><span className="tag tag-strategy">{trade.strategy}</span></td>
                    <td>
                      <span className={`tag ${trade.option_type === 'CE' ? 'tag-ce' : 'tag-pe'}`}>
                        {trade.option_type}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600,
                        background: `${DAY_TYPE_COLORS[trade.day_type] || 'var(--text-secondary)'}22`,
                        color: DAY_TYPE_COLORS[trade.day_type] || 'var(--text-secondary)',
                        textTransform: 'uppercase',
                      }}>{trade.day_type || '—'}</span>
                    </td>
                    <td>{trade.entry_price?.toFixed(2)}</td>
                    <td className="negative">{trade.stoploss?.toFixed(2)}</td>
                    <td className="positive">{trade.target1?.toFixed(2)}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                        background: trade.confidence >= 70 ? 'rgba(34,197,94,0.15)' : trade.confidence >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: trade.confidence >= 70 ? 'var(--accent-green)' : trade.confidence >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                      }}>{trade.confidence?.toFixed(0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* V2 Completed Trades */}
      {v2Closed.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--accent-blue)' }}>V2 Completed Trades</h3>
          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Strategy</th>
                  <th>Type</th>
                  <th>Day</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>PnL</th>
                  <th>Exit Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {v2Closed.map((trade) => {
                  const isWin = (trade.pnl || 0) > 0;
                  return (
                    <tr key={trade.trade_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{trade.time}{trade.exit_time ? ` → ${trade.exit_time}` : ''}</td>
                      <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                      <td><span className="tag tag-strategy">{trade.strategy}</span></td>
                      <td>
                        <span className={`tag ${trade.option_type === 'CE' ? 'tag-ce' : 'tag-pe'}`}>
                          {trade.option_type}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600,
                          background: `${DAY_TYPE_COLORS[trade.day_type] || 'var(--text-secondary)'}22`,
                          color: DAY_TYPE_COLORS[trade.day_type] || 'var(--text-secondary)',
                          textTransform: 'uppercase',
                        }}>{trade.day_type || '—'}</span>
                      </td>
                      <td>{trade.entry_price?.toFixed(2)}</td>
                      <td>{trade.exit_price?.toFixed(2)}</td>
                      <td className={isWin ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                        {isWin ? '+' : ''}{trade.pnl?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {trade.exit_type || trade.reason || '—'}
                      </td>
                      <td>
                        <span className={`tag ${isWin ? 'tag-ce' : 'tag-pe'}`}>
                          {isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!v2ActiveTrades || v2ActiveTrades.length === 0) && v2Closed.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
          No V2 trades yet today
        </div>
      )}
    </div>
  );
}

export default V2ComparisonPanel;
