import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAtmResearchDefaults,
  fetchAtmResearchSettings,
  updateAtmResearchSettings,
} from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// Goal: minimal, guided setup. Three big choices, sensible defaults, optional
// advanced editor. The complex weekly grid is collapsed behind one button.
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const INDICES = ['NIFTY', 'SENSEX'];
const STRATS = [
  { v: 'straddle',   label: 'Straddle (ATM)' },
  { v: 'strangle_1', label: 'Strangle ±1 step' },
  { v: 'strangle_2', label: 'Strangle ±2 step' },
];
const TRIGGERS = [
  { v: 'T0', label: 'T0 – Fixed time' },
  { v: 'T1', label: 'T1 – IV Crush' },
  { v: 'T2', label: 'T2 – VWAP Align' },
  { v: 'T3', label: 'T3 – RSI Revert' },
  { v: 'T4', label: 'T4 – BB Squeeze' },
  { v: 'T5', label: 'T5 – EMA Cross' },
];
const ACCOUNTS = ['Primary', 'Paper', 'Live (Kite)', 'Live (Angel)', 'Live (Dhan)'];

const STRAT_LABEL = Object.fromEntries(STRATS.map((s) => [s.v, s.label]));
const TRIGGER_LABEL = Object.fromEntries(TRIGGERS.map((t) => [t.v, t.label]));

// ─── Plan cards ─────────────────────────────────────────────────────────────
// Three top-level plan presets. Each maps to a mode + an optional preset key
// (we fetch the schedules from /api/atm-research/defaults).

const PLANS = [
  {
    key: 'time_multi',
    mode: 'multi_time',
    preset: 'multi_time',
    title: 'Time-based · Multi-Index',
    desc: 'NIFTY + SENSEX every day. Fixed entry/exit clock-times. No indicators.',
    tag: 'Simplest',
    blurb: 'Backtest: ~₹2.5L/wk · 4+4 lots · ₹6,000 SL.',
  },
  {
    key: 'indicator_single',
    mode: 'single_indicator',
    preset: null, // user-driven; uses indicator schedule but only one side
    title: 'Indicator · Single Index',
    desc: 'One index (NIFTY or SENSEX). Entry waits for an indicator gate (IV crush / VWAP / RSI / BB / EMA).',
    tag: 'Focused',
    blurb: 'Use when you want minimal exposure and one decision a day.',
  },
  {
    key: 'indicator_multi',
    mode: 'multi_indicator',
    preset: 'multi_indicator',
    title: 'Indicator · Multi-Index',
    desc: 'NIFTY + SENSEX. Each side has its own indicator gate per weekday.',
    tag: 'Recommended',
    blurb: 'Backtest: ~₹3.8L/wk · 4+4 lots · ₹6,000 SL.',
  },
];

const PLAN_BY_MODE = {
  multi_time: 'time_multi',
  single_indicator: 'indicator_single',
  multi_indicator: 'indicator_multi',
  single_time: 'indicator_single', // edge-case — falls under "single" UI
};

function PlanCard({ plan, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        flex: 1,
        minWidth: 240,
        cursor: 'pointer',
        borderLeft: active ? '4px solid #60a5fa' : '4px solid transparent',
        background: active ? 'rgba(96,165,250,0.08)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>{plan.title}</div>
        <span className={`status-badge ${plan.tag === 'Recommended' ? 'running' : ''}`}>{plan.tag}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.desc}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{plan.blurb}</div>
    </div>
  );
}

function summariseCell(cell) {
  if (!cell || !cell.enabled) return <span style={{ color: 'var(--text-muted)' }}>— skip —</span>;
  return (
    <span>
      {STRAT_LABEL[cell.strat] || cell.strat}
      {' • '}
      <span style={{ color: '#60a5fa' }}>{TRIGGER_LABEL[cell.entry] || cell.entry}</span>
      {' @ '}{cell.entry_time} → {cell.exit_time}
    </span>
  );
}

