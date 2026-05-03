import React, { useCallback, useEffect, useState } from 'react';
import { fetchAtlStraddleSettings, updateAtlStraddleSettings } from '../api';

const READ_ONLY_STRATEGIES = [
  'Move Detection',
  'PDH/PDL Breakout',
];

const DEFAULTS = {
  enabled: false,
  index: 'NIFTY',
  entry_time: '09:20',
  exit_time: '15:15',
  lots: 1,
  strike_interval: 50,
  offset_points: 500,
  rolling_points: 300,
  first_straddle_sl_pct: 100,
  reform_straddle_sl_pct: 60,
  hedge_enabled: false,
  hedge_premium: 3,
  hedge_lots: 0,
};

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function StrategySettingsPanel() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAtlStraddleSettings();
      setForm({ ...DEFAULTS, ...(res?.data || {}) });
    } catch {
      setError('Failed to load ATL Straddle settings');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        lots: Math.max(1, num(form.lots, 1)),
        strike_interval: Math.max(1, num(form.strike_interval, 50)),
        offset_points: Math.max(1, num(form.offset_points, 500)),
        rolling_points: Math.max(1, num(form.rolling_points, 300)),
        first_straddle_sl_pct: Math.max(1, num(form.first_straddle_sl_pct, 100)),
        reform_straddle_sl_pct: Math.max(1, num(form.reform_straddle_sl_pct, 60)),
        hedge_enabled: !!form.hedge_enabled,
        hedge_premium: Math.max(1, num(form.hedge_premium, 3)),
        hedge_lots: Math.max(0, num(form.hedge_lots, 0)),
      };
      const res = await updateAtlStraddleSettings(payload);
      setForm({ ...DEFAULTS, ...(res?.data?.settings || payload) });
      setMessage('ATL Straddle settings saved');
    } catch {
      setError('Failed to save ATL Straddle settings');
    }
    setSaving(false);
  };

  return (
    <div className="section">
      <h2 className="section-title">Strategy Settings</h2>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Current Strategies (Read-Only)</div>
        <div className="readonly-strategy-grid">
          {READ_ONLY_STRATEGIES.map((name) => (
            <div key={name} className="readonly-strategy-pill">{name}</div>
          ))}
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
          Existing strategy behavior remains unchanged. This page only configures ATL Straddle.
        </p>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>ATL Straddle (At-Strike Trigger)</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Reference logic: short strangle, at-strike conversion to straddle, SL on straddle premium, and reform on SL breach.
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        ) : (
          <form onSubmit={onSave} className="atl-form-grid">
            <label className="atl-field atl-toggle">
              <span>Enable ATL Straddle</span>
              <input
                type="checkbox"
                checked={!!form.enabled}
                onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
              />
            </label>

            <label className="atl-field">
              <span>Index</span>
              <select
                value={form.index}
                onChange={(e) => setForm((s) => ({ ...s, index: e.target.value }))}
              >
                <option value="NIFTY">NIFTY</option>
                <option value="BANKNIFTY">BANKNIFTY</option>
                <option value="SENSEX">SENSEX</option>
              </select>
            </label>

            <label className="atl-field">
              <span>Entry Time</span>
              <input
                type="time"
                value={form.entry_time}
                onChange={(e) => setForm((s) => ({ ...s, entry_time: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Exit Time</span>
              <input
                type="time"
                value={form.exit_time}
                onChange={(e) => setForm((s) => ({ ...s, exit_time: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Lots</span>
              <input
                type="number"
                min="1"
                value={form.lots}
                onChange={(e) => setForm((s) => ({ ...s, lots: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Strike Interval</span>
              <input
                type="number"
                min="1"
                value={form.strike_interval}
                onChange={(e) => setForm((s) => ({ ...s, strike_interval: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Offset Points</span>
              <input
                type="number"
                min="1"
                value={form.offset_points}
                onChange={(e) => setForm((s) => ({ ...s, offset_points: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Rolling Points</span>
              <input
                type="number"
                min="1"
                value={form.rolling_points}
                onChange={(e) => setForm((s) => ({ ...s, rolling_points: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>First Straddle SL %</span>
              <input
                type="number"
                min="1"
                value={form.first_straddle_sl_pct}
                onChange={(e) => setForm((s) => ({ ...s, first_straddle_sl_pct: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Reform Straddle SL %</span>
              <input
                type="number"
                min="1"
                value={form.reform_straddle_sl_pct}
                onChange={(e) => setForm((s) => ({ ...s, reform_straddle_sl_pct: e.target.value }))}
              />
            </label>

            <label className="atl-field atl-toggle">
              <span>Enable Hedge</span>
              <input
                type="checkbox"
                checked={!!form.hedge_enabled}
                onChange={(e) => setForm((s) => ({ ...s, hedge_enabled: e.target.checked }))}
              />
            </label>

            <label className="atl-field">
              <span>Hedge Premium Target</span>
              <input
                type="number"
                min="1"
                value={form.hedge_premium}
                onChange={(e) => setForm((s) => ({ ...s, hedge_premium: e.target.value }))}
              />
            </label>

            <label className="atl-field">
              <span>Hedge Lots (0 = same as lots)</span>
              <input
                type="number"
                min="0"
                value={form.hedge_lots}
                onChange={(e) => setForm((s) => ({ ...s, hedge_lots: e.target.value }))}
              />
            </label>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-start" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save ATL Settings'}
              </button>
              <button className="btn" type="button" onClick={load} disabled={saving}>
                Reload
              </button>
              {message && <span style={{ color: 'var(--accent-green)', fontSize: 12 }}>{message}</span>}
              {error && <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>{error}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
