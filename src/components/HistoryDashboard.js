import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCalendarData, fetchDayData } from '../api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function HistoryDashboard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('calendar'); // calendar | day

  // Load calendar data for the selected month
  const loadCalendar = useCallback(async () => {
    try {
      const res = await fetchCalendarData(year, month);
      setCalendarDays(res.data);
    } catch {
      setCalendarDays([]);
    }
  }, [year, month]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Load full day data when a date is selected
  const loadDayData = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await fetchDayData(date);
      setDayData(res.data);
    } catch {
      setDayData(null);
    }
    setLoading(false);
  }, []);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setView('day');
    loadDayData(date);
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
    handleDateClick(t.toISOString().split('T')[0]);
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>← Live Dashboard</Link>
          <h1>History</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} onClick={() => { setView('calendar'); setSelectedDate(null); setDayData(null); }}>
            Calendar
          </button>
          <button className="btn btn-start" onClick={goToToday}>Today</button>
        </div>
      </header>

      {view === 'calendar' && (
        <CalendarView
          year={year} month={month} days={calendarDays}
          onPrev={prevMonth} onNext={nextMonth}
          onDateClick={handleDateClick}
        />
      )}

      {view === 'day' && (
        <DayView
          date={selectedDate} data={dayData} loading={loading}
          onBack={() => { setView('calendar'); setDayData(null); }}
          onPrevDay={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            const ds = d.toISOString().split('T')[0];
            setSelectedDate(ds);
            loadDayData(ds);
          }}
          onNextDay={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            const ds = d.toISOString().split('T')[0];
            setSelectedDate(ds);
            loadDayData(ds);
          }}
        />
      )}
    </div>
  );
}

