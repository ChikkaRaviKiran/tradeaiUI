import React, { useEffect, useRef, useState } from 'react';
import { fetchBrokerAccounts, fetchOiStrategyMarket, placeOiStrategy, previewOiStrategy } from '../api';

const STRATEGIES = [
  { value: 'BULL_CALL_SPREAD', label: 'Bull Call Spread', signal: 'Move UP toward resistance', color: 'var(--accent-green)', rule: 'Buy ATM CE; sell CE at resistance.' },
  { value: 'BEAR_PUT_SPREAD', label: 'Bear Put Spread', signal: 'Move DOWN toward support', color: 'var(--accent-red)', rule: 'Buy ATM PE; sell PE at support.' },
  { value: 'BULL_PUT_SPREAD', label: 'Bull Put Spread', signal: 'Support will HOLD', color: 'var(--accent-green)', rule: 'Sell PE at support; buy a lower PE for protection.' },
  { value: 'BEAR_CALL_SPREAD', label: 'Bear Call Spread', signal: 'Resistance will HOLD', color: 'var(--accent-red)', rule: 'Sell CE at resistance; buy a higher CE for protection.' },
  { value: 'MAXPAIN_ROLL', label: 'MaxPain Roll', signal: 'Price gravitates toward max pain', color: 'var(--accent-yellow)', rule: 'Sell CE and PE at max pain; loss is unlimited without hedges.' },
];

