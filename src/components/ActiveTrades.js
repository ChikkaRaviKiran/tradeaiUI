import React from 'react';

function ActiveTrades({ trades }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
          No active trades
        </p>
      </div>
    );
  }

  return (
    <div className="card table-container">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Strategy</th>
            <th>Type</th>
            <th>Entry</th>
            <th>Stoploss</th>
            <th>Target 1</th>
            <th>Target 2</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.trade_id}>
              <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
              <td><span className="tag tag-strategy">{trade.strategy}</span></td>
              <td>
                <span className={`tag ${trade.option_type === 'CE' ? 'tag-ce' : 'tag-pe'}`}>
                  {trade.option_type}
                </span>
              </td>
              <td>{trade.entry_price?.toFixed(2)}</td>
              <td className="negative">{trade.stoploss?.toFixed(2)}</td>
              <td className="positive">{trade.target1?.toFixed(2)}</td>
              <td className="positive">{trade.target2?.toFixed(2)}</td>
              <td>{trade.confidence?.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActiveTrades;
