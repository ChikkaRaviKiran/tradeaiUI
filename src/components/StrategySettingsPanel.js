import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAtlStraddleSettings,
  fetchMoveDetExecSettings,
  fetchPdhPdlExecSettings,
  placeNowAtm,
  updateAtlStraddleSettings,
  updateMoveDetExecSettings,
  updatePdhPdlExecSettings,
} from '../api';

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
  hedge_mode: 'none',
  hedge_enabled: false,
  hedge_premium: 3,
  hedge_otm_points: 500,
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
      if (merged.sl_type === 'none') {
        merged.sl_lower = 0;
        merged.sl_upper = 0;
      } else if (merged.sl_type === 'spot') {
        merged.first_straddle_sl_pct = 100;
        merged.reform_straddle_sl_pct = Math.max(1, num(merged.reform_straddle_sl_pct, 60));
      } else {
        merged.sl_lower = 0;
        merged.sl_upper = 0;
      }

      const hedgeMode = String(merged.hedge_mode || 'none');
      merged.hedge_mode = hedgeMode;
      merged.hedge_enabled = hedgeMode !== 'none';
      if (hedgeMode === 'premium') {
        merged.hedge_otm_points = 500;
      } else if (hedgeMode === 'otm_points') {
        merged.hedge_premium = 3;
      } else {
        merged.hedge_lots = 0;
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
        hedge_mode: merged.hedge_mode,
        hedge_enabled: !!merged.hedge_enabled,
        hedge_premium: Math.max(1, num(merged.hedge_premium, 3)),
        hedge_otm_points: Math.max(1, num(merged.hedge_otm_points, 500)),
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
              <div className="instance-grid instance-grid-6">
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
                <label className="atl-field">
                  <span>Offset Pts</span>
                  <input type="number" min="1" value={form.offset_points} onChange={(e) => setForm((s) => ({ ...s, offset_points: e.target.value }))} />
                  <small className="atl-help">Short strangle distance from ATM (strategy-level setting)</small>
                </label>
              </div>
            </div>

            <div className="instance-row">
              <div className="instance-label">Stop Loss</div>
              <div className="instance-grid instance-grid-4">
                <label className="atl-field">
                  <span>SL Type</span>
                  <select value={form.sl_type} onChange={(e) => setForm((s) => ({ ...s, sl_type: e.target.value }))}>
                    <option value="none">None</option>
                    <option value="premium_pct">Premium %</option>
                    <option value="spot">Spot Level</option>
                  </select>
                </label>
                {form.sl_type === 'none' ? (
                  <div className="atl-field atl-field-placeholder" style={{ gridColumn: '2 / 5' }}>
                    <span>Stop Loss</span>
                    <div className="atl-placeholder-text">All stop-loss fields hidden for None mode</div>
                  </div>
                ) : form.sl_type === 'spot' ? (
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
                    value={form.hedge_mode || (form.hedge_enabled ? 'premium' : 'none')}
                    onChange={(e) => setForm((s) => ({
                      ...s,
                      hedge_mode: e.target.value,
                      hedge_enabled: e.target.value !== 'none',
                    }))}
                  >
                    <option value="none">Disabled</option>
                    <option value="premium">Premium Target</option>
                    <option value="otm_points">OTM Points</option>
                  </select>
                </label>
                {(form.hedge_mode || 'none') === 'premium' ? (
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
                    <div className="atl-field atl-field-placeholder">
                      <span>OTM Points</span>
                      <div className="atl-placeholder-text">Hidden for Premium Target mode</div>
                    </div>
                  </>
                ) : (form.hedge_mode || 'none') === 'otm_points' ? (
                  <>
                    <label className="atl-field">
                      <span>OTM Points</span>
                      <input type="number" min="1" value={form.hedge_otm_points || 500} onChange={(e) => setForm((s) => ({ ...s, hedge_otm_points: e.target.value }))} />
                    </label>
                    <label className="atl-field">
                      <span>Hedge Lots</span>
                      <input type="number" min="0" value={form.hedge_lots} onChange={(e) => setForm((s) => ({ ...s, hedge_lots: e.target.value }))} />
                      <small className="atl-help">0 = match strategy lots</small>
                    </label>
                    <div className="atl-field atl-field-placeholder">
                      <span>Target Premium (₹)</span>
                      <div className="atl-placeholder-text">Hidden for OTM Points mode</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="atl-field atl-field-placeholder">
                      <span>Hedge Inputs</span>
                      <div className="atl-placeholder-text">All hedge fields hidden for Disabled mode</div>
                    </div>
                    <div className="atl-field atl-field-placeholder">
                      <span>Hedge Inputs</span>
                      <div className="atl-placeholder-text">All hedge fields hidden for Disabled mode</div>
                    </div>
                    <div className="atl-field atl-field-placeholder">
                      <span>Hedge Inputs</span>
                      <div className="atl-placeholder-text">All hedge fields hidden for Disabled mode</div>
                    </div>
                  </>
                )}
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

      <ScannerExecCard
        title="Move Detection Instance"
        scanner="move_det"
        fetcher={fetchMoveDetExecSettings}
        updater={updateMoveDetExecSettings}
      />
      <ScannerExecCard
        title="PDH/PDL Breakout Instance"
        scanner="pdh_pdl"
        fetcher={fetchPdhPdlExecSettings}
        updater={updatePdhPdlExecSettings}
      />
    </div>
  );
}

const EXEC_DEFAULTS = {
  live_execution: false,
  lots_mode: 'auto',
  manual_lots: 1,
  max_funds: 150000,
  buffer_pct: 5,
  max_lots: 20,
};

function ScannerExecCard({ title, scanner, fetcher, updater }) {
  const [form, setForm] = useState(EXEC_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetcher();
      setForm({ ...EXEC_DEFAULTS, ...(res?.data || {}) });
    } catch {
      setErr('Failed to load settings');
    }
    setLoading(false);
  }, [fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const payload = {
        live_execution: !!form.live_execution,
        lots_mode: form.lots_mode === 'manual' ? 'manual' : 'auto',
        manual_lots: Math.max(1, num(form.manual_lots, 1)),
        max_funds: Math.max(0, num(form.max_funds, 150000)),
        buffer_pct: Math.max(0, num(form.buffer_pct, 5)),
        max_lots: Math.max(1, num(form.max_lots, 20)),
      };
      const res = await updater(payload);
      setForm({ ...EXEC_DEFAULTS, ...(res?.data?.settings || payload) });
      setMsg('Saved');
    } catch {
      setErr('Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-title" style={{ marginBottom: 8 }}>{title}</div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
      ) : (
        <form onSubmit={onSave} className="instance-form">
          <div className="instance-row">
            <div className="instance-label">Execution</div>
            <div className="instance-grid instance-grid-6">
              <label className="atl-field">
                <span>Live Orders</span>
                <select
                  value={form.live_execution ? 'on' : 'off'}
                  onChange={(e) => setForm((s) => ({ ...s, live_execution: e.target.value === 'on' }))}
                >
                  <option value="off">Disabled (alert only)</option>
                  <option value="on">Enabled</option>
                </select>
                <small className="atl-help">Requires global Live mode (not Paper).</small>
              </label>
              <label className="atl-field">
                <span>Lots Mode</span>
                <select
                  value={form.lots_mode}
                  onChange={(e) => setForm((s) => ({ ...s, lots_mode: e.target.value }))}
                >
                  <option value="auto">Auto by Available Funds</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              {form.lots_mode === 'manual' ? (
                <>
                  <label className="atl-field">
                    <span>Manual Lots</span>
                    <input
                      type="number"
                      min="1"
                      value={form.manual_lots}
                      onChange={(e) => setForm((s) => ({ ...s, manual_lots: e.target.value }))}
                    />
                  </label>
                  <div className="atl-field atl-field-placeholder">
                    <span>Max Funds (₹)</span>
                    <div className="atl-placeholder-text">Hidden in Manual mode</div>
                  </div>
                  <div className="atl-field atl-field-placeholder">
                    <span>Buffer %</span>
                    <div className="atl-placeholder-text">Hidden in Manual mode</div>
                  </div>
                </>
              ) : (
                <>
                  <label className="atl-field">
                    <span>Max Funds (₹)</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.max_funds}
                      onChange={(e) => setForm((s) => ({ ...s, max_funds: e.target.value }))}
                    />
                    <small className="atl-help">0 = use full available cash.</small>
                  </label>
                  <label className="atl-field">
                    <span>Buffer %</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.buffer_pct}
                      onChange={(e) => setForm((s) => ({ ...s, buffer_pct: e.target.value }))}
                    />
                    <small className="atl-help">Reserve for slippage / fees.</small>
                  </label>
                  <div className="atl-field atl-field-placeholder">
                    <span>Manual Lots</span>
                    <div className="atl-placeholder-text">Hidden in Auto mode</div>
                  </div>
                </>
              )}
              <label className="atl-field">
                <span>Max Lots Cap</span>
                <input
                  type="number"
                  min="1"
                  value={form.max_lots}
                  onChange={(e) => setForm((s) => ({ ...s, max_lots: e.target.value }))}
                />
                <small className="atl-help">Hard ceiling regardless of funds.</small>
              </label>
            </div>
          </div>
          <div className="instance-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn" type="button" onClick={load} disabled={saving}>
              Reload
            </button>
            {msg && <span style={{ color: 'var(--accent-green)', fontSize: 12 }}>{msg}</span>}
            {err && <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>{err}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
