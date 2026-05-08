import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAtlStraddleSettings,
  updateAtlStraddleSettings,
  fetchTradingAccount,
  placeNowAtm,
} from '../api';

const DEFAULTS = {
  enabled: false,
  index: 'NIFTY',
  trading_day: 'Daily',
  entry_time: '09:20',
  exit_time: '15:15',
  lots: 1,
  strike_interval: 50,
  rolling_points: 300,
  sl_type: 'premium_pct',
  sl_lower: 0,
  sl_upper: 0,
  first_straddle_sl_pct: 100,
  reform_straddle_sl_pct: 60,
  hedge_mode: 'none',
  hedge_premium: 3,
  hedge_lots: 0,
  execution_account: 'Primary',
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
  const [accountInfo, setAccountInfo] = useState({ active: 'angel', running: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAtlStraddleSettings();
      setForm((prev) => ({ ...prev, ...(res?.data || {}) }));
    } catch {
      setError('Failed to load ATM settings.');
    }

    try {
      const acc = await fetchTradingAccount();
      if (acc?.data) {
        setAccountInfo({
          active: acc.data.active || acc.data.selected || 'angel',
          running: !!acc.data.running,
        });
      }
    } catch {
      // non-fatal
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        strategy_type: 'ATM_STRADDLE',
        strike_mode: 'ATM',
        offset_points: 0,
        lots: Math.max(1, num(form.lots, 1)),
        strike_interval: Math.max(1, num(form.strike_interval, 50)),
        rolling_points: Math.max(1, num(form.rolling_points, 300)),
        sl_lower: Math.max(0, num(form.sl_lower, 0)),
        sl_upper: Math.max(0, num(form.sl_upper, 0)),
        first_straddle_sl_pct: Math.max(1, num(form.first_straddle_sl_pct, 100)),
        reform_straddle_sl_pct: Math.max(1, num(form.reform_straddle_sl_pct, 60)),
        hedge_mode: form.hedge_mode === 'none' ? 'none' : 'premium',
        hedge_enabled: form.hedge_mode !== 'none',
        hedge_premium: Math.max(1, num(form.hedge_premium, 3)),
        hedge_lots: Math.max(0, num(form.hedge_lots, 0)),
      };

      const res = await updateAtlStraddleSettings(payload);
      setForm((prev) => ({ ...prev, ...(res?.data?.settings || payload) }));
      setMessage('ATM settings saved successfully.');
    } catch {
      setError('Failed to save ATM settings.');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="card" style={{ marginTop: 12 }}>Loading strategy settings...</div>;
  }

  return (
    <section style={{ marginTop: 12 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>ATM Straddle Settings</div>

        <div className="grid grid-4" style={{ gap: 10 }}>
          <label className="atl-field">
            <span>Enabled</span>
            <select value={String(form.enabled)} onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="atl-field">
            <span>Index</span>
            <select value={form.index} onChange={(e) => setForm((s) => ({ ...s, index: e.target.value }))}>
              <option value="NIFTY">Nifty</option>
              <option value="BANKNIFTY">BankNifty</option>
              <option value="SENSEX">Sensex</option>
            </select>
          </label>

          <label className="atl-field">
            <span>Trading Day</span>
            <select value={form.trading_day} onChange={(e) => setForm((s) => ({ ...s, trading_day: e.target.value }))}>
              <option value="Daily">Daily</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
            </select>
          </label>

          <label className="atl-field">
            <span>Execution Account</span>
            <select value={form.execution_account} onChange={(e) => setForm((s) => ({ ...s, execution_account: e.target.value }))}>
              <option value="Primary">{`Primary (${(accountInfo.active || 'angel').toUpperCase()})${accountInfo.running ? '' : ' - idle'}`}</option>
              <option value="Live (Kite)">Live (Kite)</option>
              <option value="Live (Dhan)">Live (Dhan)</option>
              <option value="Live (Angel)">Live (Angel)</option>
              <option value="Paper">Paper</option>
            </select>
          </label>

          <label className="atl-field">
            <span>Entry Time</span>
            <input type="time" value={form.entry_time} onChange={(e) => setForm((s) => ({ ...s, entry_time: e.target.value }))} />
          </label>

          <label className="atl-field">
            <span>Exit Time</span>
            <input type="time" value={form.exit_time} onChange={(e) => setForm((s) => ({ ...s, exit_time: e.target.value }))} />
          </label>

          <label className="atl-field">
            <span>Lots</span>
            <input type="number" min="1" value={form.lots} onChange={(e) => setForm((s) => ({ ...s, lots: e.target.value }))} />
          </label>

          <label className="atl-field">
            <span>Strike Interval</span>
            <input type="number" min="1" value={form.strike_interval} onChange={(e) => setForm((s) => ({ ...s, strike_interval: e.target.value }))} />
          </label>

          <label className="atl-field">
            <span>Adjustment Points</span>
            <input type="number" min="1" value={form.rolling_points} onChange={(e) => setForm((s) => ({ ...s, rolling_points: e.target.value }))} />
          </label>

          <label className="atl-field">
            <span>SL Type</span>
            <select value={form.sl_type} onChange={(e) => setForm((s) => ({ ...s, sl_type: e.target.value }))}>
              <option value="none">None</option>
              <option value="premium_pct">Premium %</option>
              <option value="spot">Spot</option>
            </select>
          </label>

          {form.sl_type === 'spot' && (
            <>
              <label className="atl-field">
                <span>SL Lower</span>
                <input type="number" min="0" value={form.sl_lower} onChange={(e) => setForm((s) => ({ ...s, sl_lower: e.target.value }))} />
              </label>
              <label className="atl-field">
                <span>SL Upper</span>
                <input type="number" min="0" value={form.sl_upper} onChange={(e) => setForm((s) => ({ ...s, sl_upper: e.target.value }))} />
              </label>
            </>
          )}

          {form.sl_type === 'premium_pct' && (
            <>
              <label className="atl-field">
                <span>First Straddle SL %</span>
                <input type="number" min="1" value={form.first_straddle_sl_pct} onChange={(e) => setForm((s) => ({ ...s, first_straddle_sl_pct: e.target.value }))} />
              </label>
              <label className="atl-field">
                <span>Reform SL %</span>
                <input type="number" min="1" value={form.reform_straddle_sl_pct} onChange={(e) => setForm((s) => ({ ...s, reform_straddle_sl_pct: e.target.value }))} />
              </label>
            </>
          )}

          <label className="atl-field">
            <span>Hedge Mode</span>
            <select value={form.hedge_mode} onChange={(e) => setForm((s) => ({ ...s, hedge_mode: e.target.value }))}>
              <option value="none">Disabled</option>
              <option value="premium">Premium Target</option>
            </select>
          </label>

          {form.hedge_mode !== 'none' && (
            <>
              <label className="atl-field">
                <span>Hedge Premium</span>
                <input type="number" min="1" value={form.hedge_premium} onChange={(e) => setForm((s) => ({ ...s, hedge_premium: e.target.value }))} />
              </label>
              <label className="atl-field">
                <span>Hedge Lots (0=match)</span>
                <input type="number" min="0" value={form.hedge_lots} onChange={(e) => setForm((s) => ({ ...s, hedge_lots: e.target.value }))} />
              </label>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-start" disabled={saving} onClick={save}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            className="btn"
            onClick={async () => {
              try {
                await placeNowAtm();
                setMessage('ATM manual entry trigger sent.');
              } catch {
                setError('Failed to trigger ATM place-now.');
              }
            }}
          >
            Place ATM Now
          </button>
          <button className="btn" onClick={load}>Reload</button>
        </div>

        {message && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-green)' }}>{message}</div>}
        {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-red)' }}>{error}</div>}
      </div>
    </section>
  );
}
