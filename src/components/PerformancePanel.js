import React from 'react';

function PerformancePanel({ performance }) {
  const p = performance || {};

  const stats = [
    { label: 'Total Trades', value: p.total_trades || 0, color: 'var(--text-primary)' },
    { label: 'Win Rate', value: `${(p.win_rate || 0).toFixed(1)}%`, color: (p.win_rate || 0) >= 55 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Profit Factor', value: (p.profit_factor || 0).toFixed(2), color: (p.profit_factor || 0) >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Total PnL', value: `₹${(p.total_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, color: (p.total_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Max Drawdown', value: `₹${(p.max_drawdown || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, color: 'var(--accent-red)' },
    { label: 'Avg PnL/Trade', value: `₹${(p.avg_pnl_per_trade || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, color: (p.avg_pnl_per_trade || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Winners', value: p.winning_trades || 0, color: 'var(--accent-green)' },
    { label: 'Losers', value: p.losing_trades || 0, color: 'var(--accent-red)' },
  ];

  return (
    <div className="grid grid-4">
      {stats.map(({ label, value, color }) => (
        <div className="card" key={label}>
          <div className="card-title">{label}</div>
          <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default PerformancePanel;
