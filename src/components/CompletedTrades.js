import React from 'react';

function CompletedTrades({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
          No completed trades today
        </p>
      </div>
    );
  }

  return (
    <div className="card table-container">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Symbol</th>
            <th>Strategy</th>
            <th>Type</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>PnL</th>
            <th>Exit Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
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
                <td>{trade.entry_price?.toFixed(2)}</td>
                <td>{trade.exit_price?.toFixed(2)}</td>
                <td className={isWin ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                  {isWin ? '+' : ''}{trade.pnl?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {trade.exit_type || trade.reason || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CompletedTrades;
