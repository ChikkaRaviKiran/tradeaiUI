import React from 'react';

function ActiveTrades({ trades, showEngine }) {
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
            <th>Time</th>
            {showEngine && <th>Engine</th>}
            <th>Symbol</th>
            <th>Strategy</th>
            <th>Type</th>
            <th>Entry</th>
            <th>Stoploss</th>
            <th>Target 1</th>
            <th>Target 2</th>
            <th>Score</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.trade_id}>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{trade.time || '—'}</td>
              {showEngine && (
                <td>
                  <span className={`tag ${trade._engine === 'v2' || trade.engine === 'v2' ? 'tag-v2' : 'tag-v1'}`}>
                    {trade._engine === 'v2' || trade.engine === 'v2' ? 'V2' : 'V1'}
                  </span>
                </td>
              )}
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
              <td>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                  background: trade.confidence >= 70 ? 'rgba(34,197,94,0.15)' : trade.confidence >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: trade.confidence >= 70 ? 'var(--accent-green)' : trade.confidence >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                }}>{trade.confidence?.toFixed(0)}%</span>
              </td>
              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={trade.reason || ''}>
                {trade.reason || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActiveTrades;
