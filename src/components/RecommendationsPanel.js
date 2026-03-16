import React, { useState } from 'react';
import { triggerEvaluation } from '../api';

function RecommendationsPanel({ recommendations }) {
  const [running, setRunning] = useState(false);
  const data = recommendations || {};
  const recs = data.recommendations || [];
  const evalDate = data.eval_date;
  const runTime = data.run_time_seconds;
  const totalSim = data.total_simulated_trades;

  const handleRunEval = async () => {
    setRunning(true);
    try {
      await triggerEvaluation();
    } catch {
      // ignore — will refresh on next poll
    }
    // Keep button disabled for a bit since eval runs in background
    setTimeout(() => setRunning(false), 10000);
  };

  const scoreColor = (score) => {
    if (score >= 70) return 'var(--accent-green)';
    if (score >= 45) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const pnlColor = (val) => (val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)');

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {evalDate && (
            <>
              Evaluated: {evalDate}
              {runTime != null && <> &middot; {runTime}s</>}
              {totalSim > 0 && <> &middot; {totalSim} simulated trades</>}
            </>
          )}
          {!evalDate && 'No evaluation available yet'}
        </div>
        <button
          className="btn"
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            padding: '6px 16px',
            fontSize: '0.8rem',
            opacity: running ? 0.5 : 1,
          }}
          disabled={running}
          onClick={handleRunEval}
        >
          {running ? 'Running...' : 'Run Evaluation'}
        </button>
      </div>

      {recs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          No recommendations yet. Click "Run Evaluation" to analyze strategies.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Strategy</th>
                <th>Instrument</th>
                <th>Score</th>
                <th>Win Rate</th>
                <th>PF</th>
                <th>Sharpe</th>
                <th>Avg PnL</th>
                <th>Total PnL</th>
                <th>Trades</th>
                <th>Regime</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => (
                <tr key={`${r.strategy}-${r.instrument}`}>
                  <td style={{ fontWeight: 700, color: r.rank <= 3 ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
                    {r.rank}
                  </td>
                  <td>
                    <span className="tag tag-strategy">{r.strategy}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.instrument}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      minWidth: 48,
                      textAlign: 'center',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      background: `${scoreColor(r.composite_score)}22`,
                      color: scoreColor(r.composite_score),
                    }}>
                      {r.composite_score}
                    </span>
                  </td>
                  <td style={{ color: r.win_rate >= 55 ? 'var(--accent-green)' : r.win_rate >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                    {r.win_rate}%
                  </td>
                  <td style={{ color: r.profit_factor >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {r.profit_factor}
                  </td>
                  <td>{r.sharpe_ratio}</td>
                  <td style={{ color: pnlColor(r.avg_pnl) }}>
                    ₹{r.avg_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ color: pnlColor(r.total_pnl), fontWeight: 600 }}>
                    ₹{r.total_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td>{r.total_trades}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {r.current_regime}
                    </span>
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

export default RecommendationsPanel;
