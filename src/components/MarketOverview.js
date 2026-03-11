import React from 'react';

function MarketOverview({ snapshot, globalIndices = [] }) {
  if (!snapshot) {
    return (
      <div className="grid grid-4">
        {['NIFTY Price', 'VWAP', 'Market Regime', 'Global Bias'].map((label) => (
          <div className="card" key={label}>
            <div className="card-title">{label}</div>
            <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>—</div>
          </div>
        ))}
      </div>
    );
  }

  const regimeColors = {
    trending: 'var(--accent-green)',
    range_bound: 'var(--accent-yellow)',
    high_volatility: 'var(--accent-red)',
    low_volatility: 'var(--accent-blue)',
  };

  const biasColors = {
    bullish: 'var(--accent-green)',
    bearish: 'var(--accent-red)',
    neutral: 'var(--accent-yellow)',
  };

  return (
    <>
      <div className="grid grid-4">
        <div className="card">
          <div className="card-title">NIFTY Price</div>
          <div className="stat-value">{snapshot.nifty_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-label">
            RSI: {snapshot.indicators?.rsi?.toFixed(1)} | ADX: {snapshot.indicators?.adx?.toFixed(1)}
          </div>
        </div>

        <div className="card">
          <div className="card-title">VWAP</div>
          <div className="stat-value">{snapshot.vwap?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-label">
            {snapshot.nifty_price > snapshot.vwap ? (
              <span className="positive">Price above VWAP</span>
            ) : (
              <span className="negative">Price below VWAP</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Market Regime</div>
          <div className="stat-value" style={{ color: regimeColors[snapshot.regime] || 'var(--text-primary)', fontSize: '1.3rem' }}>
            {snapshot.regime?.replace('_', ' ').toUpperCase()}
          </div>
          <div className="stat-label">
            PCR: {snapshot.options_metrics?.pcr?.toFixed(2)} | Max Pain: {snapshot.options_metrics?.max_pain?.toLocaleString()}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Global Bias</div>
          <div className="stat-value" style={{ color: biasColors[snapshot.global_bias] || 'var(--text-primary)', fontSize: '1.3rem' }}>
            {snapshot.global_bias?.toUpperCase()}
          </div>
          <div className="stat-label">
            {globalIndices.filter(i => i.last_price > 0).length} indices tracked
          </div>
        </div>
      </div>

      {/* Global Indices Detail */}
      {globalIndices.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Global Markets</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {globalIndices.map((idx) => {
              const isUp = idx.change_pct >= 0;
              const isVix = idx.symbol.includes('VIX');
              const color = idx.last_price === 0
                ? 'var(--text-secondary)'
                : isVix
                  ? (idx.last_price > 25 ? 'var(--accent-red)' : 'var(--accent-green)')
                  : (isUp ? 'var(--accent-green)' : 'var(--accent-red)');
              return (
                <div key={idx.symbol} style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: 'var(--bg-primary)', minWidth: 120, textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                    {idx.symbol}
                  </div>
                  {idx.last_price > 0 ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {idx.last_price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ color, fontWeight: 600, fontSize: '0.8rem' }}>
                        {isUp ? '+' : ''}{idx.change_pct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>N/A</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default MarketOverview;
