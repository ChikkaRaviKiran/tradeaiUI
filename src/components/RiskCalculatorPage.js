import React, { useEffect, useMemo, useState } from 'react';
import { fetchInstruments } from '../api';

// Fallback only until /api/instruments responds — broker is the source of truth for lot sizes.
const FALLBACK_INSTRUMENTS = [
  { symbol: 'NIFTY', display_name: 'NIFTY 50', lot_size: 65 },
  { symbol: 'SENSEX', display_name: 'BSE SENSEX', lot_size: 20 },
];

const SL_PRESETS = [10, 15, 20, 25, 30, 40, 50];

function RiskCalculatorPage() {
  const [instruments, setInstruments] = useState(FALLBACK_INSTRUMENTS);
  const [symbol, setSymbol] = useState('NIFTY');
  const [entryPrice, setEntryPrice] = useState('');
  const [slPct, setSlPct] = useState(20);
  const [lots, setLots] = useState(1);
  const [side, setSide] = useState('BUY');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchInstruments()
      .then((res) => {
        if (cancelled) return;
        const list = (res.data || []).filter((i) => i.is_index !== false && i.enabled !== false);
        if (list.length) {
          setInstruments(list);
          if (!list.some((i) => i.symbol === 'NIFTY')) setSymbol(list[0].symbol);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load live lot sizes — using defaults.');
      });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(
    () => instruments.find((i) => i.symbol === symbol) || instruments[0] || FALLBACK_INSTRUMENTS[0],
    [instruments, symbol],
  );

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const pct = parseFloat(slPct);
    const lotCount = parseInt(lots, 10);
    const lotSize = Number(selected?.lot_size) || 0;
    if (!Number.isFinite(entry) || entry <= 0) return null;
    if (!Number.isFinite(pct) || pct <= 0) return null;
    if (!Number.isFinite(lotCount) || lotCount <= 0 || !lotSize) return null;

    // A long is stopped out below entry, a short above it.
    const slPrice = side === 'BUY' ? entry * (1 - pct / 100) : entry * (1 + pct / 100);
    const pointsRisk = Math.abs(entry - slPrice);
    const qty = lotCount * lotSize;
    return {
      slPrice,
      pointsRisk,
      qty,
      lotSize,
      lossPerLot: pointsRisk * lotSize,
      totalLoss: pointsRisk * qty,
      turnover: entry * qty,
    };
  }, [entryPrice, slPct, lots, side, selected]);

  const money = (v) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 'var(--radius)',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };
  const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 };

  return (
    <section className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">Stop-Loss Calculator</h2>

      {error && (
        <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid var(--accent-yellow)' }}>
          <span style={{ color: 'var(--accent-yellow)', fontSize: 12 }}>{error}</span>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Inputs</div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="calc-index">Index</label>
            <select
              id="calc-index"
              style={inputStyle}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            >
              {instruments.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.display_name || i.symbol} (lot {i.lot_size})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="calc-entry">Entry price</label>
              <input
                id="calc-entry"
                style={inputStyle}
                type="number"
                min="0"
                step="0.05"
                placeholder="e.g. 150.25"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="calc-lots">Lots</label>
              <input
                id="calc-lots"
                style={inputStyle}
                type="number"
                min="1"
                step="1"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Position</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['BUY', 'SELL'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`tab-btn ${side === s ? 'active' : ''}`}
                  onClick={() => setSide(s)}
                >
                  {s === 'BUY' ? 'Long (Buy)' : 'Short (Sell)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="calc-sl">Stop loss %</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {SL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`tab-btn ${Number(slPct) === p ? 'active' : ''}`}
                  onClick={() => setSlPct(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
            <input
              id="calc-sl"
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={slPct}
              onChange={(e) => setSlPct(e.target.value)}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Result</div>

          {!result ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Enter an entry price, lots and stop-loss % to see the result.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Stop-loss price</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: 'var(--accent-yellow)' }}>
                  {result.slPrice.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {result.pointsRisk.toFixed(2)} points {side === 'BUY' ? 'below' : 'above'} entry
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Loss if SL hits</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: 'var(--accent-red)' }}>
                  -{money(result.totalLoss)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {money(result.lossPerLot)} per lot × {lots} lot{Number(lots) > 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Lot size</span><span>{result.lotSize}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Total quantity</span><span>{result.qty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Position value</span><span>{money(result.turnover)}</span>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                Excludes brokerage, taxes and slippage.
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default RiskCalculatorPage;