const money = (value) => {
  if (value == null || value === '' || typeof value === 'string') return value || '—';
  const number = Number(value);
  return Number.isFinite(number) ? `₹${number.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';
};
const price = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
};

function Metric({ label, value, tone }) {
  return <div className="card" style={{ padding: 14, borderTop: `3px solid ${tone || 'var(--border-light)'}` }}><div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{label}</div><div style={{ fontSize: 20, fontWeight: 700, marginTop: 5 }}>{value}</div></div>;
}

export default function OiStrategiesPage() {
  const [market, setMarket] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [strategy, setStrategy] = useState(STRATEGIES[0].value);
  const [lots, setLots] = useState(1);
  const [buyStrike, setBuyStrike] = useState('');
  const [sellStrike, setSellStrike] = useState('');
  const [accountId, setAccountId] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const lastDefaultStrategy = useRef(null);

  const loadMarket = async () => {
    setError('');
    const [marketResult, accountResult] = await Promise.allSettled([fetchOiStrategyMarket('NIFTY'), fetchBrokerAccounts()]);
    if (marketResult.status === 'fulfilled') {
      setMarket(marketResult.value.data);
    } else {
      setMarket(null);
      setError(marketResult.reason?.response?.data?.detail || 'OI data is not available yet. Start the market data service and try again.');
    }
    if (accountResult.status === 'fulfilled') {
      const list = accountResult.value.data?.accounts || [];
      setAccounts(list);
      if (!accountId) setAccountId(String(list.find((x) => x.is_primary)?.id || list[0]?.id || ''));
    }
  };

  const buildPreview = async () => {
    if (!market) return;
    try { setBusy(true); setError(''); const result = await previewOiStrategy({ strategy, symbol: market.symbol, lots: Number(lots), buy_strike: Number(buyStrike) || null, sell_strike: Number(sellStrike) || null, account_id: Number(accountId) || null }); setPreview(result.data); }
    catch (e) { setPreview(null); setError(e?.response?.data?.detail || 'Could not build strategy preview.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadMarket(); const timer = setInterval(loadMarket, 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { buildPreview(); }, [strategy, lots, buyStrike, sellStrike, market]);

  useEffect(() => {
    if (!market || (lastDefaultStrategy.current === strategy && buyStrike !== '' && sellStrike !== '')) return;
    const step = Number(market.strike_interval) || 50;
    const round = (value) => Math.round(Number(value) / step) * step;
    const defaults = {
      BULL_CALL_SPREAD: [round(market.spot), round(market.resistance)],
      BEAR_PUT_SPREAD: [round(market.spot), round(market.support)],
      BULL_PUT_SPREAD: [round(market.support), round(market.support - step * 4)],
      BEAR_CALL_SPREAD: [round(market.resistance), round(market.resistance + step * 4)],
      MAXPAIN_ROLL: [round(market.max_pain), round(market.max_pain)],
    }[strategy];
    if (defaults) {
      lastDefaultStrategy.current = strategy;
      setBuyStrike(String(defaults[0]));
      setSellStrike(String(defaults[1]));
    }
  }, [market, strategy, buyStrike, sellStrike]);

  const selected = STRATEGIES.find((x) => x.value === strategy) || STRATEGIES[0];
  const placeOrder = async () => {
    if (!preview || !accountId) { setError('Select a trade account before placing the order.'); return; }
    if (!window.confirm(`Place ${selected.label} in ${accounts.find((a) => String(a.id) === String(accountId))?.name || 'selected account'}?`)) return;
    try { setBusy(true); setError(''); const result = await placeOiStrategy({ strategy, symbol: market.symbol, lots: Number(lots), buy_strike: Number(buyStrike), sell_strike: Number(sellStrike), account_id: Number(accountId), confirm: true }); setMessage(result.data.complete ? 'All strategy legs were sent successfully.' : 'Order sequence was incomplete. Check each leg status below.'); setPreview({ ...preview, execution: result.data }); }
    catch (e) { setError(e?.response?.data?.detail || 'Order placement failed.'); }
    finally { setBusy(false); }
  };

  return <section className="section" style={{ marginTop: 4 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <div><h2 className="section-title" style={{ marginBottom: 4 }}>OI Level Strategies</h2><div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Choose the day&apos;s market belief. OI levels define the reference strikes; they are not guarantees.</div></div>
      <button className="btn" onClick={loadMarket} disabled={busy}>Refresh OI</button>
    </div>

    {error && <div className="card" style={{ marginTop: 12, borderLeft: '4px solid var(--accent-red)', color: 'var(--accent-red)' }}>{error}</div>}
    {message && <div className="card" style={{ marginTop: 12, borderLeft: '4px solid var(--accent-green)', color: 'var(--accent-green)' }}>{message}</div>}

    <div className="grid grid-4" style={{ marginTop: 14 }}>
      <Metric label="NIFTY SPOT" value={price(market?.spot)} tone="var(--accent-blue)" />
      <Metric label="OI SUPPORT" value={price(market?.support)} tone="var(--accent-green)" />
      <Metric label="MAX PAIN" value={price(market?.max_pain)} tone="var(--accent-yellow)" />
    </div>

    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-title">Select the market belief</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginTop: 12 }}>
        {STRATEGIES.map((item) => <button key={item.value} onClick={() => setStrategy(item.value)} style={{ textAlign: 'left', padding: 12, borderRadius: 6, cursor: 'pointer', color: 'var(--text-primary)', background: strategy === item.value ? 'var(--bg-primary)' : 'transparent', border: `1px solid ${strategy === item.value ? item.color : 'var(--border)'}` }}><div style={{ fontWeight: 700, color: item.color }}>{item.label}</div><div style={{ fontSize: 12, marginTop: 6 }}>{item.signal}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{item.rule}</div></button>)}
      </div>
    </div>

    <div className="grid grid-2" style={{ marginTop: 14 }}>
      <div className="card"><div className="card-title">Trade setup</div><div style={{ color: selected.color, fontWeight: 700, margin: '8px 0' }}>{selected.label}: {selected.signal}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.rule} Enter the strikes you want to test. The estimates update before you place the order.</div><div className="oi-form-grid" style={{ marginTop: 14 }}><label className="oi-field"><span>Lots</span><input type="number" min="1" value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value) || 1))} /></label><label className="oi-field"><span>{strategy === 'MAXPAIN_ROLL' ? 'Max pain strike' : 'Buy strike'}</span><input type="number" step={market?.strike_interval || 50} value={buyStrike} onChange={(e) => setBuyStrike(e.target.value)} /></label><label className="oi-field"><span>{strategy === 'MAXPAIN_ROLL' ? 'Confirm strike' : 'Sell strike'}</span><input type="number" step={market?.strike_interval || 50} value={sellStrike} onChange={(e) => setSellStrike(e.target.value)} /></label></div><label className="oi-field oi-account-field"><span>Trade account</span><select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Select account</option>{accounts.filter((a) => a.is_active).map((a) => <option key={a.id} value={a.id}>{a.name} ({String(a.broker).toUpperCase()}){a.paper_trading ? ' - PAPER' : ''}</option>)}</select></label></div>
      <div className="card"><div className="card-title">Why this strategy?</div><div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7 }}><div>Below support: <strong style={{ color: 'var(--accent-red)' }}>{money(preview?.metrics?.scenario_payoffs?.[0]?.pnl)}</strong> at {price(market?.support)}</div><div>At max pain: <strong>{money(preview?.metrics?.scenario_payoffs?.[1]?.pnl)}</strong> at {price(market?.max_pain)}</div><div>At resistance: <strong style={{ color: 'var(--accent-green)' }}>{money(preview?.metrics?.scenario_payoffs?.[2]?.pnl)}</strong> at {price(market?.resistance)}</div></div><div style={{ marginTop: 12, padding: 10, background: 'var(--bg-primary)', fontSize: 12, color: 'var(--text-secondary)' }}>Support is the highest put-OI cluster. Resistance is the highest call-OI cluster. Max pain is shown as context and does not override your selected strategy.</div></div>
    </div>

    <div className="grid grid-4" style={{ marginTop: 14 }}><Metric label="MAX PROFIT / LOT" value={money(preview?.metrics?.max_profit_per_lot) || 'Waiting for OI data'} tone="var(--accent-green)" /><Metric label="MAX LOSS / LOT" value={money(preview?.metrics?.max_loss_per_lot) || 'Waiting for OI data'} tone="var(--accent-red)" /><Metric label="MARGIN / LOT (DHAN)" value={money(preview?.metrics?.broker_margin_required_per_lot || preview?.metrics?.margin_required_per_lot) || 'Waiting for OI data'} tone="var(--accent-yellow)" /><Metric label="BREAKEVEN" value={preview?.metrics?.breakevens?.map(price).join(' / ') || 'Waiting for OI data'} tone="var(--accent-blue)" /></div>
    <div className="card" style={{ marginTop: 14 }}><div className="card-title">Order preview</div>{preview ? <><div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 12px' }}>Expiry {preview.expiry} | Lot size {preview.lot_size} | {preview.metrics.broker_margin_required ? `Dhan margin required ${money(preview.metrics.broker_margin_required)}` : `Dhan margin unavailable; payoff estimate ${money(preview.metrics.margin_required)}`}</div><table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}><thead><tr><th align="left">Action</th><th align="left">Contract</th><th align="right">Premium</th><th align="right">Quantity</th></tr></thead><tbody>{preview.legs.map((leg) => <tr key={`${leg.side}-${leg.symbol}`}><td style={{ color: leg.side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>{leg.side}</td><td>{leg.symbol}</td><td align="right">₹{price(leg.premium)}</td><td align="right">{leg.quantity}</td></tr>)}</tbody></table></> : <div className="oi-empty-state">Exact contracts, premiums, max profit, max loss, and margin will appear here after Dhan OI data is available.</div>}<button className="btn btn-start" style={{ marginTop: 14 }} onClick={placeOrder} disabled={busy || !accountId || !preview}>{busy ? 'Processing...' : preview ? 'Review and Place Order' : 'Place Order unavailable'}</button>{preview?.execution && <div style={{ marginTop: 12, fontSize: 12 }}>{preview.execution.results.map((item) => <div key={item.order_id || item.symbol}>{item.status}: {item.side} {item.symbol} {item.message}</div>)}</div>}</div>
  </section>;
}
