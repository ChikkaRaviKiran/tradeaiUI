import React, { useEffect, useState } from 'react';
import { fetchLevelZoneTrades } from '../api';

const STATUS_COLORS = {
  open: '#3b82f6',
  target_hit: '#10b981',
  sl_hit: '#ef4444',
  eod_close: '#94a3b8',
};

const STATUS_LABELS = {
  open: 'OPEN',
  target_hit: 'TARGET HIT',
  sl_hit: 'SL HIT',
  eod_close: 'EOD CLOSE',
};

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

export default function PaperTradesPanel() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const res = await fetchLevelZoneTrades();
        if (!cancelled) setTrades(res.data?.trades || []);
      } catch {
        if (!cancelled) setError('Failed to load paper trades.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const closed = trades.filter((t) => t.status !== 'open');
  const wins = closed.filter((t) => (t.pnl_points ?? 0) > 0).length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl_points || 0), 0);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h2 style={{ margin: 0 }}>Level Zone Paper Trades</h2>
      <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, maxWidth: 640 }}>
        Auto-logged breakout alerts sent via Telegram (see Weekly/Monthly S&amp;R panel above for the
        zones behind these). <strong>Paper trades only</strong> &mdash; nothing here is a real order.
      </p>

      {loading && <p style={{ color: '#94a3b8' }}>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && !error && (
        <>
          {closed.length > 0 && (
            <div style={{ fontSize: 13, margin: '10px 0', color: '#94a3b8' }}>
              Closed: {closed.length} &middot; Win rate: {((wins / closed.length) * 100).toFixed(0)}%
              &middot; Total PnL: <span style={{ color: totalPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} pts/lot
              </span>
            </div>
          )}

          {trades.length === 0 ? (
            <p style={{ color: '#94a3b8', marginTop: 12 }}>No paper trades logged yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px' }}>Time</th>
                    <th style={{ padding: '4px 8px' }}>Symbol</th>
                    <th style={{ padding: '4px 8px' }}>Leg</th>
                    <th style={{ padding: '4px 8px' }}>Zone</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Entry</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>SL</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Target</th>
                    <th style={{ padding: '4px 8px' }}>Status</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Exit</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id} style={{ borderTop: '1px solid #1e293b' }}>
                      <td style={{ padding: '4px 8px' }}>{fmtTime(t.entry_time)}</td>
                      <td style={{ padding: '4px 8px' }}>{t.symbol}</td>
                      <td style={{ padding: '4px 8px' }}>{Math.round(t.strike)} {t.direction}</td>
                      <td style={{ padding: '4px 8px' }}>{t.zone_price?.toFixed(2)} (x{t.zone_confidence})</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{t.entry_price?.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{t.sl_price?.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{t.target_price?.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', color: STATUS_COLORS[t.status] || '#94a3b8', fontWeight: 600 }}>
                        {STATUS_LABELS[t.status] || t.status}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{t.exit_price?.toFixed(2) ?? '—'}</td>
                      <td style={{
                        padding: '4px 8px', textAlign: 'right', fontWeight: 600,
                        color: (t.pnl_points ?? 0) >= 0 ? '#10b981' : '#ef4444',
                      }}
                      >
                        {t.pnl_points != null ? `${t.pnl_points >= 0 ? '+' : ''}${t.pnl_points.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
