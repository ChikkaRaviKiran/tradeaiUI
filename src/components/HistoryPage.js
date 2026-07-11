import React, { useCallback, useEffect, useState } from 'react';
import { captureEodSnapshot, fetchBrokerAccounts, fetchTradeHistory } from '../api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCalendarWeeks(year, month) {
  const last = new Date(year, month, 0);
  const weeks = [];
  let week = new Array(7).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month - 1, d);
    const dow = (dt.getDay() + 6) % 7;
    week[dow] = d;
    if (dow === 6 || d === last.getDate()) {
      weeks.push(week);
      week = new Array(7).fill(null);
    }
  }
  return weeks;
}

function formatPnl(v) {
  if (v == null || v === 0) return '—';
  const n = Number(v) || 0;
  return `${n >= 0 ? '+' : '-'}₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function HistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthData, setMonthData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapSaving, setSnapSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [filterAccount, setFilterAccount] = useState(0); // 0 = All

  // Load broker accounts once for the filter dropdown
  useEffect(() => {
    fetchBrokerAccounts()
      .then((r) => {
        if (r.data?.accounts) setAccounts(r.data.accounts);
      })
      .catch(() => {});
  }, []);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: `${year}-${String(month).padStart(2, '0')}` };
      if (filterAccount) params.account_id = filterAccount;
      const res = await fetchTradeHistory(params);
      setMonthData(res.data || null);
    } catch {
      setMonthData(null);
    }
    setLoading(false);
  }, [year, month, filterAccount]);

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayData(null);
  }, [loadMonth]);

  const loadDay = async (dateStr) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setDayData(null);
      return;
    }
    setSelectedDate(dateStr);
    try {
      const params = { date: dateStr };
      if (filterAccount) params.account_id = filterAccount;
      const res = await fetchTradeHistory(params);
      setDayData(res.data || null);
    } catch {
      setDayData(null);
    }
  };

  const weeks = getCalendarWeeks(year, month);
  const dayMap = {};
  (monthData?.days || []).forEach((d) => { dayMap[d.date] = d; });
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const winRate = monthData?.trading_days
    ? Math.round((monthData.winning_days / monthData.trading_days) * 100)
    : 0;

  return (
    <section className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">History</h2>

      <div className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => (month === 1 ? (setYear((y) => y - 1), setMonth(12)) : setMonth((m) => m - 1))}>◀</button>
          <div style={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>{MONTH_NAMES[month - 1]} {year}</div>
          <button className="btn" onClick={() => (month === 12 ? (setYear((y) => y + 1), setMonth(1)) : setMonth((m) => m + 1))}>▶</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Account</label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(Number(e.target.value))}
            style={{ padding: '6px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 4 }}
          >
            <option value={0}>All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.paper_trading ? '(Paper)' : '(Live)'}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-start"
          disabled={snapSaving}
          onClick={async () => {
            setSnapSaving(true);
            try { await captureEodSnapshot(); await loadMonth(); } catch {}
            setSnapSaving(false);
          }}
        >
          {snapSaving ? 'Saving...' : 'Capture EOD Snapshot'}
        </button>
      </div>

      {monthData && (
        <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div className="card-title">Month PnL</div><div className="stat-value" style={{ fontSize: '1.2rem', color: (monthData.month_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatPnl(monthData.month_pnl)}</div></div>
          <div><div className="card-title">Trading Days</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{monthData.trading_days || 0}</div></div>
          <div><div className="card-title">Winning Days</div><div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-green)' }}>{monthData.winning_days || 0}</div></div>
          <div><div className="card-title">Losing Days</div><div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }}>{monthData.losing_days || 0}</div></div>
          <div><div className="card-title">Total Trades</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{monthData.month_trades || 0}</div></div>
          <div><div className="card-title">Win Rate</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{winRate}%</div></div>
        </div>
      )}

      {monthData?.accounts && monthData.accounts.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Per-Account Summary</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {monthData.accounts.map((a) => (
              <div
                key={`${a.account_id || a.account_name}`}
                style={{
                  flex: '1 1 220px',
                  minWidth: 200,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-secondary, rgba(0,0,0,0.15))',
                  borderLeft: `3px solid ${(a.pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.account_name}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (a.pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {formatPnl(a.pnl)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {a.trading_days} trading day{a.trading_days !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>{DAY_LABELS.map((d) => <th key={d}>{d}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <td key={`${wi}-${di}`} />;
                    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                    const info = dayMap[dateStr];
                    const pnl = info?.broker_pnl != null ? info.broker_pnl : info?.pnl;
                    const hasTrade = !!info;
                    const acctCount = info?.accounts?.length || 0;
                    return (
                      <td
                        key={dateStr}
                        onClick={() => hasTrade && loadDay(dateStr)}
                        style={{ cursor: hasTrade ? 'pointer' : 'default', background: selectedDate === dateStr ? 'rgba(59,130,246,0.08)' : 'transparent' }}
                      >
                        <div style={{ fontWeight: 600 }}>{day}</div>
                        {hasTrade ? (
                          <>
                            <div style={{ color: (pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12 }}>{formatPnl(pnl)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.trades} trade{info.trades !== 1 ? 's' : ''}</div>
                            {info.source === 'eod_snapshot' && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>✓ EOD</div>
                            )}
                            {acctCount > 1 && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{acctCount} accts</div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedDate && dayData && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Day Detail — {selectedDate}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>Trades: <strong>{dayData.total_trades || 0}</strong></div>
            <div>Broker PnL: <strong style={{ color: (dayData.broker_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatPnl(dayData.broker_pnl)}</strong></div>
            <div>Trade PnL: <strong style={{ color: (dayData.month_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatPnl(dayData.month_pnl)}</strong></div>
          </div>
          {(dayData.broker_accounts || []).length > 0 ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Per-Account Broker P&amp;L</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(dayData.broker_accounts || []).map((a, i) => (
                  <div
                    key={`${a.account_id || a.account_name}-${i}`}
                    style={{
                      flex: '1 1 200px',
                      minWidth: 180,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-secondary, rgba(0,0,0,0.15))',
                      borderLeft: `3px solid ${(a.broker_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.account_name}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: (a.broker_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {formatPnl(a.broker_pnl)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {a.positions} position{a.positions !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No broker P&amp;L snapshot for this day.</div>
          )}
        </div>
      )}
    </section>
  );
}
