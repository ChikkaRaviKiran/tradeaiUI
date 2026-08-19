import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchStrategyInstances,
  createStrategyInstance,
  updateStrategyInstance,
  deleteStrategyInstance,
  toggleStrategyInstance,
  fetchBrokerAccounts,
} from '../api';

const STRATEGY_TYPES = [
  { value: 'ATM_STRADDLE', label: 'ATM Straddle' },
  { value: 'OTM_STRANGLE', label: 'OTM Strangle' },
];

const INDICES = ['NIFTY', 'BANKNIFTY', 'SENSEX'];
const DAYS = ['Daily', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SL_TYPES = ['none', 'premium_pct', 'spot', 'amount'];
const HEDGE_MODES = [
  { value: 'none', label: 'Off' },
  { value: 'premium', label: 'Premium Target' },
  { value: 'otm_points', label: 'OTM Points' },
];

const EMPTY = {
  id: null,
  strategy_type: 'ATM_STRADDLE',
  account_id: '',
  index: 'NIFTY',
  trading_day: 'Daily',
  entry_time: '09:20',
  exit_time: '15:15',
  lots: 1,
  strike_interval: 50,
  strike_mode: 'ATM',
  otm_strikes: 0,
  static_legs: false,
  adjustment_points: 1,
  rolling_points: 300,
  sl_type: 'none',
  sl_lower: 0,
  sl_upper: 0,
  sl_amount: 0,
  first_straddle_sl_pct: 100,
  reform_straddle_sl_pct: 60,
  hedge_mode: 'none',
  hedge_premium: 3,
  hedge_otm_points: 500,
  hedge_lots: 0,
  is_active: true,
  live_execution: false,
  display_name: '',
};

function TypeBadge({ type }) {
  const label = STRATEGY_TYPES.find((t) => t.value === type)?.label || type;
  const color = type === 'OTM_STRANGLE' ? '#a855f7' : '#3b82f6';
  return (
    <span style={{
      background: color, color: '#fff', padding: '3px 10px',
      borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

function StatusPill({ active }) {
  return (
    <span style={{
      color: active ? '#10b981' : '#94a3b8',
      fontWeight: 600, fontSize: 12,
    }}>
      {active ? '● Active' : '○ Paused'}
    </span>
  );
}

export default function StrategyInstancesPanel() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState('');
  const [filterIndex, setFilterIndex] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inst, acc] = await Promise.all([
        fetchStrategyInstances(),
        fetchBrokerAccounts(),
      ]);
      setRows(inst?.data?.instances || []);
      setAccounts(acc?.data?.accounts || []);
    } catch {
      setError('Failed to load strategy instances.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const editing = form.id != null;

  const startCreate = () => {
    setForm({
      ...EMPTY,
      account_id: accounts.find((a) => a.is_primary)?.id ?? (accounts[0]?.id ?? ''),
    });
    setShowForm(true);
    setMessage(''); setError('');
  };

  const startEdit = (r) => {
    setForm({
      id: r.id,
      strategy_type: r.strategy_type,
      account_id: r.account_id ?? '',
      index: r.index,
      trading_day: r.trading_day,
      entry_time: r.entry_time,
      exit_time: r.exit_time,
      lots: r.lots,
      strike_interval: r.strike_interval,
      strike_mode: r.strike_mode,
      otm_strikes: r.otm_strikes,
      static_legs: !!r.static_legs,
      adjustment_points: r.adjustment_points,
      rolling_points: r.rolling_points,
      sl_type: r.sl_type,
      sl_lower: r.sl_lower,
      sl_upper: r.sl_upper,
      sl_amount: r.sl_amount,
      first_straddle_sl_pct: r.first_straddle_sl_pct,
      reform_straddle_sl_pct: r.reform_straddle_sl_pct,
      hedge_mode: r.hedge_mode,
      hedge_premium: r.hedge_premium,
      hedge_otm_points: r.hedge_otm_points,
      hedge_lots: r.hedge_lots,
      is_active: !!r.is_active,
      live_execution: !!r.live_execution,
      display_name: r.display_name || '',
    });
    setShowForm(true); setMessage(''); setError('');
  };

  const cancel = () => { setShowForm(false); setForm(EMPTY); };

  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = {
        ...form,
        account_id: form.account_id === '' ? null : Number(form.account_id),
        lots: Number(form.lots),
        strike_interval: Number(form.strike_interval),
        otm_strikes: Number(form.otm_strikes),
        adjustment_points: Number(form.adjustment_points),
        rolling_points: Number(form.rolling_points),
        sl_lower: Number(form.sl_lower),
        sl_upper: Number(form.sl_upper),
        sl_amount: Number(form.sl_amount),
        first_straddle_sl_pct: Number(form.first_straddle_sl_pct),
        reform_straddle_sl_pct: Number(form.reform_straddle_sl_pct),
        hedge_premium: Number(form.hedge_premium),
        hedge_otm_points: Number(form.hedge_otm_points),
        hedge_lots: Number(form.hedge_lots),
      };
      if (editing) {
        await updateStrategyInstance(form.id, payload);
        setMessage('Strategy updated.');
      } else {
        await createStrategyInstance(payload);
        setMessage('Strategy created.');
      }
      setShowForm(false); setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed.');
    }
    setSaving(false);
  };

  const withRowBusy = async (id, key, fn) => {
    setRowBusy((s) => ({ ...s, [`${id}:${key}`]: true }));
    try { await fn(); } finally {
      setRowBusy((s) => { const c = { ...s }; delete c[`${id}:${key}`]; return c; });
    }
  };

  const doDelete = (r) => withRowBusy(r.id, 'del', async () => {
    if (!window.confirm(`Delete strategy #${r.id} (${r.strategy_type} / ${r.index})?`)) return;
    try {
      await deleteStrategyInstance(r.id);
      setMessage('Deleted.'); await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Delete failed.');
    }
  });

  const doToggle = (r) => withRowBusy(r.id, 'tog', async () => {
    try {
      await toggleStrategyInstance(r.id, !r.is_active);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Toggle failed.');
    }
  });

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterType && r.strategy_type !== filterType) return false;
    if (filterIndex && r.index !== filterIndex) return false;
    if (filterDay && r.trading_day !== filterDay) return false;
    return true;
  }), [rows, filterType, filterIndex, filterDay]);

  const accountLabel = (id) => {
    if (id == null) return <span style={{ color: 'var(--text-muted)' }}>Paper</span>;
    const a = accounts.find((x) => x.id === id);
    return a ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>{a.name}</span> : `#${id}`;
  };

  const isStrangle = form.strategy_type === 'OTM_STRANGLE';
  const usesOffset = ['STRANGLE', 'MAXPAIN'].includes(String(form.strike_mode || '').toUpperCase());

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>Strategy Instances</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Each row is one independently scheduled strategy on one broker account.
          </div>
        </div>
        <button className="btn btn-start" onClick={startCreate} disabled={accounts.length === 0}>
          + Add Strategy
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={filterSel}>
          <option value="">All Types</option>
          {STRATEGY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterIndex} onChange={(e) => setFilterIndex(e.target.value)} style={filterSel}>
          <option value="">All Indices</option>
          {INDICES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} style={filterSel}>
          <option value="">All Days</option>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {message && <div style={{ color: 'var(--accent-green)', fontSize: 12, marginBottom: 8 }}>{message}</div>}
      {error && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 12 }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: 12, fontStyle: 'italic' }}>
          Add at least one Broker Account above before creating strategy instances.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: 12, fontStyle: 'italic' }}>
          No strategy instances match the current filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>
                <th style={th}>Type</th>
                <th style={th}>Index</th>
                <th style={th}>Day</th>
                <th style={th}>Adj Pts</th>
                <th style={th}>Strike Int.</th>
                <th style={th}>Stop Loss</th>
                <th style={th}>Hedge</th>
                <th style={th}>Account</th>
                <th style={th}>Entry</th>
                <th style={th}>Exit</th>
                <th style={th}>Mode</th>
                <th style={th}>Lots</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}><TypeBadge type={r.strategy_type} /></td>
                  <td style={{ ...td, color: 'var(--text-primary)', fontWeight: 600 }}>{r.index}</td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{r.trading_day}</td>
                  <td style={td}>{r.adjustment_points}</td>
                  <td style={td}>{r.strike_interval}</td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{formatSL(r)}</td>
                  <td style={{ ...td, color: r.hedge_mode === 'none' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                    {r.hedge_mode === 'none' ? 'Off' : `${r.hedge_mode === 'premium' ? `₹${r.hedge_premium}` : `${r.hedge_otm_points}pts`}${r.hedge_lots ? ` × ${r.hedge_lots}` : ''}`}
                  </td>
                  <td style={td}>{accountLabel(r.account_id)}</td>
                  <td style={td}>{r.entry_time}</td>
                  <td style={td}>{r.exit_time}</td>
                  <td style={{ ...td, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{r.strike_mode}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.lots}</td>
                  <td style={td}><StatusPill active={r.is_active} /></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn" style={actionBtn} onClick={() => startEdit(r)}>Edit</button>
                      <button className="btn" style={actionBtn}
                        disabled={!!rowBusy[`${r.id}:tog`]}
                        onClick={() => doToggle(r)}>
                        {r.is_active ? 'Pause' : 'Start'}
                      </button>
                      <button className="btn"
                        style={{ ...actionBtn, background: 'var(--accent-red)', color: '#fff' }}
                        disabled={!!rowBusy[`${r.id}:del`]}
                        onClick={() => doDelete(r)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{
          marginTop: 16, padding: 14, border: '1px solid var(--border-light)',
          borderRadius: 8, background: 'var(--bg-secondary)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            {editing ? `Edit Strategy #${form.id}` : 'Add New Strategy'}
          </div>
          <div className="grid grid-4" style={{ gap: 10 }}>
            <label className="atl-field">
              <span>Strategy Type *</span>
              <select value={form.strategy_type}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm({
                    ...form,
                    strategy_type: t,
                    strike_mode: t === 'OTM_STRANGLE' ? 'STRANGLE' : 'ATM',
                    otm_strikes: t === 'OTM_STRANGLE' ? Math.max(1, Number(form.otm_strikes) || 1) : 0,
                  });
                }}>
                {STRATEGY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="atl-field">
              <span>Account *</span>
              <select value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                <option value="">— Paper —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.broker.toUpperCase()}){a.paper_trading ? ' • paper' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="atl-field">
              <span>Index *</span>
              <select value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })}>
                {INDICES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label className="atl-field">
              <span>Trading Day</span>
              <select value={form.trading_day} onChange={(e) => setForm({ ...form, trading_day: e.target.value })}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>

            <label className="atl-field">
              <span>Entry Time</span>
              <input type="time" value={form.entry_time} onChange={(e) => setForm({ ...form, entry_time: e.target.value })} />
            </label>
            <label className="atl-field">
              <span>Exit Time</span>
              <input type="time" value={form.exit_time} onChange={(e) => setForm({ ...form, exit_time: e.target.value })} />
            </label>
            <label className="atl-field">
              <span>Lots</span>
              <input type="number" min="1" value={form.lots} onChange={(e) => setForm({ ...form, lots: e.target.value })} />
            </label>
            <label className="atl-field">
              <span>Strike Interval</span>
              <input type="number" min="1" value={form.strike_interval} onChange={(e) => setForm({ ...form, strike_interval: e.target.value })} />
            </label>

            <label className="atl-field">
              <span>Strike Mode</span>
              <select
                value={form.strike_mode}
                onChange={(e) => setForm({ ...form, strike_mode: e.target.value })}
              >
                {isStrangle ? (
                  <>
                    <option value="STRANGLE">OTM Strangle (ATM anchor)</option>
                    <option value="MAXPAIN">OTM Strangle (MaxPain anchor)</option>
                  </>
                ) : (
                  <>
                    <option value="ATM">ATM Straddle</option>
                    <option value="MAXPAIN">MaxPain Anchor</option>
                  </>
                )}
              </select>
            </label>

            {usesOffset && (
              <label className="atl-field">
                <span>OTM Strikes (steps)</span>
                <input type="number" min="1" max="20" value={form.otm_strikes}
                  onChange={(e) => setForm({ ...form, otm_strikes: e.target.value })} />
              </label>
            )}

            <label className="atl-field">
              <span>Static Legs (hold till exit)</span>
              <select value={form.static_legs ? 'true' : 'false'}
                onChange={(e) => setForm({ ...form, static_legs: e.target.value === 'true' })}>
                <option value="false">No — allow adjust</option>
                <option value="true">Yes — hold</option>
              </select>
            </label>

            <label className="atl-field">
              <span>Adjustment Points</span>
              <input type="number" min="0" value={form.adjustment_points}
                onChange={(e) => setForm({ ...form, adjustment_points: e.target.value })} />
            </label>

            <label className="atl-field">
              <span>SL Type</span>
              <select value={form.sl_type} onChange={(e) => setForm({ ...form, sl_type: e.target.value })}>
                {SL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            {form.sl_type === 'spot' && (
              <>
                <label className="atl-field">
                  <span>Spot SL Lower</span>
                  <input type="number" min="0" value={form.sl_lower}
                    onChange={(e) => setForm({ ...form, sl_lower: e.target.value })} />
                </label>
                <label className="atl-field">
                  <span>Spot SL Upper</span>
                  <input type="number" min="0" value={form.sl_upper}
                    onChange={(e) => setForm({ ...form, sl_upper: e.target.value })} />
                </label>
              </>
            )}
            {form.sl_type === 'amount' && (
              <label className="atl-field">
                <span>Loss Amount ₹</span>
                <input type="number" min="0" value={form.sl_amount}
                  onChange={(e) => setForm({ ...form, sl_amount: e.target.value })} />
              </label>
            )}
            {form.sl_type === 'premium_pct' && (
              <>
                <label className="atl-field">
                  <span>First Straddle SL %</span>
                  <input type="number" min="1" value={form.first_straddle_sl_pct}
                    onChange={(e) => setForm({ ...form, first_straddle_sl_pct: e.target.value })} />
                </label>
                <label className="atl-field">
                  <span>Reform SL %</span>
                  <input type="number" min="1" value={form.reform_straddle_sl_pct}
                    onChange={(e) => setForm({ ...form, reform_straddle_sl_pct: e.target.value })} />
                </label>
              </>
            )}

            <label className="atl-field">
              <span>Hedge Mode</span>
              <select value={form.hedge_mode} onChange={(e) => setForm({ ...form, hedge_mode: e.target.value })}>
                {HEDGE_MODES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </label>
            {form.hedge_mode === 'premium' && (
              <label className="atl-field">
                <span>Hedge Premium ₹</span>
                <input type="number" min="0" value={form.hedge_premium}
                  onChange={(e) => setForm({ ...form, hedge_premium: e.target.value })} />
              </label>
            )}
            {form.hedge_mode === 'otm_points' && (
              <label className="atl-field">
                <span>Hedge OTM Points</span>
                <input type="number" min="0" value={form.hedge_otm_points}
                  onChange={(e) => setForm({ ...form, hedge_otm_points: e.target.value })} />
              </label>
            )}
            {form.hedge_mode !== 'none' && (
              <label className="atl-field">
                <span>Hedge Lots (0 = match)</span>
                <input type="number" min="0" value={form.hedge_lots}
                  onChange={(e) => setForm({ ...form, hedge_lots: e.target.value })} />
              </label>
            )}

            <label className="atl-field">
              <span>Execution</span>
              <select value={form.live_execution ? 'live' : 'paper'}
                onChange={(e) => setForm({ ...form, live_execution: e.target.value === 'live' })}>
                <option value="paper">Paper</option>
                <option value="live">Live orders</option>
              </select>
            </label>
            <label className="atl-field">
              <span>Active</span>
              <select value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="atl-field">
              <span>Display Name (optional)</span>
              <input value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-start" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : (editing ? 'Update Strategy' : 'Create Strategy')}
            </button>
            <button className="btn" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              disabled={saving} onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSL(r) {
  if (r.sl_type === 'none') return 'Off';
  if (r.sl_type === 'spot') return `Spot: ${r.sl_lower} / ${r.sl_upper}`;
  if (r.sl_type === 'amount') return `₹${r.sl_amount}`;
  if (r.sl_type === 'premium_pct') return `${r.first_straddle_sl_pct}% / ${r.reform_straddle_sl_pct}%`;
  return r.sl_type;
}

const th = { textAlign: 'left', padding: '8px 8px', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { padding: '10px 8px', verticalAlign: 'middle', whiteSpace: 'nowrap' };
const actionBtn = { padding: '4px 8px', fontSize: 11, borderRadius: 5 };
const filterSel = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border-light)',
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: 12,
};
