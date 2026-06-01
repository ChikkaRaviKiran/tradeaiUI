import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAtmResearchRuntime,
  fetchAtmResearchSettings,
  forceCloseAtmResearch,
  resetAtmResearch,
} from '../api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const INDICES = ['NIFTY', 'SENSEX'];
const REFRESH_MS = 5000;

const STRAT_LABEL = {
  straddle: 'Straddle (ATM)',
  strangle_1: 'Strangle ±1 step',
  strangle_2: 'Strangle ±2 step',
};
const TRIGGER_LABEL = {
  T0: 'Fixed time',
  T1: 'IV Crush',
  T2: 'VWAP Align',
  T3: 'RSI Revert',
  T4: 'BB Squeeze',
  T5: 'EMA Cross',
};
const MODE_LABEL = {
  single_time: 'Single index • Fixed time',
  single_indicator: 'Single index • Indicator-gated',
  multi_time: 'Multi index • Fixed time',
  multi_indicator: 'Multi index • Indicator-gated',
};

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function todayName() {
  const d = new Date().getDay();
  return d >= 1 && d <= 5 ? WEEKDAYS[d - 1] : null;
}

function ScheduleLine({ idx, cell }) {
  if (!cell || !cell.enabled) {
    return <span style={{ color: 'var(--text-muted)' }}>{idx}: — skip —</span>;
  }
  return (
    <span>
      <strong>{idx}:</strong> {STRAT_LABEL[cell.strat] || cell.strat}
      {' • '}
      <span style={{ color: '#60a5fa' }}>
        {cell.entry} {TRIGGER_LABEL[cell.entry] || ''}
      </span>
      {' @ '}{cell.entry_time} → {cell.exit_time}
    </span>
  );
}

function IndexRuntimeCard({ idx, snap, onClose, onReset }) {
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
        {snap.strat ? (STRAT_LABEL[snap.strat] || snap.strat) : '—'}
        {snap.entry_trigger ? ` • ${snap.entry_trigger} ${TRIGGER_LABEL[snap.entry_trigger] || ''}` : ''}
        {' • '}{snap.entry_time || '--:--'} → {snap.exit_time || '--:--'}
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
      {snap.hedge_ce && (
        <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
          Hedge CE: {snap.hedge_ce.symbol} @ {fmt(snap.hedge_ce.premium)}
        </div>
      )}
      {snap.hedge_pe && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Hedge PE: {snap.hedge_pe.symbol} @ {fmt(snap.hedge_pe.premium)}
        </div>
      )}
      {(snap.short_credit_pts || snap.hedge_cost_pts) ? (
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
          Short credit {fmt(snap.short_credit_pts)} − hedge {fmt(snap.hedge_cost_pts)} = net {fmt(snap.credit_pts)} pts
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button className="btn btn-sm" onClick={onClose} disabled={!snap.entered}>
          Force-close
        </button>
        <button className="btn btn-sm" onClick={onReset} disabled={!snap.done_for_day && !snap.halted}>
          Reset day
        </button>
      </div>
    </div>
  );
}

export default function ResearchStraddleCard() {
  const [settings, setSettings] = useState(null);
  const [runtime, setRuntime] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([fetchAtmResearchSettings(), fetchAtmResearchRuntime()]);
      setSettings(s.data);
      setRuntime(r.data?.runtime ?? null);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const closeSide = async (idx) => {
    if (!window.confirm(`Force-close ${idx} research position?`)) return;
    try { await forceCloseAtmResearch(idx); await load(); } catch { /* */ }
  };
  const resetSide = async (idx) => {
    try { await resetAtmResearch(idx); await load(); } catch { /* */ }
  };

  const indices = runtime?.indices || {};
  const totalMtm = useMemo(() => {
    let t = 0;
    Object.values(indices).forEach((s) => { t += Number(s.last_mtm_rs || 0); });
    return t;
  }, [indices]);

  if (!settings) return null;

  const enabled = !!settings.enabled;
  const mode = settings.mode || 'multi_indicator';
  const today = todayName();
  const todayCells = today ? (settings.schedule || {})[today] || {} : null;
  const warnings = runtime?.warnings || [];

  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          Research Strategy
          <small style={{ color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: 8 }}>
            (time + indicator gated)
          </small>
        </h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Mode: <strong>{MODE_LABEL[mode] || mode}</strong>{' '}
          <span className={`status-badge ${enabled ? 'running' : 'stopped'}`} style={{ marginLeft: 6 }}>
            {enabled ? 'ENABLED' : 'DISABLED'}
          </span>{' '}
          <span className={`status-badge ${runtime?.live_mode ? 'running' : ''}`} style={{ marginLeft: 4 }}>
            {runtime?.live_mode ? 'LIVE' : 'PAPER'}
          </span>
          <a href="/settings/atm-research" style={{ marginLeft: 12, fontSize: 12 }}>Edit setup →</a>
        </div>
      </div>

      {!enabled && (
        <div className="card" style={{ marginTop: 10, borderLeft: '4px solid #6b7280', background: 'rgba(107,114,128,0.08)' }}>
          Strategy is currently disabled. Go to <a href="/settings/atm-research">Settings → ATM Research</a> to set it up and turn it on.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card" style={{ marginTop: 10, borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)' }}>
          {warnings.map((w, i) => <div key={i} style={{ color: '#f59e0b' }}>⚠ {w}</div>)}
        </div>
      )}

      {today && todayCells && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="card-title">Today ({today})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
            {INDICES.map((idx) => (
              <ScheduleLine key={idx} idx={idx} cell={todayCells[idx]} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        {INDICES.map((idx) => (
          <IndexRuntimeCard
            key={idx}
            idx={idx}
            snap={indices[idx]}
            onClose={() => closeSide(idx)}
            onReset={() => resetSide(idx)}
          />
        ))}
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        Total open MTM: <strong style={{ color: totalMtm >= 0 ? '#10b981' : '#f87171' }}>₹{fmt(totalMtm)}</strong>
        {runtime?.active_instruments && (
          <span style={{ marginLeft: 16, color: 'var(--text-muted)', fontSize: 13 }}>
            Active instruments: {runtime.active_instruments.join(', ') || '-'}
          </span>
        )}
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="card-title">Weekly Schedule</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          {WEEKDAYS.map((d) => {
            const cells = (settings.schedule || {})[d] || {};
            const isToday = d === today;
            return (
              <div
                key={d}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isToday ? 'rgba(96,165,250,0.10)' : 'transparent',
                  border: isToday ? '1px solid rgba(96,165,250,0.30)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 36, fontWeight: 600 }}>{d}</span>
                  <ScheduleLine idx="NIFTY" cell={cells.NIFTY} />
                  <ScheduleLine idx="SENSEX" cell={cells.SENSEX} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
