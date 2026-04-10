import React from 'react';

const INSTRUMENTS = ['NIFTY', 'SENSEX'];

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

function InstrumentCard({ snap, name }) {
  if (!snap) {
    return (
      <div className="card" style={{ opacity: 0.5 }}>
        <div className="card-title">{name}</div>
        <div className="stat-value" style={{ color: 'var(--text-secondary)', fontSize: '1.4rem' }}>Waiting...</div>
      </div>
    );
  }

  const ind = snap.indicators || {};
  const opt = snap.options_metrics || {};
  const price = snap.price || snap.nifty_price || 0;
  const prevClose = snap.prev_day_close;
  const changePct = prevClose ? ((price - prevClose) / prevClose * 100) : null;
  const isUp = changePct >= 0;

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header: Name + Price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 2 }}>
            {snap.instrument || name}
            {snap.is_expiry_day && (
              <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 600 }}>EXPIRY</span>
            )}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          {changePct != null && (
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>
                from {prevClose?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </span>
            </div>
          )}
        </div>
        {/* Regime badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4,
            color: regimeColors[snap.regime] || 'var(--text-primary)',
            background: snap.regime === 'trending' ? 'rgba(34,197,94,0.1)' :
                        snap.regime === 'high_volatility' ? 'rgba(239,68,68,0.1)' :
                        snap.regime === 'range_bound' ? 'rgba(245,158,11,0.1)' :
                        snap.regime === 'low_volatility' ? 'rgba(41,121,255,0.1)' : 'transparent',
          }}>
            {snap.regime?.replace('_', ' ').toUpperCase() || '—'}
          </div>
          {snap.htf_trend && snap.htf_trend !== 'neutral' && (
            <div style={{
              marginTop: 4, fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 600,
              background: snap.htf_trend === 'bullish' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: snap.htf_trend === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>5m {snap.htf_trend.toUpperCase()}</div>
          )}
        </div>
      </div>

      {/* Key Indicators Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <MiniStat label="RSI" value={ind.rsi?.toFixed(1)} color={ind.rsi > 70 ? 'var(--accent-red)' : ind.rsi < 30 ? 'var(--accent-green)' : null} />
        <MiniStat label="ADX" value={ind.adx?.toFixed(1)} color={ind.adx > 25 ? 'var(--accent-green)' : 'var(--text-secondary)'} />
        <MiniStat label="VWAP" value={snap.vwap?.toFixed(1)} color={price > snap.vwap ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <MiniStat label="ATR" value={ind.atr?.toFixed(1)} />
      </div>

      {/* EMAs + Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <MiniStat label="EMA 20" value={ind.ema20?.toFixed(1)}
          color={ind.ema20 != null ? (price > ind.ema20 ? 'var(--accent-green)' : 'var(--accent-red)') : null} />
        <MiniStat label="EMA 200" value={ind.ema200?.toFixed(1)}
          color={ind.ema200 != null ? (price > ind.ema200 ? 'var(--accent-green)' : 'var(--accent-red)') : null} />
        <MiniStat label="MACD" value={ind.macd_hist?.toFixed(2)}
          color={ind.macd_hist > 0 ? 'var(--accent-green)' : ind.macd_hist < 0 ? 'var(--accent-red)' : null} />
        <MiniStat label="Trend" value={ind.trend_strength != null ? `${ind.trend_strength}/3` : null}
          color={ind.trend_strength >= 2 ? 'var(--accent-green)' : ind.trend_strength <= 1 ? 'var(--accent-red)' : 'var(--accent-yellow)'} />
      </div>

      {/* Options: PCR, Max Pain, OI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        <MiniStat label="PCR" value={opt.pcr?.toFixed(2)}
          color={opt.pcr > 1.2 ? 'var(--accent-green)' : opt.pcr < 0.7 ? 'var(--accent-red)' : null} />
        <MiniStat label="Max Pain" value={opt.max_pain?.toLocaleString()} />
        <MiniStat label="CE OI" value={opt.call_oi_cluster?.toLocaleString()} color="var(--accent-red)" />
        <MiniStat label="PE OI" value={opt.put_oi_cluster?.toLocaleString()} color="var(--accent-green)" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ padding: '3px 0' }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value ?? '—'}</div>
    </div>
  );
}

function MarketOverview({ allSnapshots = {}, globalIndices = [] }) {
  const snapshotsMap = {};
  for (const sym of INSTRUMENTS) {
    if (allSnapshots[sym]) {
      snapshotsMap[sym] = allSnapshots[sym];
    }
  }

  // Global bias from any available snapshot (they share the same global bias)
  const anySnap = snapshotsMap.NIFTY || snapshotsMap.SENSEX;

  return (
    <>
      {/* Global Bias + Summary Bar */}
      {anySnap && (
        <div className="card" style={{ marginBottom: 12, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Global Bias</span>
            <span style={{
              fontSize: '1.1rem', fontWeight: 700,
              color: biasColors[anySnap.global_bias] || 'var(--text-primary)',
            }}>
              {anySnap.global_bias?.toUpperCase() || '—'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {globalIndices.filter(i => i.last_price > 0).length} global indices tracked
          </div>
        </div>
      )}

      {/* Instrument Cards Side by Side */}
      <div className="grid grid-2">
        {INSTRUMENTS.map((sym) => (
          <InstrumentCard key={sym} snap={snapshotsMap[sym]} name={sym} />
        ))}
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