export default function ResearchStraddleSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([fetchAtmResearchSettings(), fetchAtmResearchDefaults()]);
      setSettings(s.data);
      setDefaults(d.data ?? null);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!settings) {
    return <div className="card" style={{ marginTop: 12 }}>Loading…</div>;
  }

  const mode = settings.mode || 'multi_indicator';
  const planKey = PLAN_BY_MODE[mode] || 'indicator_multi';
  const isSingle = mode.startsWith('single_');
  const indicatorAllowed = mode === 'single_indicator' || mode === 'multi_indicator';

  const setField = (k, v) => {
    setSettings((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const choosePlan = (plan) => {
    setSettings((prev) => {
      const next = { ...prev, mode: plan.mode };
      // Load preset schedule if the plan has one. For "indicator_single" we
      // keep whatever schedule already exists (it's mode-filtered server-side).
      if (plan.preset && defaults && defaults[plan.preset]) {
        next.schedule = JSON.parse(JSON.stringify(defaults[plan.preset]));
      } else if (!prev.schedule || Object.keys(prev.schedule).length === 0) {
        if (defaults?.multi_indicator) {
          next.schedule = JSON.parse(JSON.stringify(defaults.multi_indicator));
        }
      }
      return next;
    });
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

  const save = async (enableAfter) => {
    setSaving(true);
    try {
      const payload = enableAfter == null ? settings : { ...settings, enabled: !!enableAfter };
      const r = await updateAtmResearchSettings(payload);
      setSettings(r.data);
      setDirty(false);
      setMsg(enableAfter ? 'Saved and enabled.' : enableAfter === false ? 'Saved (disabled).' : 'Saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Save failed: ' + (e?.response?.data?.detail || e.message));
    }
    setSaving(false);
  };

  // What rows to display in the "what will run" summary?
  // single: only the primary index row. multi: both.
  const summaryIndices = isSingle ? [settings.primary_index || 'NIFTY'] : INDICES;

  return (
    <div style={{ marginTop: 12 }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">ATM Research Strategy — Setup</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Live multi-index straddle/strangle with optional indicator gates. Pick a plan, set lots and SL, then save.
        </div>
      </div>

      {/* Step 1 — Plan picker */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">1. Pick a plan</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {PLANS.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              active={planKey === p.key}
              onClick={() => choosePlan(p)}
            />
          ))}
        </div>
        {isSingle && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 8 }}>Primary index:</label>
            {INDICES.map((i) => (
              <label key={i} style={{ marginRight: 14 }}>
                <input
                  type="radio"
                  name="primary_index"
                  checked={(settings.primary_index || 'NIFTY') === i}
                  onChange={() => setField('primary_index', i)}
                /> {i}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Basics */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">2. Basics</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginTop: 8,
        }}>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>NIFTY lots (×65)</div>
            <input type="number" min="1" value={settings.lots_nifty || 4}
                   onChange={(e) => setField('lots_nifty', Number(e.target.value))}
                   disabled={isSingle && settings.primary_index === 'SENSEX'}
                   style={{ width: '100%' }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SENSEX lots (×20)</div>
            <input type="number" min="1" value={settings.lots_sensex || 4}
                   onChange={(e) => setField('lots_sensex', Number(e.target.value))}
                   disabled={isSingle && settings.primary_index === 'NIFTY'}
                   style={{ width: '100%' }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hard ₹SL per pair</div>
            <input type="number" min="500" step="500" value={settings.sl_rs || 6000}
                   onChange={(e) => setField('sl_rs', Number(e.target.value))}
                   style={{ width: '100%' }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Execution account</div>
            <select value={settings.execution_account || 'Primary'}
                    onChange={(e) => setField('execution_account', e.target.value)}
                    style={{ width: '100%' }}>
              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Step 3 — Schedule preview (read-only summary) */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>3. Weekly Schedule</div>
          <button className="btn btn-sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide details' : 'Customize'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {indicatorAllowed
            ? 'Each cell can use T0 (fixed time) or T1–T5 (indicator). T1–T5 wait at least 5 bars after the entry time.'
            : 'Pure clock-time entries at the listed times. Hard ₹SL closes early if the leg-pair MTM hits the limit.'}
        </div>

        {/* Summary table — always visible */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          {WEEKDAYS.map((d) => {
            const cells = (settings.schedule || {})[d] || {};
            return (
              <div key={d} style={{ display: 'flex', gap: 14, padding: '4px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ minWidth: 40, fontWeight: 600 }}>{d}</span>
                {summaryIndices.map((idx) => (
                  <span key={idx} style={{ minWidth: 280 }}>
                    <strong style={{ color: 'var(--text-muted)' }}>{idx}:</strong> {summariseCell(cells[idx])}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* Advanced editor — collapsed by default */}
        {showAdvanced && (
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid var(--border)' }}>Day</th>
                  {summaryIndices.map((i) => (
                    <th key={i} style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid var(--border)' }}>{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((d) => (
                  <tr key={d}>
                    <td style={{ fontWeight: 600, padding: 6 }}>{d}</td>
                    {summaryIndices.map((idx) => {
                      const cell = ((settings.schedule || {})[d] || {})[idx] || {};
                      return (
                        <td key={idx} style={{ padding: 6 }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <label>
                              <input type="checkbox" checked={!!cell.enabled}
                                     onChange={(e) => setCell(d, idx, { ...cell, enabled: e.target.checked })} /> On
                            </label>
                            <select value={cell.strat || 'straddle'} disabled={!cell.enabled}
                                    onChange={(e) => setCell(d, idx, { ...cell, strat: e.target.value })}>
                              {STRATS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                            </select>
                            <select value={cell.entry || 'T0'} disabled={!cell.enabled}
                                    onChange={(e) => setCell(d, idx, { ...cell, entry: e.target.value })}>
                              {TRIGGERS.filter((t) => indicatorAllowed || t.v === 'T0').map((t) => (
                                <option key={t.v} value={t.v}>{t.label}</option>
                              ))}
                            </select>
                            <input type="time" value={cell.entry_time || '09:20'} disabled={!cell.enabled}
                                   onChange={(e) => setCell(d, idx, { ...cell, entry_time: e.target.value })}
                                   style={{ width: 84 }} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                            <input type="time" value={cell.exit_time || '15:15'} disabled={!cell.enabled}
                                   onChange={(e) => setCell(d, idx, { ...cell, exit_time: e.target.value })}
                                   style={{ width: 84 }} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer — save / enable */}
      <div className="card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ marginRight: 'auto' }}>
            Status:{' '}
            <span className={`status-badge ${settings.enabled ? 'running' : 'stopped'}`}>
              {settings.enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            {dirty && <span style={{ color: '#f59e0b', marginLeft: 10 }}>unsaved changes</span>}
            {msg && <span style={{ color: 'var(--text-muted)', marginLeft: 10 }}>{msg}</span>}
          </div>
          {settings.enabled ? (
            <>
              <button className="btn" disabled={saving} onClick={() => save(false)}>Save & Disable</button>
              <button className="btn" disabled={!dirty || saving} onClick={() => save(null)}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button className="btn" disabled={!dirty || saving} onClick={() => save(false)}>
                {saving ? 'Saving…' : 'Save (keep disabled)'}
              </button>
              <button className="btn btn-primary" disabled={saving} onClick={() => save(true)}
                      style={{ background: '#10b981', color: 'white' }}>
                Save & Enable
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
