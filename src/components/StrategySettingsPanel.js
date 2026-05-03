import React, { useCallback, useEffect, useState } from 'react';
import { fetchAtlStraddleSettings, placeNowAtm, updateAtlStraddleSettings } from '../api';

const DEFAULTS = {
  enabled: false,
  strategy_type: 'ATM_STRADDLE',
  index: 'NIFTY',
  trading_day: 'Daily',
  entry_time: '09:20',
  exit_time: '15:15',
  strike_mode: 'ATM',
  lots: 1,
  strike_interval: 50,
  offset_points: 500,
  rolling_points: 300,
  sl_type: 'premium_pct',
  sl_lower: 0,
  sl_upper: 0,
  first_straddle_sl_pct: 100,
  reform_straddle_sl_pct: 60,
  hedge_enabled: false,
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

  const saveWith = async (patch = {}) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const next = { ...form, ...patch };
      const merged = { ...next };
      if (merged.sl_type === 'spot') {
        merged.first_straddle_sl_pct = 100;
        merged.reform_straddle_sl_pct = Math.max(1, num(merged.reform_straddle_sl_pct, 60));
      } else {
        merged.sl_lower = 0;
        merged.sl_upper = 0;
      }

      const payload = {
        ...merged,
        strategy_type: 'ATM_STRADDLE',
        lots: Math.max(1, num(merged.lots, 1)),
        strike_interval: Math.max(1, num(merged.strike_interval, 50)),
        offset_points: Math.max(1, num(merged.offset_points, 500)),
        rolling_points: Math.max(1, num(merged.rolling_points, 300)),
        sl_lower: Math.max(0, num(merged.sl_lower, 0)),
        sl_upper: Math.max(0, num(merged.sl_upper, 0)),
        first_straddle_sl_pct: Math.max(1, num(merged.first_straddle_sl_pct, 100)),
        reform_straddle_sl_pct: Math.max(1, num(merged.reform_straddle_sl_pct, 60)),
        hedge_enabled: !!merged.hedge_enabled,
        hedge_premium: Math.max(1, num(merged.hedge_premium, 3)),
        hedge_lots: Math.max(0, num(merged.hedge_lots, 0)),
      };
      const res = await updateAtlStraddleSettings(payload);
      setForm({ ...DEFAULTS, ...(res?.data?.settings || payload) });
      setMessage('ATL Straddle settings saved');
    } catch {
      setError('Failed to save ATL Straddle settings');
    }
    setSaving(false);
  };

  const onSave = async (e) => {
    e.preventDefault();
    await saveWith();
  };

  return (
    <div className="section">
      <h2 className="section-title">Strategy Instances</h2>
      <p style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
        Each strategy can run on multiple accounts with different configurations.
      </p>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>ATL Straddle Instance</div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        ) : (
          <form onSubmit={onSave} className="instance-form">
            <div className="instance-row">
              <div className="instance-label">Strategy</div>
              <div className="instance-grid instance-grid-5">
                <label className="atl-field">
                  <span>Type</span>
                  <select value="ATM Straddle" disabled>
                    <option>ATM Straddle</option>
                  </select>
                  <small className="atl-help">ATL Straddle with at-strike conversion.</small>
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
                  <span>Day</span>
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
                  <span>Adj Pts</span>
                  <input type="number" min="1" value={form.rolling_points} onChange={(e) => setForm((s) => ({ ...s, rolling_points: e.target.value }))} />
                </label>
                <label className="atl-field">
                  <span>Strike Int</span>
                  <input type="number" min="1" value={form.strike_interval} onChange={(e) => setForm((s) => ({ ...s, strike_interval: e.target.value }))} />
                </label>
              </div>
            </div>

            <div className="instance-row">
              <div className="instance-label">Stop Loss</div>
              <div className="instance-grid instance-grid-4">
                <label className="atl-field">
                  <span>SL Type</span>
                  <select value={form.sl_type} onChange={(e) => setForm((s) => ({ ...s, sl_type: e.target.value }))}>
                    <option value="premium_pct">Premium %</option>
                    <option value="spot">Spot Level</option>
                  </select>
                </label>
                {form.sl_type === 'spot' ? (
                  <>
                    <label className="atl-field">
                      <span>SL Lower</span>
                      <input type="number" min="0" value={form.sl_lower} onChange={(e) => setForm((s) => ({ ...s, sl_lower: e.target.value }))} />
                    </label>
                    <label className="atl-field">
                      <span>SL Upper</span>
                      <input type="number" min="0" value={form.sl_upper} onChange={(e) => setForm((s) => ({ ...s, sl_upper: e.target.value }))} />
                    </label>
                    <div className="atl-field atl-field-placeholder">
                      <span>Premium SL %</span>
                      <div className="atl-placeholder-text">Hidden for Spot SL mode</div>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="atl-field">
                      <span>Premium SL %</span>
                      <input type="number" min="1" value={form.first_straddle_sl_pct} onChange={(e) => setForm((s) => ({ ...s, first_straddle_sl_pct: e.target.value }))} />
                    </label>
                    <label className="atl-field">
                      <span>Reform SL %</span>
                      <input type="number" min="1" value={form.reform_straddle_sl_pct} onChange={(e) => setForm((s) => ({ ...s, reform_straddle_sl_pct: e.target.value }))} />
                    </label>
                    <div className="atl-field atl-field-placeholder">
                      <span>SL Lower / Upper</span>
                      <div className="atl-placeholder-text">Hidden for Premium % mode</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="instance-row">
              <div className="instance-label">Hedge</div>
              <div className="instance-grid instance-grid-4">
                <label className="atl-field">
                  <span>Hedge Type</span>
                  <select
                    value={form.hedge_enabled ? 'otm' : 'none'}
                    onChange={(e) => setForm((s) => ({ ...s, hedge_enabled: e.target.value === 'otm' }))}
                  >
                    <option value="none">Disabled</option>
                    <option value="otm">OTM Protection</option>
                  </select>
                </label>
                {form.hedge_enabled ? (
                  <>
                    <label className="atl-field">
                      <span>Target Premium (₹)</span>
                      <input type="number" min="1" value={form.hedge_premium} onChange={(e) => setForm((s) => ({ ...s, hedge_premium: e.target.value }))} />
                    </label>
                    <label className="atl-field">
                      <span>Hedge Lots</span>
                      <input type="number" min="0" value={form.hedge_lots} onChange={(e) => setForm((s) => ({ ...s, hedge_lots: e.target.value }))} />
                      <small className="atl-help">0 = match strategy lots</small>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="atl-field atl-field-placeholder">
                      <span>Target Premium (₹)</span>
                      <div className="atl-placeholder-text">Hidden while hedge is disabled</div>
                    </div>
                    <div className="atl-field atl-field-placeholder">
                      <span>Hedge Lots</span>
                      <div className="atl-placeholder-text">Hidden while hedge is disabled</div>
                    </div>
                  </>
                )}
                <label className="atl-field">
                  <span>Offset Pts</span>
                  <input type="number" min="1" value={form.offset_points} onChange={(e) => setForm((s) => ({ ...s, offset_points: e.target.value }))} />
                </label>
              </div>
            </div>

            <div className="instance-row">
              <div className="instance-label">Execution</div>
              <div className="instance-grid instance-grid-5">
                <label className="atl-field">
                  <span>Account</span>
                  <select value={form.execution_account} onChange={(e) => setForm((s) => ({ ...s, execution_account: e.target.value }))}>
                    <option value="Primary">Primary Account</option>
                    <option value="Paper">Paper Trading</option>
                  </select>
                </label>
                <label className="atl-field">
                  <span>Entry</span>
                  <input type="time" value={form.entry_time} onChange={(e) => setForm((s) => ({ ...s, entry_time: e.target.value }))} />
                </label>
                <label className="atl-field">
                  <span>Exit</span>
                  <input type="time" value={form.exit_time} onChange={(e) => setForm((s) => ({ ...s, exit_time: e.target.value }))} />
                </label>
                <label className="atl-field">
                  <span>Mode</span>
                  <select value={form.strike_mode} onChange={(e) => setForm((s) => ({ ...s, strike_mode: e.target.value }))}>
                    <option value="ATM">ATM</option>
                    <option value="ITM">ITM</option>
                  </select>
                </label>
                <label className="atl-field">
                  <span>Lots</span>
                  <input type="number" min="1" value={form.lots} onChange={(e) => setForm((s) => ({ ...s, lots: e.target.value }))} />
                </label>
              </div>
            </div>

            <div className="instance-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </button>
              <button
                className="btn btn-start"
                type="button"
                disabled={saving}
                onClick={async () => {
                  await saveWith({ enabled: true });
                  try {
                    await placeNowAtm();
                    setMessage('ATL saved and armed for immediate entry');
                  } catch {
                    setError('Saved, but failed to arm immediate entry');
                  }
                }}
              >
                {saving ? 'Saving...' : 'Create & Place Now'}
              </button>
              <button className="btn" type="button" onClick={load} disabled={saving}>
                Reload
              </button>
              <button className="btn btn-stop" type="button" disabled={saving} onClick={() => setForm((s) => ({ ...s, enabled: false }))}>
                Cancel
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
