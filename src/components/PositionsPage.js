import React, { useCallback, useEffect, useState } from 'react';
import { exitPositions, fetchPositions, rearmPositions } from '../api';

const REFRESH_INTERVAL = 10000;

function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return '0.00';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPnl(v) {
  const n = Number(v) || 0;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PositionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [exiting, setExiting] = useState(false);
  const [rearming, setRearming] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount, setFilterAccount] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchPositions();
      if (res?.data?.status === 'ok') setData(res.data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const positions = (data?.positions || []).filter((p) => {
    if (filterStatus === 'open' && p.net_qty === 0) return false;
    if (filterStatus === 'closed' && p.net_qty !== 0) return false;
    if (filterAccount && p.account_name !== filterAccount) return false;
    return true;
  });

  const openPositions = positions.filter((p) => p.net_qty !== 0);
  const accountNames = [...new Set((data?.positions || []).map((p) => p.account_name))];
  const day = data?.broker_day_pnl || { realised: 0, unrealised: 0, total: 0 };

  const toggleSelect = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const handleExitSelected = async () => {
    const items = openPositions.filter((p) => selected[p.id]).map((p) => ({
      tradingsymbol: p.tradingsymbol,
      symboltoken: p.symboltoken,
      // Dhan-native identifiers. When present, the backend skips symbol
      // re-resolution (which fails for Dhan display symbols like
      // "NIFTY-Jul2026-24100-PE") and routes the exit directly to the
      // correct account's broker.
      security_id: p.symboltoken,
      account_id: p.account_id,
      exchange: p.exchange,
      product: p.product,
      net_qty: p.net_qty,
    }));
    if (!items.length) return;
    if (!window.confirm(`Exit ${items.length} selected position(s)?`)) return;
    setExiting(true);
    try {
      const res = await exitPositions({ positions: items });
      // Surface backend rejections so the user knows why exits didn't fire
      // (e.g. wrong account_id, unresolved securityId, broker rejection).
      const failed = (res?.data?.results || []).filter((r) => !r.ok);
      if (failed.length) {
        const msg = failed
          .map((r) => `${r.tradingsymbol} (${r.account_name || 'unknown'}): ${r.message || 'rejected'}`)
          .join('\n');
        window.alert(`Some exits failed:\n${msg}`);
      }
      setSelected({});
      await load();
    } catch (e) {
      window.alert(`Exit request failed: ${e?.response?.data?.detail || e?.message || 'unknown error'}`);
    }
    setExiting(false);
  };

  if (loading && !data) {
    return <div className="card"><p style={{ color: 'var(--text-secondary)' }}>Loading positions...</p></div>;
  }

  return (
    <div className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">Positions</h2>

      <div className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div className="card-title">Day PnL</div><div className="stat-value" style={{ fontSize: '1.2rem', color: (day.total || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtPnl(day.total)}</div></div>
          <div><div className="card-title">Realised</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmtPnl(day.realised)}</div></div>
          <div><div className="card-title">Unrealised</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmtPnl(day.unrealised)}</div></div>
          <div><div className="card-title">Open</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{openPositions.length}</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Positions</option>
          <option value="open">Open Only</option>
          <option value="closed">Closed Only</option>
        </select>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
          <option value="">All Accounts</option>
          {accountNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn" onClick={() => {
          const allSelected = openPositions.length > 0 && openPositions.every((p) => selected[p.id]);
          const next = { ...selected };
          openPositions.forEach((p) => { next[p.id] = !allSelected; });
          setSelected(next);
        }}>
          Select All
        </button>
        <button className="btn btn-stop" disabled={exiting} onClick={handleExitSelected}>
          {exiting ? 'Exiting...' : 'Exit Selected'}
        </button>
        <button
          className="btn"
          disabled={rearming}
          onClick={async () => {
            if (!window.confirm('Allow strategies to place entries again today?')) return;
            setRearming(true);
            try {
              await rearmPositions();
            } catch {
              // ignore
            }
            setRearming(false);
          }}
        >
          {rearming ? 'Re-arming...' : 'Allow Re-entry Today'}
        </button>
      </div>

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Symbol</th>
              <th>Product</th>
              <th>Buy Qty</th>
              <th>Buy Avg</th>
              <th>Sell Qty</th>
              <th>Sell Avg</th>
              <th>Net Qty</th>
              <th>LTP</th>
              <th>PnL</th>
              <th>Realised</th>
              <th>Unrealised</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} style={{ opacity: p.net_qty === 0 ? 0.6 : 1 }}>
                <td>{p.net_qty !== 0 && <input type="checkbox" checked={!!selected[p.id]} onChange={() => toggleSelect(p.id)} />}</td>
                <td style={{ fontWeight: 600 }}>{p.tradingsymbol}</td>
                <td>{p.product}</td>
                <td>{p.buy_qty || '-'}</td>
                <td>{p.buy_avg ? fmt(p.buy_avg) : '-'}</td>
                <td>{p.sell_qty || '-'}</td>
                <td>{p.sell_avg ? fmt(p.sell_avg) : '-'}</td>
                <td style={{ color: p.net_qty < 0 ? 'var(--accent-red)' : (p.net_qty > 0 ? 'var(--accent-green)' : 'var(--text-muted)') }}>{p.net_qty}</td>
                <td>{fmt(p.ltp)}</td>
                <td style={{ color: (p.pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtPnl(p.pnl)}</td>
                <td>{fmtPnl(p.realised)}</td>
                <td>{fmtPnl(p.unrealised)}</td>
                <td>{p.account_name || 'Primary'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
