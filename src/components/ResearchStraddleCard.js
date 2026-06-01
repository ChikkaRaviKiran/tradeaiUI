import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAtmResearchDefaults,
  fetchAtmResearchRuntime,
  fetchAtmResearchSettings,
  forceCloseAtmResearch,
  resetAtmResearch,
  updateAtmResearchSettings,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const INDICES = ['NIFTY', 'SENSEX'];
const STRATS = [
  { v: 'straddle',   label: 'Straddle (ATM)' },
  { v: 'strangle_1', label: 'Strangle ±1 step' },
  { v: 'strangle_2', label: 'Strangle ±2 step' },
];
const TRIGGERS = [
  { v: 'T0', label: 'T0 – Fixed time' },
  { v: 'T1', label: 'T1 – IV Crush (premium drop)' },
  { v: 'T2', label: 'T2 – VWAP Align + Quiet BB' },
  { v: 'T3', label: 'T3 – RSI Revert (near 50)' },
  { v: 'T4', label: 'T4 – BB Squeeze' },
  { v: 'T5', label: 'T5 – EMA Cross Squeeze' },
];
const MODES = [
  { v: 'single_time',      label: 'Single index • Fixed time' },
  { v: 'single_indicator', label: 'Single index • Indicator-gated' },
  { v: 'multi_time',       label: 'Multi index • Fixed time' },
  { v: 'multi_indicator',  label: 'Multi index • Indicator-gated  (recommended)' },
];