/* ─── Calendar View ─────────────────────────────────────────────────── */
function CalendarView({ year, month, days, onPrev, onNext, onDateClick }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayMap = {};
  days.forEach(d => { dayMap[d.date] = d; });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, date: dateStr, data: dayMap[dateStr] || null });
  }

  return (
    <div>
      {/* Month navigator */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, margin: '20px 0' }}>
        <button className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '8px 16px' }} onClick={onPrev}>◀</button>
        <h2 style={{ minWidth: 200, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</h2>
        <button className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '8px 16px' }} onClick={onNext}>▶</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, padding: 8 }}>
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;
          const hasData = !!cell.data;
          const isPositive = hasData && cell.data.change >= 0;
          const isToday = cell.date === new Date().toISOString().split('T')[0];

          return (
            <div
              key={cell.date}
              onClick={() => handleClick(cell, onDateClick)}
              style={{
                background: hasData ? 'var(--bg-card)' : 'var(--bg-secondary)',
                border: isToday ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                borderRadius: 8,
                padding: 10,
                minHeight: 80,
                cursor: hasData ? 'pointer' : 'default',
                opacity: hasData ? 1 : 0.4,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { if (hasData) e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                {cell.day}
              </div>
              {hasData && (
                <>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {cell.data.close?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {isPositive ? '+' : ''}{cell.data.change_pct?.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {cell.data.snapshots} cycles
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function handleClick(cell, onDateClick) {
  onDateClick(cell.date);
}

/* ─── Day Detail View ───────────────────────────────────────────────── */
function DayView({ date, data, loading, onBack, onPrevDay, onNextDay }) {
  if (loading) {
    return <div className="loading">Loading data for {date}...</div>;
  }

  const formatDate = (d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const summary = data?.summary || {};
  const snapshots = data?.snapshots || [];
  const trades = data?.trades || [];
  const alerts = data?.alerts || [];
  const perf = data?.performance || {};

  return (
    <div>
      {/* Day navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
        <button className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} onClick={onPrevDay}>◀ Prev Day</button>
        <div style={{ textAlign: 'center' }}>
          <h2>{formatDate(date)}</h2>
          {summary.has_data && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {summary.source === 'live' ? '🟢 Live data' : `${summary.total_snapshots} snapshots`} · {summary.first_time} – {summary.last_time}
            </span>
          )}
        </div>
        <button className="btn" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} onClick={onNextDay}>Next Day ▶</button>
      </div>

      {!summary.has_data && !trades.length && !alerts.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No data recorded for this date</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 8 }}>The system may not have been running, or it was a non-trading day</p>
        </div>
      ) : (
        <>
          {/* Day Summary Cards */}
          {summary.has_data && <DaySummaryCards summary={summary} />}

          {/* Performance */}
          <PerformanceSection perf={perf} trades={trades} />

          {/* Price Chart (table of snapshots) */}
          {snapshots.length > 0 && <SnapshotTimeline snapshots={snapshots} />}

          {/* Trades */}
          <TradesSection trades={trades} />

          {/* Alerts */}
          <AlertsSection alerts={alerts} />
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function DaySummaryCards({ summary }) {
  const instrumentColors = { NIFTY: '#6366f1', BANKNIFTY: '#f59e0b', FINNIFTY: '#22d3ee' };
  const instruments = summary.instruments || {};
  const instNames = Object.keys(instruments).sort();

  // If we have per-instrument data, show it
  if (instNames.length > 0) {
    return (
      <section className="section">
        <h2 className="section-title">Day Summary</h2>
        <div className="grid grid-3">
          {instNames.map(inst => {
            const d = instruments[inst];
            const change = d.close_price - d.open_price;
            const changePct = d.open_price ? ((change / d.open_price) * 100) : 0;
            const isUp = change >= 0;
            return (
              <div className="card" key={inst} style={{ padding: 14 }}>
                <div className="card-title" style={{ marginBottom: 8, color: instrumentColors[inst] || 'var(--text-secondary)' }}>{inst}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Open</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.open_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Close</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>{d.close_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>High</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-green)' }}>{d.high?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Low</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-red)' }}>{d.low?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Change</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {isUp ? '+' : ''}{changePct.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Snapshots</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.snapshots}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg RSI</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.avg_rsi}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PCR</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.last_pcr?.toFixed(2) ?? '—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Fallback: old single-instrument summary
  const change = summary.close_price - summary.open_price;
  const changePct = summary.open_price ? ((change / summary.open_price) * 100) : 0;
  const isUp = change >= 0;

  const cards = [
    { label: 'Open', value: summary.open_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
    { label: 'Close', value: summary.close_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 }), color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'High', value: summary.high?.toLocaleString('en-IN', { maximumFractionDigits: 2 }), color: 'var(--accent-green)' },
    { label: 'Low', value: summary.low?.toLocaleString('en-IN', { maximumFractionDigits: 2 }), color: 'var(--accent-red)' },
    { label: 'Change', value: `${isUp ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Avg RSI', value: summary.avg_rsi },
    { label: 'Avg ADX', value: summary.avg_adx },
    { label: 'PCR', value: summary.last_pcr?.toFixed(2) },
  ];

  return (
    <section className="section">
      <h2 className="section-title">Day Summary</h2>
      <div className="grid grid-4">
        {cards.map(({ label, value, color }) => (
          <div className="card" key={label}>
            <div className="card-title">{label}</div>
            <div className="stat-value" style={{ color: color || 'var(--text-primary)', fontSize: '1.4rem' }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PerformanceSection({ perf, trades }) {
  const stats = [
    { label: 'Total Trades', value: perf.total_trades || 0 },
    { label: 'Win Rate', value: `${(perf.win_rate || 0).toFixed(1)}%`, color: (perf.win_rate || 0) >= 55 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Total PnL', value: `₹${(perf.total_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, color: (perf.total_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Profit Factor', value: (perf.profit_factor || 0).toFixed(2), color: (perf.profit_factor || 0) >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' },
  ];

  return (
    <section className="section">
      <h2 className="section-title">Performance</h2>
      <div className="grid grid-4">
        {stats.map(({ label, value, color }) => (
          <div className="card" key={label}>
            <div className="card-title">{label}</div>
            <div className="stat-value" style={{ color: color || 'var(--text-primary)', fontSize: '1.4rem' }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SnapshotTimeline({ snapshots }) {
  const [instrumentFilter, setInstrumentFilter] = React.useState('ALL');

  // Discover unique instruments in the data
  const instruments = React.useMemo(() => {
    const set = new Set(snapshots.map(s => s.instrument || 'NIFTY'));
    return ['ALL', ...Array.from(set).sort()];
  }, [snapshots]);

  // Filter snapshots by selected instrument
  const filteredSnapshots = React.useMemo(() => {
    if (instrumentFilter === 'ALL') return snapshots;
    return snapshots.filter(s => (s.instrument || 'NIFTY') === instrumentFilter);
  }, [snapshots, instrumentFilter]);

  // Show every Nth snapshot to keep the table manageable
  const step = filteredSnapshots.length > 60 ? Math.ceil(filteredSnapshots.length / 60) : 1;
  const visible = filteredSnapshots.filter((_, i) => i % step === 0 || i === filteredSnapshots.length - 1);

  const instrumentColors = { NIFTY: '#6366f1', BANKNIFTY: '#f59e0b', FINNIFTY: '#22d3ee' };

  return (
    <section className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Market Timeline ({filteredSnapshots.length} snapshots)</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {instruments.map(inst => (
            <button key={inst} onClick={() => setInstrumentFilter(inst)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
                background: instrumentFilter === inst
                  ? (inst === 'ALL' ? 'var(--accent-blue)' : instrumentColors[inst] || 'var(--accent-blue)')
                  : 'var(--bg-secondary)',
                color: instrumentFilter === inst ? '#fff' : 'var(--text-secondary)',
                opacity: instrumentFilter === inst ? 1 : 0.7,
              }}>
              {inst}
            </button>
          ))}
        </div>
      </div>
      <div className="card table-container" style={{ maxHeight: 400, overflowY: 'auto', marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              {instrumentFilter === 'ALL' && <th>Instrument</th>}
              <th>Price</th>
              <th>RSI</th>
              <th>ADX</th>
              <th>MACD</th>
              <th>EMA9</th>
              <th>EMA20</th>
              <th>Regime</th>
              <th>5m Trend</th>
              <th>PCR</th>
              <th>Bias</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s, i) => {
              const regimeColor = {
                trending: 'var(--accent-green)',
                range_bound: 'var(--accent-yellow)',
                high_volatility: 'var(--accent-red)',
                low_volatility: 'var(--accent-blue)',
                insufficient_data: 'var(--text-secondary)',
              }[s.regime] || 'var(--text-primary)';

              const inst = s.instrument || 'NIFTY';
              const instColor = instrumentColors[inst] || 'var(--text-primary)';

              return (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.time}</td>
                  {instrumentFilter === 'ALL' && (
                    <td style={{ fontWeight: 600, fontSize: '0.75rem', color: instColor }}>{inst}</td>
                  )}
                  <td style={{ fontWeight: 600 }}>{(s.price || s.nifty_price)?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td>{s.rsi?.toFixed(1) ?? '—'}</td>
                  <td>{s.adx?.toFixed(1) ?? '—'}</td>
                  <td>{s.macd?.toFixed(2) ?? '—'}</td>
                  <td>{s.ema9?.toFixed(1) ?? '—'}</td>
                  <td>{s.ema20?.toFixed(1) ?? '—'}</td>
                  <td style={{ color: regimeColor, fontSize: '0.75rem', fontWeight: 600 }}>
                    {s.regime?.replace('_', ' ').toUpperCase()}
                  </td>
                  <td style={{
                    color: s.htf_trend === 'bullish' ? 'var(--accent-green)' : s.htf_trend === 'bearish' ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {s.htf_trend ? s.htf_trend.toUpperCase() : '—'}
                  </td>
                  <td>{s.pcr?.toFixed(2) ?? '—'}</td>
                  <td style={{
                    color: s.global_bias === 'bullish' ? 'var(--accent-green)' : s.global_bias === 'bearish' ? 'var(--accent-red)' : s.global_bias === 'unavailable' ? 'var(--text-secondary)' : 'var(--accent-yellow)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {s.global_bias?.toUpperCase()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TradesSection({ trades }) {
  return (
    <section className="section">
      <h2 className="section-title">Trades ({trades.length})</h2>
      {trades.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
          No trades executed on this day. Conditions may not have met the scoring threshold.
        </div>
      ) : (
      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Strategy</th>
              <th>Type</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>SL</th>
              <th>T1</th>
              <th>PnL</th>
              <th>Exit Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const isWin = (t.pnl || 0) > 0;
              return (
                <tr key={t.trade_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.time}{t.exit_time ? ` → ${t.exit_time}` : ''}</td>
                  <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                  <td><span className="tag tag-strategy">{t.strategy}</span></td>
                  <td><span className={`tag ${t.option_type === 'CE' ? 'tag-ce' : 'tag-pe'}`}>{t.option_type}</span></td>
                  <td>{t.entry_price?.toFixed(2)}</td>
                  <td>{t.exit_price?.toFixed(2) || '—'}</td>
                  <td>{t.stoploss?.toFixed(2)}</td>
                  <td>{t.target1?.toFixed(2)}</td>
                  <td className={isWin ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                    {t.pnl != null ? `${isWin ? '+' : ''}${t.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: t.reason === 'failed_breakout' ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>
                    {t.reason || '—'}
                  </td>
                  <td><span className={`tag ${t.status === 'closed' ? (isWin ? 'tag-ce' : 'tag-pe') : 'tag-strategy'}`}>{t.status?.toUpperCase()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function AlertsSection({ alerts }) {
  const typeConfig = {
    signal: { icon: '🔔', color: 'var(--accent-blue)' },
    exit: { icon: '📤', color: 'var(--accent-yellow)' },
    report: { icon: '📊', color: 'var(--accent-blue)' },
    info: { icon: 'ℹ️', color: 'var(--text-secondary)' },
  };

  return (
    <section className="section">
      <h2 className="section-title">Alerts ({alerts.length})</h2>
      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
          No alerts recorded for this day.
        </div>
      ) : (
      <div className="card" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {alerts.map((a) => {
          const cfg = typeConfig[a.alert_type] || typeConfig.info;
          return (
            <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <div style={{ fontSize: '1.2rem' }}>{cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.title}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <pre style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.5 }}>
                  {a.message}
                </pre>
                {a.strategy && <span className="tag tag-strategy" style={{ fontSize: '0.65rem', marginTop: 4 }}>{a.strategy}</span>}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}

export default HistoryDashboard;
