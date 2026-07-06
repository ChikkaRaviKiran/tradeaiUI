import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAtmRuntime,
  forceCloseAtm,
  resetAtm,
  fetchAtmInstances,
  forceCloseAtmInstance,
  placeNowAtmInstance,
  resetAtmInstance,
} from '../api';
import StraddleScheduleCard from './StraddleScheduleCard';
import ResearchStraddleCard from './ResearchStraddleCard';

const REFRESH_MS = 5000;

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function LegCard({ title, leg, badgeClass }) {
  if (!leg) {
    return (
      <div className="card" style={{ flex: 1, minWidth: 220 }}>
        <div className="card-title">{title}</div>
        <div style={{ color: 'var(--text-muted)' }}>Not active</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 220 }}>
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        {badgeClass && <span className={`status-badge ${badgeClass}`}>{leg.option_type}</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{leg.symbol}</div>
      <div style={{ marginTop: 6 }}>Strike: <strong>{fmt(leg.strike)}</strong></div>
      <div>LTP: <strong>{fmt(leg.premium)}</strong></div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{leg.exchange} • {leg.symboltoken || '-'}</div>
    </div>
  );
}

export default function ATMStrategyPage() {
  const [runtime, setRuntime] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [busyInstance, setBusyInstance] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rtRes, instRes] = await Promise.all([
        fetchAtmRuntime(),
        fetchAtmInstances().catch(() => ({ data: { instances: [] } })),
      ]);
      const rt = rtRes?.data?.runtime ?? rtRes?.data ?? null;
      if (rt) setRuntime(rt);
      const inst = instRes?.data?.instances || [];
      setInstances(Array.isArray(inst) ? inst : []);
    } catch {
      // noop
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !runtime) {
    return (
      <section className="section" style={{ marginTop: 4 }}>
        <h2 className="section-title">ATM Strategy</h2>
        <div className="card">Loading ATM runtime...</div>
      </section>
    );
  }

  return (
    <section className="section" style={{ marginTop: 4 }}>
      <h2 className="section-title">ATM Strategy</h2>

      <StraddleScheduleCard />

      <ResearchStraddleCard />

      {instances.length > 1 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>
            Strategy Instances ({instances.length})
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            One row per user-configured strategy. The main panel below shows the primary instance;
            use this table to diagnose why another instance did or didn't trade.
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Index</th>
                <th>Mode</th>
                <th>Broker</th>
                <th>Phase</th>
                <th>In Trade</th>
                <th>Halted</th>
                <th>Last Event</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((it) => {
                const lastEvt = (it.events || []).slice(-1)[0];
                return (
                  <tr key={it.instance_id}>
                    <td>{it.instance_id}</td>
                    <td>{it.index || '-'}</td>
                    <td>
                      <span className={`status-badge ${it.live_mode ? 'running' : 'stopped'}`}>
                        {it.live_mode ? 'LIVE' : 'PAPER'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          !it.live_mode ? 'stopped' : it.broker_ready ? 'running' : 'stopped'
                        }`}
                        title={
                          it.live_mode && !it.broker_ready
                            ? 'No broker attached — bound account is missing credentials'
                            : ''
                        }
                      >
                        {it.live_mode
                          ? it.broker_ready
                            ? it.broker_name || 'Ready'
                            : 'NOT READY'
                          : 'PAPER'}
                      </span>
                    </td>
                    <td>{it.phase || 'IDLE'}</td>
                    <td>{it.in_trade ? 'Yes' : 'No'}</td>
                    <td>
                      {it.halted ? (
                        <span style={{ color: '#f87171' }} title={it.halt_reason || ''}>HALTED</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {lastEvt ? `${lastEvt.time} ${lastEvt.event}` : '-'}
                    </td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                        disabled={busyInstance === it.instance_id}
                        onClick={async () => {
                          setBusyInstance(it.instance_id);
                          try { await placeNowAtmInstance(it.instance_id); await load(); } catch { /* noop */ }
                          setBusyInstance(null);
                        }}
                      >
                        Place Now
                      </button>
                      {it.halted && (
                        <button
                          className="btn"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          disabled={busyInstance === it.instance_id}
                          onClick={async () => {
                            setBusyInstance(it.instance_id);
                            try { await resetAtmInstance(it.instance_id); await load(); } catch { /* noop */ }
                            setBusyInstance(null);
                          }}
                        >
                          Reset
                        </button>
                      )}
                      {it.in_trade && (
                        <button
                          className="btn btn-stop"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          disabled={busyInstance === it.instance_id}
                          onClick={async () => {
                            if (!window.confirm(`Force close instance ${it.instance_id}?`)) return;
                            setBusyInstance(it.instance_id);
                            try { await forceCloseAtmInstance(it.instance_id); await load(); } catch { /* noop */ }
                            setBusyInstance(null);
                          }}
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {runtime?.halted && (
        <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #f87171', background: 'rgba(248,113,113,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="card-title" style={{ color: '#f87171' }}>⛔ STRATEGY HALTED — no further entries today</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{runtime.halt_reason || 'Order placement failed.'}</div>
            </div>
            <button
              className="btn"
              disabled={resetting}
              onClick={async () => {
                if (!window.confirm('Clear halt? Strategy will attempt entry again on the next cycle.')) return;
                setResetting(true);
                try { await resetAtm(); await load(); } catch { /* noop */ }
                setResetting(false);
              }}
            >
              {resetting ? 'Resetting...' : 'Reset Halt'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="card-title">Mode</div>
            <div className={`status-badge ${runtime?.live_mode ? 'running' : 'stopped'}`}>
              {runtime?.live_mode ? 'LIVE' : 'PAPER'}
            </div>
          </div>
          <div>
            <div className="card-title">Broker</div>
            <div
              className={`status-badge ${
                !runtime?.live_mode
                  ? 'stopped'
                  : runtime?.broker_ready
                  ? 'running'
                  : 'stopped'
              }`}
              title={
                runtime?.live_mode && !runtime?.broker_ready
                  ? 'Live mode is on but no broker is attached to this strategy. '
                    + 'The bound account row is missing credentials (typically Dhan access_token) — '
                    + 'edit the account in Settings and paste the access token.'
                  : ''
              }
            >
              {runtime?.live_mode
                ? runtime?.broker_ready
                  ? runtime.broker_name || 'Ready'
                  : 'NOT READY'
                : 'PAPER'}
            </div>
          </div>
          <div>
            <div className="card-title">Phase</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>{runtime?.phase || 'IDLE'}</div>
          </div>
          <div>
            <div className="card-title">In Trade</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>{runtime?.in_trade ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <div className="card-title">Index / Expiry</div>
            <div className="stat-value" style={{ fontSize: '1.0rem' }}>{runtime?.index || '-'} / {runtime?.expiry || '-'}</div>
          </div>
          <div>
            <div className="card-title">SL Points</div>
            <div className="stat-value" style={{ fontSize: '1.0rem' }}>{fmt(runtime?.straddle_sl_points)}</div>
          </div>
          <div>
            <div className="card-title">Roll / Reform</div>
            <div className="stat-value" style={{ fontSize: '1.0rem' }}>{runtime?.roll_count || 0} / {runtime?.reform_count || 0}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-stop"
            disabled={closing || !runtime?.in_trade}
            onClick={async () => {
              if (!window.confirm('Force close ATL ATM strategy now?')) return;
              setClosing(true);
              try {
                await forceCloseAtm();
                await load();
              } catch {
                // noop
              }
              setClosing(false);
            }}
          >
            {closing ? 'Closing...' : 'Force Close ATM'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <LegCard title="Short CE" leg={runtime?.short_ce} badgeClass="stopped" />
        <LegCard title="Short PE" leg={runtime?.short_pe} badgeClass="running" />
        <LegCard title="Hedge CE" leg={runtime?.hedge_ce} />
        <LegCard title="Hedge PE" leg={runtime?.hedge_pe} />
      </div>

      <div className="card table-container">
        <div className="card-title" style={{ marginBottom: 8 }}>Execution Timeline</div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Mode</th>
              <th>Event</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Show only meaningful lifecycle events: entries, exits, errors,
              // and operator actions. Per-minute "skip" diagnostics are
              // intentionally hidden to keep the timeline readable.
              const SHOWN_EVENTS = new Set([
                'entry',
                'force_entry',
                'force_entry_requested',
                'straddle',
                'stoploss',
                'force_close',
                'handoff',
                'complete',
                'order_error',
                'halt',
                'reset',
                'rearm',
                'hedge',
              ]);
              const filtered = (runtime?.events || []).filter(
                (e) => SHOWN_EVENTS.has(e.event)
              );
              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text-muted)' }}>
                      No entry/exit/error events yet for current trading day.
                    </td>
                  </tr>
                );
              }
              return filtered.slice().reverse().map((e, i) => (
                <tr key={`${e.time}-${i}`}>
                  <td>{e.time}</td>
                  <td>{(e.mode || 'paper').toUpperCase()}</td>
                  <td>{e.event}</td>
                  <td>{e.message}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </section>
  );
}
