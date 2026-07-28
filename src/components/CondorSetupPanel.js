import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchTodaysCondorSetup,
  fetchCondorSetupStatus,
  triggerCondorSetupRecompute,
} from '../api';

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function StatusBadge({ status }) {
  const map = {
    ok: { label: 'Ready', color: '#10b981' },
    no_data: { label: 'Waiting for data', color: '#f59e0b' },
    error: { label: 'Error', color: '#ef4444' },
  };
  const { label, color } = map[status] || { label: status || 'Unknown', color: '#94a3b8' };
  return (
    <span style={{
      color, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4,
    }}>
      ● {label}
    </span>
  );
}

function LegRow({ label, strike }) {
  return (
    <tr>
      <td style={{ padding: '4px 10px', color: '#94a3b8' }}>{label}</td>
      <td style={{ padding: '4px 10px', fontWeight: 700, textAlign: 'right' }}>
        {strike != null ? strike : '—'}
      </td>
    </tr>
  );
}

function CondorSetupCard({ setup, recommendedIndex }) {
  const isRecommended = setup.index === recommendedIndex;
  return (
    <div className="card" style={{ flex: 1, minWidth: 320, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{setup.index}</h3>
        {isRecommended && (
          <span style={{
            background: '#3b82f6', color: '#fff', padding: '3px 10px',
            borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
            Today's Pick
          </span>
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        <StatusBadge status={setup.status} />
      </div>

      {setup.status !== 'ok' ? (
        <p style={{ color: '#94a3b8', marginTop: 12 }}>
          {setup.notes || 'No setup computed yet for today.'}
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 13 }}>
            <div><span style={{ color: '#94a3b8' }}>Spot: </span>{setup.spot?.toFixed(2)}</div>
            <div><span style={{ color: '#94a3b8' }}>ATM: </span>{setup.atm_strike}</div>
            <div>
              <span style={{ color: '#94a3b8' }}>Resistance: </span>
              {setup.resistance_price?.toFixed(2)}
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {setup.resistance_source} (conf {setup.resistance_confidence})
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Support: </span>
              {setup.support_price?.toFixed(2)}
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {setup.support_source} (conf {setup.support_confidence})
              </div>
            </div>
          </div>

          <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
            <tbody>
              <LegRow label="SELL CE (short)" strike={setup.short_ce_strike} />
              <LegRow label="SELL PE (short)" strike={setup.short_pe_strike} />
              <LegRow label="BUY CE (wing / hedge)" strike={setup.long_ce_strike} />
              <LegRow label="BUY PE (wing / hedge)" strike={setup.long_pe_strike} />
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            Wing width: {setup.wing_width_points} pts · Lot size: {setup.lot_size} · Expiry: {WEEKDAY_NAMES[setup.expiry_weekday]}
          </div>
        </>
      )}
    </div>
  );
}

export default function CondorSetupPanel() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [todayRes, statusRes] = await Promise.all([
        fetchTodaysCondorSetup(),
        fetchCondorSetupStatus(),
      ]);
      setData(todayRes?.data || null);
      setStatus(statusRes?.data || null);
    } catch {
      setError('Failed to load condor setup.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await triggerCondorSetupRecompute();
      // Give the background task a few seconds to finish, then reload.
      setTimeout(() => { load(); setRecomputing(false); }, 6000);
    } catch {
      setError('Failed to trigger recompute.');
      setRecomputing(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>Today's Condor Setup</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, maxWidth: 640 }}>
            Pre-market confluence levels (pivots + prior day H/L + opening range) computed automatically each morning.
            <strong> Informational only</strong> — this system does not place these orders for you.
            Use these levels to set up the strangle/strangle-with-hedge manually below via a Strategy Instance,
            or place the legs directly with your broker.
          </p>
        </div>
        <button className="btn" onClick={handleRecompute} disabled={recomputing}>
          {recomputing ? 'Recomputing…' : 'Recompute Now'}
        </button>
      </div>

      {status?.next_run_at && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Next automatic run: {new Date(status.next_run_at).toLocaleString('en-IN')}
          {status.last_error ? ` · last error: ${status.last_error}` : ''}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading…</p>
      ) : error ? (
        <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          {(data?.setups || []).length === 0 ? (
            <p style={{ color: '#94a3b8' }}>
              No setup computed yet for {data?.date}. Click "Recompute Now" once the market has been open for ~15 minutes.
            </p>
          ) : (
            data.setups.map((s) => (
              <CondorSetupCard key={s.index} setup={s} recommendedIndex={data.recommended_index} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
