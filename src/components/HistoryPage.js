import React, { useCallback, useEffect, useState } from 'react';
import { captureEodSnapshot, fetchTradeHistory } from '../api';

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

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTradeHistory({ month: `${year}-${String(month).padStart(2, '0')}` });
      setMonthData(res.data || null);
    } catch {
      setMonthData(null);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayData(null);
  }, [loadMonth]);

  const loadDay = async (dateStr) => {
    setSelectedDate(dateStr);
    try {
      const res = await fetchTradeHistory({ date: dateStr });
      setDayData(res.data || null);
    } catch {
      setDayData(null);
    }
  };

  const weeks = getCalendarWeeks(year, month);
  const dayMap = {};
  (monthData?.days || []).forEach((d) => { dayMap[d.date] = d; });
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <section className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">History</h2>

      <div className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => (month === 1 ? (setYear((y) => y - 1), setMonth(12)) : setMonth((m) => m - 1))}>◀</button>
          <div style={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>{MONTH_NAMES[month - 1]} {year}</div>
          <button className="btn" onClick={() => (month === 12 ? (setYear((y) => y + 1), setMonth(1)) : setMonth((m) => m + 1))}>▶</button>
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
          <div><div className="card-title">Winning Days</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{monthData.winning_days || 0}</div></div>
          <div><div className="card-title">Losing Days</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{monthData.losing_days || 0}</div></div>
          <div><div className="card-title">Trades</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{monthData.month_trades || 0}</div></div>
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
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.trades} trades</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{info.source === 'eod_snapshot' ? 'EOD' : 'Trades'}</div>
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
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>Trades: <strong>{dayData.total_trades || 0}</strong></div>
            <div>Broker PnL: <strong style={{ color: (dayData.broker_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatPnl(dayData.broker_pnl)}</strong></div>
            <div>Trade PnL: <strong style={{ color: (dayData.month_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatPnl(dayData.month_pnl)}</strong></div>
          </div>
          {(dayData.broker_accounts || []).length > 0 && (
            <div>
              {(dayData.broker_accounts || []).map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {a.account_name}: {formatPnl(a.broker_pnl)} ({a.positions} positions)
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
