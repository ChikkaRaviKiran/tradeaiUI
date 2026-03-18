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
    insufficient_data: 'var(--text-secondary)',
  };

  const biasColors = {
    bullish: 'var(--accent-green)',
    bearish: 'var(--accent-red)',
    neutral: 'var(--accent-yellow)',
    unavailable: 'var(--text-secondary)',
  };

  const ind = snapshot.indicators || {};
  const opt = snapshot.options_metrics || {};
  const price = snapshot.nifty_price || snapshot.price || 0;

  return (
    <>
      {/* Row 1: Core metrics */}
      <div className="grid grid-4">
        <div className="card">
          <div className="card-title">
            NIFTY Price
            {snapshot.is_expiry_day && (
              <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 600 }}>EXPIRY DAY</span>
            )}
          </div>
          <div className="stat-value">{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-label">
            RSI: {ind.rsi?.toFixed(1) ?? '—'} | ADX: {ind.adx?.toFixed(1) ?? '—'}
          </div>
        </div>

        <div className="card">
          <div className="card-title">VWAP</div>
          <div className="stat-value">{snapshot.vwap?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—'}</div>
          <div className="stat-label">
            {snapshot.vwap == null ? (
              <span style={{ color: 'var(--text-secondary)' }}>No volume data</span>
            ) : price > snapshot.vwap ? (
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
            PCR: {opt.pcr?.toFixed(2) ?? '—'} | Max Pain: {opt.max_pain?.toLocaleString() ?? '—'}
            {snapshot.htf_trend && snapshot.htf_trend !== 'neutral' && (
              <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                background: snapshot.htf_trend === 'bullish' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: snapshot.htf_trend === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>5m {snapshot.htf_trend.toUpperCase()}</span>
            )}
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

      {/* Row 2: Technical Indicators + Prev Day Levels */}
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Technical Indicators</div>
          <div className="indicator-grid">
            <div className="ind-item">
              <span className="ind-label">EMA 9</span>
              <span className="ind-value">{ind.ema9?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="ind-item">
              <span className="ind-label">EMA 20</span>
              <span className="ind-value">{ind.ema20?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="ind-item">
              <span className="ind-label">EMA 50</span>
              <span className="ind-value">{ind.ema50?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="ind-item">
              <span className="ind-label">EMA 200</span>
              <span className="ind-value" style={{ color: ind.ema200 != null ? (price > ind.ema200 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-secondary)' }}>
                {ind.ema200?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">MACD</span>
              <span className="ind-value" style={{ color: ind.macd_hist > 0 ? 'var(--accent-green)' : ind.macd_hist < 0 ? 'var(--accent-red)' : undefined }}>
                {ind.macd?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">MACD Hist</span>
              <span className="ind-value" style={{ color: ind.macd_hist > 0 ? 'var(--accent-green)' : ind.macd_hist < 0 ? 'var(--accent-red)' : undefined }}>
                {ind.macd_hist?.toFixed(2) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">ATR</span>
              <span className="ind-value">{ind.atr?.toFixed(1) ?? '—'}</span>
            </div>
            <div className="ind-item">
              <span className="ind-label">Trend</span>
              <span className="ind-value" style={{ color: ind.trend_strength >= 2 ? 'var(--accent-green)' : ind.trend_strength <= 1 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                {ind.trend_strength != null ? `${ind.trend_strength}/3` : '—'}
              </span>
            </div>
          </div>
          {/* Bollinger Bands inline */}
          {ind.bollinger_upper != null && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Bollinger: <span style={{ color: 'var(--accent-red)' }}>{ind.bollinger_lower?.toFixed(0)}</span>
              {' — '}<span>{ind.bollinger_middle?.toFixed(0)}</span>
              {' — '}<span style={{ color: 'var(--accent-green)' }}>{ind.bollinger_upper?.toFixed(0)}</span>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Prev Day Levels & OI</div>
          <div className="indicator-grid">
            <div className="ind-item">
              <span className="ind-label">Prev High</span>
              <span className="ind-value" style={{ color: 'var(--accent-red)' }}>
                {snapshot.prev_day_high?.toLocaleString('en-IN', { maximumFractionDigits: 1 }) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">Prev Low</span>
              <span className="ind-value" style={{ color: 'var(--accent-green)' }}>
                {snapshot.prev_day_low?.toLocaleString('en-IN', { maximumFractionDigits: 1 }) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">Prev Close</span>
              <span className="ind-value">
                {snapshot.prev_day_close?.toLocaleString('en-IN', { maximumFractionDigits: 1 }) ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">Change</span>
              <span className="ind-value" style={{ color: snapshot.prev_day_close ? (price >= snapshot.prev_day_close ? 'var(--accent-green)' : 'var(--accent-red)') : undefined }}>
                {snapshot.prev_day_close ? `${((price - snapshot.prev_day_close) / snapshot.prev_day_close * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">CE OI Cluster</span>
              <span className="ind-value" style={{ color: 'var(--accent-red)' }}>
                {opt.call_oi_cluster?.toLocaleString() ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">PE OI Cluster</span>
              <span className="ind-value" style={{ color: 'var(--accent-green)' }}>
                {opt.put_oi_cluster?.toLocaleString() ?? '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">OI Change</span>
              <span className="ind-value" style={{ color: opt.oi_change > 0 ? 'var(--accent-green)' : opt.oi_change < 0 ? 'var(--accent-red)' : undefined }}>
                {opt.oi_change != null ? (opt.oi_change > 0 ? '+' : '') + opt.oi_change.toLocaleString() : '—'}
              </span>
            </div>
            <div className="ind-item">
              <span className="ind-label">ATM Volume</span>
              <span className="ind-value">
                {opt.atm_option_volume?.toLocaleString() ?? '—'}
              </span>
            </div>
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
