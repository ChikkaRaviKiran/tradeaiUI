import React, { useCallback, useEffect, useState } from 'react';
import { fetchAtmRuntime, forceCloseAtm } from '../api';

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
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAtmRuntime();
      // Backend returns { runtime: {...} }. Earlier prototype expected a
      // status:'ok' wrapper which was never sent — accept either shape.
      const rt = res?.data?.runtime ?? res?.data ?? null;
      if (rt) setRuntime(rt);
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

      <div className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="card-title">Mode</div>
            <div className={`status-badge ${runtime?.live_mode ? 'running' : 'stopped'}`}>
              {runtime?.live_mode ? 'LIVE' : 'PAPER'}
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
            {(runtime?.events || []).slice().reverse().map((e, i) => (
              <tr key={`${e.time}-${i}`}>
                <td>{e.time}</td>
                <td>{(e.mode || 'paper').toUpperCase()}</td>
                <td>{e.event}</td>
                <td>{e.message}</td>
              </tr>
            ))}
            {(!runtime?.events || runtime.events.length === 0) && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-muted)' }}>No events yet for current trading day.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
