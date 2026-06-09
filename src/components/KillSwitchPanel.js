import React, { useState, useEffect, useCallback } from 'react';
import { fetchKillSwitch, updateKillSwitch, resetKillSwitch } from '../api';

const POLL_MS = 5000;

function fmtINR(n) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  const sign = v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function KillSwitchPanel() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [enabledInput, setEnabledInput] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchKillSwitch();
      const s = res?.data?.state;
      if (s) {
        setState(s);
        if (!dirty) {
          setLimitInput(String(s.limit ?? ''));
          setEnabledInput(Boolean(s.enabled));
        }
      }
    } catch (e) {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [dirty]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const limitNum = parseFloat(limitInput);
      if (!Number.isFinite(limitNum) || limitNum <= 0) {
        setMsg({ ok: false, text: 'Limit must be a positive number.' });
        setSaving(false);
        return;
      }
      const res = await updateKillSwitch({ enabled: enabledInput, limit: limitNum });
      const s = res?.data?.state;
      if (s) {
        // Reflect the new server state in the local inputs immediately so
        // the user sees the change before the next 5s poll arrives.
        setState(s);
        setLimitInput(String(s.limit ?? ''));
        setEnabledInput(Boolean(s.enabled));
        setDirty(false);

        // Build a precise success message so the user knows exactly what
        // changed and whether further action (Reset) is required.
        const parts = [`Saved (limit ₹${Number(s.limit).toLocaleString('en-IN')}, ${s.enabled ? 'enabled' : 'disabled'}).`];
        if (s.locked) {
          parts.push('Switch is still TRIPPED — click “Reset Kill Switch” to allow new entries.');
        } else {
          parts.push('New limit applies on the next watchdog tick.');
        }
        setMsg({ ok: true, text: parts.join(' ') });
      } else {
        setMsg({ ok: false, text: res?.data?.error || 'Update failed.' });
      }
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.detail || e?.message || 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    if (!window.confirm('Reset the kill switch? Bot entries will resume for today.')) return;
    setResetting(true);
    setMsg(null);
    try {
      const res = await resetKillSwitch({ reason: 'manual_reset_via_ui' });
      const s = res?.data?.state;
      if (s) {
        setState(s);
        setMsg({ ok: true, text: 'Kill switch cleared. Watch for re-trip on next loss.' });
      }
    } catch (e) {
      setMsg({ ok: false, text: e?.message || 'Reset failed.' });
    } finally {
      setResetting(false);
    }
  };

  const enabled = Boolean(state?.enabled);
  const locked = Boolean(state?.locked);
  const pnl = Number(state?.current_pnl ?? 0);
  const limit = Number(state?.limit ?? 0);
  const usedPct = limit > 0 && pnl < 0 ? Math.min(100, (Math.abs(pnl) / limit) * 100) : 0;

  const barColor = !enabled
    ? 'var(--text-muted)'
    : locked
      ? 'var(--accent-red)'
      : usedPct > 75
        ? '#f59e0b'
        : 'var(--accent-green)';

  return (
    <div
      className="card"
      style={{
        padding: 16,
        marginTop: 16,
        borderLeft: `3px solid ${locked ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
      }}
    >
      <div
        className="card-title"
        style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <span>Account Daily-Loss Kill Switch</span>
        {!enabled && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(148,163,184,0.18)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            DISABLED
          </span>
        )}
        {locked && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(239,68,68,0.15)',
              color: 'var(--accent-red)',
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            TRIPPED
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
        Polls Dhan positions every few seconds and computes total realised + unrealised PnL
        across <strong>every</strong> position in the account (including manually-placed ones).
        When the loss limit is breached, all positions are force-closed and any further
        <em> new entries</em> are blocked until midnight IST. Exits / squareoffs always pass through.
      </div>

      {/* Live PnL bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 4,
          }}
        >
          <span>
            Current PnL:&nbsp;
            <strong style={{ color: pnl < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {fmtINR(pnl)}
            </strong>
          </span>
          <span>Limit: {fmtINR(-limit)}</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${usedPct}%`,
              height: '100%',
              background: barColor,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {usedPct.toFixed(0)}% of loss budget used · last poll {fmtTime(state?.last_poll_at)}
        </div>
      </div>

      {/* Settings form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={enabledInput}
            onChange={(e) => {
              setEnabledInput(e.target.checked);
              setDirty(true);
            }}
          />
          Enabled
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Daily loss limit (₹):
          <input
            type="number"
            min="100"
            step="100"
            value={limitInput}
            onChange={(e) => {
              setLimitInput(e.target.value);
              setDirty(true);
            }}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-primary)',
              width: 140,
              fontSize: 13,
            }}
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            cursor: saving || !dirty ? 'not-allowed' : 'pointer',
            background: 'rgba(59,130,246,0.15)',
            color: 'var(--accent-blue)',
            fontSize: 13,
            fontWeight: 600,
            opacity: saving || !dirty ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Reset button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={doReset}
          disabled={!locked || resetting}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            cursor: !locked || resetting ? 'not-allowed' : 'pointer',
            background: locked ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            color: locked ? 'var(--accent-red)' : 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 600,
            opacity: !locked || resetting ? 0.5 : 1,
          }}
        >
          {resetting ? 'Resetting…' : 'Reset Kill Switch'}
        </button>
        {state?.tripped_at && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Tripped at {fmtTime(state.tripped_at)} @ PnL {fmtINR(state.tripped_pnl)}
          </span>
        )}
      </div>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 6,
            background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: 12,
            color: msg.ok ? 'var(--accent-green)' : 'var(--accent-red)',
          }}
        >
          {msg.text}
        </div>
      )}

      {state?.last_error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--accent-red)',
            opacity: 0.85,
          }}
        >
          Last watchdog error: {state.last_error}
        </div>
      )}

      {loading && !state && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
      )}
    </div>
  );
}
