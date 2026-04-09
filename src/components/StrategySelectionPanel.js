import React from 'react';

const DAY_TYPE_COLORS = {
  trend: 'var(--accent-green)',
  range: 'var(--accent-blue)',
  volatile: 'var(--accent-red)',
  unclear: 'var(--accent-yellow)',
  pending: 'var(--text-secondary)',
  unknown: 'var(--text-secondary)',
};

const CONFIDENCE_COLORS = {
  high: { bg: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)' },
  medium: { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow)' },
  low: { bg: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' },
};

function StrategySelectionPanel({ selection, comparison }) {
  const sel = selection || {};
  const selections = sel.selections || [];
  const dayType = (sel.day_type || 'pending').toLowerCase();
  const dayTypeColor = DAY_TYPE_COLORS[dayType] || 'var(--text-secondary)';
  const activeStrategies = sel.active_strategies || [];

  return (
    <div>
      {/* Conditions & Day Type Bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>Today's Conditions</span>
            <span style={{
              padding: '2px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700,
              background: `${dayTypeColor}22`, color: dayTypeColor, textTransform: 'uppercase',
            }}>
              {dayType}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Active Strategies: <strong style={{ color: 'var(--text-primary)' }}>{activeStrategies.length}</strong></span>
            {activeStrategies.length > 0 && (
              <span>{activeStrategies.map(s => s.replace(/_/g, ' ')).join(', ')}</span>
            )}
          </div>
        </div>

        {/* Show conditions for each instrument */}
        {selections.length > 0 && selections[0]?.conditions && (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {selections.map((s, i) => {
              const cond = s.conditions || {};
              return (
                <div key={i} style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: 'rgba(107,114,128,0.08)', fontSize: '0.8rem',
                }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{s.instrument || 'Unknown'}</span>
                  {cond.gap_bucket && (
                    <span style={{ marginRight: 6 }}>Gap: <strong>{cond.gap_bucket}</strong></span>
                  )}
                  {cond.vix_bucket && (
                    <span style={{ marginRight: 6 }}>VIX: <strong>{cond.vix_bucket}</strong></span>
                  )}
                  {cond.regime && (
                    <span>Regime: <strong>{cond.regime}</strong></span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strategy Picks */}
      {selections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {selections.map((sel, idx) => {
            const picks = sel.selected || [];
            const avoided = sel.avoided || [];
            return (
              <div key={idx} className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>
                  {sel.instrument || `Selection ${idx + 1}`}
                </div>

                {picks.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: avoided.length > 0 ? 10 : 0 }}>
                    {picks.map((pick, pi) => {
                      const conf = pick.confidence || 'medium';
                      const confStyle = CONFIDENCE_COLORS[conf] || CONFIDENCE_COLORS.medium;
                      return (
                        <div key={pi} style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: confStyle.bg, border: `1px solid ${confStyle.color}33`,
                          minWidth: 160,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {(pick.strategy || '').replace(/_/g, ' ')}
                            </span>
                            <span style={{
                              padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                              background: confStyle.bg, color: confStyle.color, textTransform: 'uppercase',
                            }}>{conf}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {pick.probability != null && (
                              <span>Win: <strong style={{ color: pick.probability >= 55 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                                {pick.probability.toFixed(0)}%
                              </strong></span>
                            )}
                            {pick.composite_score != null && (
                              <span>Score: <strong>{pick.composite_score.toFixed(0)}</strong></span>
                            )}
                            {pick.best_entry_window && (
                              <span>Best: <strong>{pick.best_entry_window}</strong></span>
                            )}
                          </div>
                          {pick.reason && (
                            <div style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                              {pick.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No strategies selected — using defaults
                  </div>
                )}

                {/* Avoided strategies */}
                {avoided.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Avoided: {avoided.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Strategy selection runs during pre-market analysis
        </div>
      )}

      {/* Per-Strategy Performance Comparison */}
      {comparison && Object.keys(comparison).length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>Strategy Performance (Today)</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Trades</th>
                  <th>Win Rate</th>
                  <th>PnL</th>
                  <th>Profit Factor</th>
                  <th>Avg PnL</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison)
                  .sort(([, a], [, b]) => (b.total_pnl || 0) - (a.total_pnl || 0))
                  .map(([strategy, stats]) => {
                    const isProfit = (stats.total_pnl || 0) >= 0;
                    return (
                      <tr key={strategy}>
                        <td style={{ fontWeight: 600 }}>{strategy.replace(/_/g, ' ')}</td>
                        <td>{stats.total_trades || 0}</td>
                        <td style={{ color: (stats.win_rate || 0) >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {(stats.win_rate || 0).toFixed(1)}%
                        </td>
                        <td className={isProfit ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                          {isProfit ? '+' : ''}₹{(stats.total_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ color: (stats.profit_factor || 0) >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {(stats.profit_factor || 0).toFixed(2)}
                        </td>
                        <td className={((stats.avg_pnl_per_trade || 0) >= 0) ? 'positive' : 'negative'}>
                          ₹{(stats.avg_pnl_per_trade || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategySelectionPanel;