const REFRESH_MS = 5000;
const ACCOUNTS = ['Primary', 'Paper', 'Live (Kite)', 'Live (Angel)', 'Live (Dhan)'];

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function ScheduleRow({ day, cells, onChange, indicatorAllowed, multiAllowed }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{day}</td>
      {INDICES.map((idx) => {
        const cell = cells[idx] || {};
        const disabled = !multiAllowed && idx === 'SENSEX'; // will be overridden by mode-driven primary in single modes
        return (
          <td key={idx} style={{ opacity: disabled ? 0.5 : 1 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={!!cell.enabled}
                  disabled={disabled}
                  onChange={(e) => onChange(day, idx, { ...cell, enabled: e.target.checked })}
                />
                On
              </label>
              <select
                value={cell.strat || 'straddle'}
                disabled={disabled || !cell.enabled}
                onChange={(e) => onChange(day, idx, { ...cell, strat: e.target.value })}
              >
                {STRATS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
              <select
                value={cell.entry || 'T0'}
                disabled={disabled || !cell.enabled}
                onChange={(e) => onChange(day, idx, { ...cell, entry: e.target.value })}
              >
                {TRIGGERS.filter((t) => indicatorAllowed || t.v === 'T0').map((t) => (
                  <option key={t.v} value={t.v}>{t.label}</option>
                ))}
              </select>
              <input
                type="time"
                value={cell.entry_time || '09:20'}
                disabled={disabled || !cell.enabled}
                onChange={(e) => onChange(day, idx, { ...cell, entry_time: e.target.value })}
                style={{ width: 84 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
              <input
                type="time"
                value={cell.exit_time || '15:15'}
                disabled={disabled || !cell.enabled}
                onChange={(e) => onChange(day, idx, { ...cell, exit_time: e.target.value })}
                style={{ width: 84 }}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function IndexRuntimeCard({ idx, snap }) {
  if (!snap) {
    return (
      <div className="card" style={{ flex: 1, minWidth: 280 }}>
        <div className="card-title">{idx}</div>
        <div style={{ color: 'var(--text-muted)' }}>No data</div>
      </div>
    );
  }
  const pnlColor =
    snap.last_mtm_rs > 0 ? '#10b981' : snap.last_mtm_rs < 0 ? '#f87171' : 'var(--text-secondary)';
  return (
    <div className="card" style={{ flex: 1, minWidth: 280 }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{idx}</span>
        <span className={`status-badge ${snap.entered ? 'running' : snap.done_for_day ? 'stopped' : ''}`}>
          {snap.phase || 'IDLE'}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {snap.strat || '—'} • {snap.entry_trigger || '—'} • {snap.entry_time || '--:--'} → {snap.exit_time || '--:--'}
      </div>
      <div style={{ marginTop: 6 }}>
        ATM: <strong>{fmt(snap.atm)}</strong> &nbsp;|&nbsp; Credit: <strong>{fmt(snap.credit_pts)}</strong> pts
      </div>
      <div style={{ marginTop: 4 }}>
        MTM: <strong style={{ color: pnlColor }}>₹{fmt(snap.last_mtm_rs)}</strong>
      </div>
      {snap.ce && (
        <div style={{ fontSize: 12, marginTop: 4 }}>CE: {snap.ce.symbol} @ {fmt(snap.ce.premium)}</div>
      )}
      {snap.pe && (
        <div style={{ fontSize: 12 }}>PE: {snap.pe.symbol} @ {fmt(snap.pe.premium)}</div>
      )}
      {(snap.events || []).slice(-3).reverse().map((e, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {e.t} • {e.type}: {e.msg}
        </div>
      ))}
    </div>
  );
}

export default function ResearchStraddleCard() {
  const [settings, setSettings] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [s, r, d] = await Promise.all([
        fetchAtmResearchSettings(),
        fetchAtmResearchRuntime(),
        fetchAtmResearchDefaults(),
      ]);
      if (!dirty) setSettings(s.data);
      setRuntime(r.data?.runtime ?? null);
      setDefaults(d.data ?? null);
    } catch (e) {
      // noop
    }
  }, [dirty]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadAll]);

  const mode = settings?.mode || 'multi_indicator';
  const indicatorAllowed = mode === 'single_indicator' || mode === 'multi_indicator';
  const multiAllowed     = mode === 'multi_time'      || mode === 'multi_indicator';

  const setField = (k, v) => {
    setSettings((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };
  const setCell = (day, idx, cell) => {
    setSettings((prev) => {
      const sched = { ...(prev?.schedule || {}) };
      sched[day] = { ...(sched[day] || {}), [idx]: cell };
      return { ...prev, schedule: sched };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await updateAtmResearchSettings(settings);
      setSettings(r.data);
      setDirty(false);
      setMsg('Saved. Active on next scanner cycle.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Save failed: ' + (e?.response?.data?.detail || e.message));
    }
    setSaving(false);
  };

  const loadPreset = (key) => {
    if (!defaults || !defaults[key]) return;
    setSettings((prev) => ({
      ...prev,
      mode: key === 'multi_indicator' ? 'multi_indicator' : 'multi_time',
      schedule: JSON.parse(JSON.stringify(defaults[key])),
    }));
    setDirty(true);
  };

  const closeSide = async (idx) => {
    if (!window.confirm(`Force-close ${idx} research position?`)) return;
    try { await forceCloseAtmResearch(idx); await loadAll(); } catch { /* */ }
  };
  const resetSide = async (idx) => {
    try { await resetAtmResearch(idx); await loadAll(); } catch { /* */ }
  };

  const warnings = runtime?.warnings || [];
  const indices = runtime?.indices || {};

  const totalMtm = useMemo(() => {
    let t = 0;
    Object.values(indices).forEach((s) => { t += Number(s.last_mtm_rs || 0); });
    return t;
  }, [indices]);

  if (!settings) {
    return <div className="card" style={{ marginTop: 12 }}>Loading research strategy...</div>;
  }

  return (
    <section className="section" style={{ marginTop: 16 }}>
      <h3 className="section-title">Research Multi-Index Strategy <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(time + indicator gated)</small></h3>

      {/* Status banner */}
      {warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 10, borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)' }}>
          {warnings.map((w, i) => <div key={i} style={{ color: '#f59e0b' }}>⚠ {w}</div>)}
        </div>
      )}

      {/* Per-index runtime cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {INDICES.map((idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 280 }}>
            <IndexRuntimeCard idx={idx} snap={indices[idx]} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => closeSide(idx)} disabled={!indices[idx]?.entered}>
                Force-close {idx}
              </button>
              <button className="btn btn-sm" onClick={() => resetSide(idx)} disabled={!indices[idx]?.done_for_day && !indices[idx]?.halted}>
                Reset {idx}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>Total open MTM: <strong style={{ color: totalMtm >= 0 ? '#10b981' : '#f87171' }}>₹{fmt(totalMtm)}</strong></div>
          <div>Mode label: <span className={`status-badge ${runtime?.live_mode ? 'running' : 'stopped'}`}>{runtime?.live_mode ? 'LIVE' : 'PAPER'}</span></div>
          <div>Active instruments: <strong>{(runtime?.active_instruments || []).join(', ') || '-'}</strong></div>
        </div>
      </div>

      {/* Settings panel */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-title">Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 8 }}>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enable strategy</div>
            <input
              type="checkbox"
              checked={!!settings.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
            /> {settings.enabled ? 'Running' : 'Off'}
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mode</div>
            <select value={settings.mode || 'multi_indicator'} onChange={(e) => setField('mode', e.target.value)} style={{ width: '100%' }}>
              {MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </label>
          {(settings.mode === 'single_time' || settings.mode === 'single_indicator') && (
            <label>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Primary index</div>
              <select value={settings.primary_index || 'NIFTY'} onChange={(e) => setField('primary_index', e.target.value)} style={{ width: '100%' }}>
                {INDICES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          )}
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Execution account</div>
            <select value={settings.execution_account || 'Primary'} onChange={(e) => setField('execution_account', e.target.value)} style={{ width: '100%' }}>
              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>NIFTY lots (×65)</div>
            <input type="number" min="1" value={settings.lots_nifty || 4} onChange={(e) => setField('lots_nifty', Number(e.target.value))} style={{ width: '100%' }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SENSEX lots (×20)</div>
            <input type="number" min="1" value={settings.lots_sensex || 4} onChange={(e) => setField('lots_sensex', Number(e.target.value))} style={{ width: '100%' }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hard ₹SL per pair</div>
            <input type="number" min="500" step="500" value={settings.sl_rs || 6000} onChange={(e) => setField('sl_rs', Number(e.target.value))} style={{ width: '100%' }} />
          </label>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving...' : (dirty ? 'Save changes' : 'Saved')}
          </button>
          <button className="btn" onClick={() => loadPreset('multi_indicator')}>
            Load winning indicator schedule (+₹3.8L/wk backtest)
          </button>
          <button className="btn" onClick={() => loadPreset('multi_time')}>
            Load time-based baseline (+₹2.5L/wk backtest)
          </button>
          {msg && <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>{msg}</span>}
        </div>
      </div>

      {/* Schedule grid */}
      <div className="card">
        <div className="card-title">Weekly Schedule</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          In <strong>{mode.startsWith('multi_') ? 'multi' : 'single'}</strong> mode,{' '}
          {indicatorAllowed
            ? 'choose any T0–T5 trigger; T1–T5 wait 5 bars after entry_time before evaluating.'
            : 'entries are pure clock-time at the entry_time field.'}{' '}
          Both legs SELL at the strike(s) derived from strat. Hard ₹{settings.sl_rs} stop on combined leg-pair MTM. Exit_time forces close.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid var(--border)' }}>Day</th>
                {INDICES.map((i) => (
                  <th key={i} style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid var(--border)' }}>{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((d) => (
                <ScheduleRow
                  key={d}
                  day={d}
                  cells={(settings.schedule || {})[d] || {}}
                  onChange={setCell}
                  indicatorAllowed={indicatorAllowed}
                  multiAllowed={multiAllowed}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
