import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBrokerStatus,
  testBrokerConnection,
  updateBrokerCredentials,
  reAuthenticateBroker,
  fetchTradingAccount,
  setTradingAccount,
  fetchKiteStatus,
  fetchKiteLoginUrl,
  updateKiteCredentials,
  fetchDhanStatus,
  testDhanConnection,
  updateDhanCredentials,
  refreshDhanInstruments,
} from '../api';

const STATUS_POLL_INTERVAL = 30000; // 30s

function BrokerSettings() {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [reAuthing, setReAuthing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tradingAccount, setTradingAccountState] = useState(null);
  const [taSwitching, setTaSwitching] = useState(false);
  const [taResult, setTaResult] = useState(null);
  const [kiteStatus, setKiteStatus] = useState(null);
  const [kiteCreds, setKiteCreds] = useState({ api_key: '', api_secret: '', proxy_url: '' });
  const [kiteSaving, setKiteSaving] = useState(false);
  const [kiteResult, setKiteResult] = useState(null);
  const [showKiteForm, setShowKiteForm] = useState(false);
  const [dhanStatus, setDhanStatus] = useState(null);
  const [dhanCreds, setDhanCreds] = useState({ client_id: '', access_token: '' });
  const [dhanSaving, setDhanSaving] = useState(false);
  const [dhanTesting, setDhanTesting] = useState(false);
  const [dhanResult, setDhanResult] = useState(null);
  const [showDhanForm, setShowDhanForm] = useState(false);
  const [dhanRefreshing, setDhanRefreshing] = useState(false);
  const [creds, setCreds] = useState({
    api_key: '',
    client_id: '',
    password: '',
    mpin: '',
    totp_secret: '',
  });

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetchBrokerStatus();
      setStatus(res.data);
    } catch {
      setStatus(null);
    }
    try {
      const ta = await fetchTradingAccount();
      setTradingAccountState(ta.data);
    } catch {
      setTradingAccountState(null);
    }
    try {
      const ks = await fetchKiteStatus();
      setKiteStatus(ks.data);
    } catch {
      setKiteStatus(null);
    }
    try {
      const ds = await fetchDhanStatus();
      setDhanStatus(ds.data);
    } catch {
      setDhanStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, STATUS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testBrokerConnection();
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ success: false, error: e?.response?.data?.detail || 'Connection failed' });
    }
    setTesting(false);
  };

  const handleReAuth = async () => {
    setReAuthing(true);
    setTestResult(null);
    try {
      const res = await reAuthenticateBroker();
      setTestResult(res.data);
      await loadStatus();
    } catch (e) {
      setTestResult({ success: false, error: e?.response?.data?.detail || 'Re-authentication failed' });
    }
    setReAuthing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(creds).filter(([, v]) => v.trim())
    );
    if (Object.keys(filled).length === 0) return;

    setSaving(true);
    setSaveResult(null);
    try {
      const res = await updateBrokerCredentials(filled);
      setSaveResult(res.data);
      setCreds({ api_key: '', client_id: '', password: '', mpin: '', totp_secret: '' });
      await loadStatus();
    } catch (e) {
      setSaveResult({ success: false, error: e?.response?.data?.detail || 'Update failed' });
    }
    setSaving(false);
  };

  const handleTradingAccountChange = async (account) => {
    if (!account || account === tradingAccount?.selected) return;
    setTaSwitching(true);
    setTaResult(null);
    try {
      const res = await setTradingAccount(account);
      setTaResult({ success: true, message: res.data?.message || 'Trading account updated' });
      await loadStatus();
    } catch (e) {
      setTaResult({
        success: false,
        error: e?.response?.data?.detail || 'Failed to switch trading account',
      });
    }
    setTaSwitching(false);
  };

  const handleKiteLogin = async () => {
    setKiteResult(null);
    try {
      const res = await fetchKiteLoginUrl();
      const url = res.data?.login_url;
      if (!url) {
        setKiteResult({ success: false, error: res.data?.message || 'Could not get login URL' });
        return;
      }
      // Open Kite OAuth in a new tab. After login, Kite redirects to
      // /api/auth/kite/callback which writes a fresh access_token to .env.
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setKiteResult({
        success: false,
        error: e?.response?.data?.detail || 'Failed to get Kite login URL',
      });
    }
  };

  const handleKiteSaveCreds = async (e) => {
    e.preventDefault();
    const filled = Object.fromEntries(
      // proxy_url may be intentionally cleared (empty string disables proxy)
      Object.entries(kiteCreds).filter(([k, v]) => k === 'proxy_url' || v.trim())
    );
    if (Object.keys(filled).length === 0) return;
    setKiteSaving(true);
    setKiteResult(null);
    try {
      const res = await updateKiteCredentials(filled);
      setKiteResult({ success: true, message: `Saved: ${res.data?.updated_fields?.join(', ')}` });
      setKiteCreds({ api_key: '', api_secret: '', proxy_url: '' });
      await loadStatus();
    } catch (e2) {
      setKiteResult({
        success: false,
        error: e2?.response?.data?.detail || 'Failed to save Kite credentials',
      });
    }
    setKiteSaving(false);
  };

  const handleDhanTest = async () => {
    setDhanTesting(true);
    setDhanResult(null);
    try {
      const res = await testDhanConnection();
      setDhanResult(res.data);
    } catch (e) {
      setDhanResult({
        success: false,
        error: e?.response?.data?.detail || 'Dhan test failed',
      });
    }
    setDhanTesting(false);
  };

  const handleDhanSaveCreds = async (e, opts = {}) => {
    if (e && e.preventDefault) e.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(dhanCreds).filter(([, v]) => v.trim())
    );
    if (Object.keys(filled).length === 0 && !opts.activate) return;
    if (opts.activate) filled.activate = true;
    setDhanSaving(true);
    setDhanResult(null);
    try {
      const res = await updateDhanCredentials(filled);
      setDhanResult({
        success: true,
        message: res.data?.note
          ? `${(res.data.updated_fields || []).join(', ')} — ${res.data.note}`
          : `Saved: ${(res.data.updated_fields || []).join(', ')}`,
      });
      setDhanCreds({ client_id: '', access_token: '' });
      await loadStatus();
    } catch (e2) {
      setDhanResult({
        success: false,
        error: e2?.response?.data?.detail || 'Failed to save Dhan credentials',
      });
    }
    setDhanSaving(false);
  };

  const handleDhanRefreshInstruments = async () => {
    setDhanRefreshing(true);
    setDhanResult(null);
    try {
      const res = await refreshDhanInstruments();
      if (res.data?.ok) {
        setDhanResult({
          success: true,
          message: `Scrip master reloaded: ${res.data.instruments_loaded} instruments`,
        });
      } else {
        setDhanResult({
          success: false,
          error: res.data?.error || 'Refresh failed',
        });
      }
    } catch (e) {
      setDhanResult({
        success: false,
        error: e?.response?.data?.detail || 'Refresh failed',
      });
    }
    setDhanRefreshing(false);
  };

  // Detect successful Kite OAuth completion (callback redirects with
  // ?kite_auth=success or ?kite_auth_error=...) and refresh status.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ok = params.get('kite_auth');
    const err = params.get('kite_auth_error');
    if (ok === 'success') {
      setKiteResult({ success: true, message: `Kite authenticated (user_id=${params.get('user_id') || ''})` });
      loadStatus();
      // Clean URL so refreshing the page doesn't re-show the toast.
      window.history.replaceState({}, '', window.location.pathname);
    } else if (err) {
      setKiteResult({ success: false, error: `Kite OAuth failed: ${err}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus]);

  const authOk = status?.authenticated;
  const configured = status?.configured;

  return (
    <div>
      {/* Trading Account Selector (Angel vs Kite) */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 6 }}>Trading Account</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Choose which broker places orders. All other strategy logic, expiry handling and
          conditions stay the same. Data feed continues to use AngelOne in both modes.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'angel', label: 'AngelOne (SmartAPI)' },
            { id: 'kite', label: 'Zerodha Kite' },
            { id: 'dhan', label: 'Dhan' },
          ].map((opt) => {
            const selected = tradingAccount?.selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleTradingAccountChange(opt.id)}
                disabled={taSwitching || tradingAccount?.running || selected}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selected || tradingAccount?.running ? 'default' : 'pointer',
                  border: selected
                    ? '1px solid var(--accent-blue)'
                    : '1px solid var(--border-light)',
                  background: selected ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: selected ? 'var(--accent-blue)' : 'var(--text-primary)',
                  opacity: tradingAccount?.running && !selected ? 0.5 : 1,
                }}
              >
                {selected ? '● ' : ''}{opt.label}
              </button>
            );
          })}
          {taSwitching && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving…</span>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Active broker: <strong>{tradingAccount?.active || 'unknown'}</strong>
          {tradingAccount?.restart_required && (
            <span style={{ color: 'var(--accent-yellow)', marginLeft: 8 }}>
              ⚠ Restart the system for the change to take effect.
            </span>
          )}
          {tradingAccount?.running && (
            <span style={{ color: 'var(--accent-yellow)', marginLeft: 8 }}>
              System is running — stop it before changing accounts.
            </span>
          )}
        </div>
        {taResult && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: taResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${taResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: taResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {taResult.success ? taResult.message : taResult.error}
          </div>
        )}
      </div>

      {/* Kite (Zerodha) Card — daily login + credentials */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>Zerodha Kite</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Kite access tokens expire daily around 07:30 IST. Re-login each
              morning before market open to refresh the token.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowKiteForm(!showKiteForm); setKiteResult(null); }}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-light)', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-secondary)',
              }}
            >
              {showKiteForm ? 'Cancel' : 'Edit Credentials'}
            </button>
            <button
              onClick={handleKiteLogin}
              disabled={!kiteStatus?.api_key_set || !kiteStatus?.api_secret_set}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)',
                opacity: !kiteStatus?.api_key_set || !kiteStatus?.api_secret_set ? 0.5 : 1,
              }}
            >
              Login to Kite
            </button>
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: kiteStatus?.authenticated
              ? 'var(--accent-green)'
              : kiteStatus?.access_token_set ? 'var(--accent-yellow)' : 'var(--accent-red)',
            boxShadow: `0 0 6px ${kiteStatus?.authenticated ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {kiteStatus?.authenticated
              ? `Connected — ${kiteStatus.user_name || kiteStatus.user_id || 'user'}`
              : kiteStatus?.access_token_set
                ? 'Token set — not validated (login again if expired)'
                : 'Not Authenticated — Login required'}
          </span>
        </div>

        {/* Credential checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
          <CredField label="API Key" set={kiteStatus?.api_key_set} />
          <CredField label="API Secret" set={kiteStatus?.api_secret_set} />
          <CredField label="Access Token" set={kiteStatus?.access_token_set} />
        </div>

        {showKiteForm && (
          <form onSubmit={handleKiteSaveCreds} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--accent-yellow)', marginBottom: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
              Get these from your Kite Connect developer console at developers.kite.trade.
              System must be stopped before changing credentials.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CredInput label="API Key" value={kiteCreds.api_key} onChange={(v) => setKiteCreds({ ...kiteCreds, api_key: v })} placeholder="Kite Connect API key" />
              <CredInput label="API Secret" value={kiteCreds.api_secret} onChange={(v) => setKiteCreds({ ...kiteCreds, api_secret: v })} placeholder="Kite Connect API secret" type="password" />
            </div>
            <div style={{ marginTop: 12 }}>
              <CredInput
                label="Outbound Proxy URL (optional)"
                value={kiteCreds.proxy_url}
                onChange={(v) => setKiteCreds({ ...kiteCreds, proxy_url: v })}
                placeholder="socks5://user:pass@host:1080  (leave empty to disable)"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Current: {kiteStatus?.proxy_enabled ? (kiteStatus?.proxy_url?.replace(/\/\/[^@]*@/, '//***:***@') || 'set') : 'direct (no proxy)'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="submit"
                disabled={kiteSaving || !Object.values(kiteCreds).some((v) => v.trim())}
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                  opacity: kiteSaving || !Object.values(kiteCreds).some((v) => v.trim()) ? 0.5 : 1,
                }}
              >
                {kiteSaving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </form>
        )}

        {kiteResult && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: kiteResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${kiteResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: kiteResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {kiteResult.success ? kiteResult.message : kiteResult.error}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>Daily flow:</strong> Click "Login to Kite" → log in on Zerodha (with TOTP) →
          you'll be redirected back here automatically with a fresh token persisted to .env.
          No system restart needed; the broker reloads the new token in-place.
        </div>
      </div>

      {/* Dhan Card — daily access-token rotation + activation */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>Dhan</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Dhan access tokens expire daily. Paste a fresh token from the Dhan
              dashboard each morning — it hot-reloads without a restart.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowDhanForm(!showDhanForm); setDhanResult(null); }}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-light)', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-secondary)',
              }}
            >
              {showDhanForm ? 'Cancel' : 'Edit Credentials'}
            </button>
            <button
              onClick={handleDhanRefreshInstruments}
              disabled={dhanRefreshing || dhanStatus?.active_broker !== 'Dhan'}
              title={dhanStatus?.active_broker !== 'Dhan' ? 'Activate Dhan and restart first' : ''}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-light)', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-secondary)',
                opacity: dhanRefreshing || dhanStatus?.active_broker !== 'Dhan' ? 0.5 : 1,
              }}
            >
              {dhanRefreshing ? 'Refreshing…' : 'Refresh Scrip Master'}
            </button>
            <button
              onClick={handleDhanTest}
              disabled={dhanTesting || !dhanStatus?.client_id_set || !dhanStatus?.access_token_set}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                opacity: dhanTesting || !dhanStatus?.client_id_set || !dhanStatus?.access_token_set ? 0.5 : 1,
              }}
            >
              {dhanTesting ? 'Testing…' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: dhanStatus?.authenticated
              ? 'var(--accent-green)'
              : dhanStatus?.access_token_set ? 'var(--accent-yellow)' : 'var(--accent-red)',
            boxShadow: `0 0 6px ${dhanStatus?.authenticated ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {dhanStatus?.authenticated
              ? `Connected${dhanStatus.available_balance != null ? ` — ₹${Number(dhanStatus.available_balance).toLocaleString('en-IN')} available` : ''}`
              : dhanStatus?.access_token_set
                ? (dhanStatus?.active_broker === 'Dhan'
                    ? 'Token set — auth failed (likely expired, paste a fresh one)'
                    : 'Token set — Dhan not active (activate + restart to validate)')
                : 'Not Authenticated — credentials missing'}
          </span>
        </div>

        {dhanStatus?.error && (
          <div style={{ fontSize: 11, color: 'var(--accent-red)', marginBottom: 10 }}>
            {dhanStatus.error}
          </div>
        )}

        {/* Credential checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
          <CredField label="Client ID" set={dhanStatus?.client_id_set} value={dhanStatus?.client_id} />
          <CredField label="Access Token" set={dhanStatus?.access_token_set} />
        </div>

        {showDhanForm && (
          <form onSubmit={handleDhanSaveCreds} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--accent-yellow)', marginBottom: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
              Generate a fresh access token at <a href="https://web.dhan.co" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>web.dhan.co</a> → My Profile → DhanHQ Trading APIs.
              Tokens rotate every morning; saving here hot-reloads the broker (no restart).
              The system must be stopped before changing credentials.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CredInput label="Client ID" value={dhanCreds.client_id} onChange={(v) => setDhanCreds({ ...dhanCreds, client_id: v })} placeholder="Dhan client ID (e.g. 1100123456)" />
              <CredInput label="Access Token" value={dhanCreds.access_token} onChange={(v) => setDhanCreds({ ...dhanCreds, access_token: v })} placeholder="JWT access token" type="password" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={(e) => handleDhanSaveCreds(e, { activate: true })}
                disabled={dhanSaving}
                title="Saves credentials AND switches TRADING_ACCOUNT=dhan (restart required)"
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--border-light)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--accent-yellow)',
                  opacity: dhanSaving ? 0.5 : 1,
                }}
              >
                Save & Activate Dhan
              </button>
              <button
                type="submit"
                disabled={dhanSaving || !Object.values(dhanCreds).some((v) => v.trim())}
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                  opacity: dhanSaving || !Object.values(dhanCreds).some((v) => v.trim()) ? 0.5 : 1,
                }}
              >
                {dhanSaving ? 'Saving…' : 'Save Credentials'}
              </button>
            </div>
          </form>
        )}

        {dhanResult && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: dhanResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${dhanResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: dhanResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {dhanResult.success
              ? (dhanResult.message
                  || (dhanResult.available_balance != null
                      ? `Connected — ₹${Number(dhanResult.available_balance).toLocaleString('en-IN')} available`
                      : 'Connection Successful'))
              : dhanResult.error}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>Daily flow:</strong> 1) Generate token in Dhan dashboard. 2) Click "Edit Credentials"
          → paste token → "Save Credentials" (broker hot-reloads). 3) "Test Connection" to verify.
          Use "Save & Activate Dhan" only the first time to switch <code>TRADING_ACCOUNT=dhan</code> (restart required).
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>AngelOne SmartAPI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: authOk ? 'var(--accent-green)' : configured ? 'var(--accent-yellow)' : 'var(--accent-red)',
                boxShadow: `0 0 6px ${authOk ? 'var(--accent-green)' : configured ? 'var(--accent-yellow)' : 'var(--accent-red)'}`,
              }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {authOk ? 'Connected' : configured ? 'Configured — Not Authenticated' : 'Not Configured'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReAuth}
              disabled={reAuthing || !configured}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-light)', cursor: 'pointer',
                background: 'transparent', color: 'var(--accent-blue)',
                opacity: reAuthing || !configured ? 0.5 : 1,
              }}
            >
              {reAuthing ? 'Authenticating...' : 'Re-Authenticate'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !configured}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                opacity: testing || !configured ? 0.5 : 1,
              }}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Credential checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, margin: '8px 0 12px' }}>
          <CredField label="API Key" set={status?.api_key_set} />
          <CredField label="Client ID" set={status?.client_id_set} value={status?.client_id} />
          <CredField label="MPIN" set={status?.mpin_set} />
          <CredField label="TOTP Secret" set={status?.totp_secret_set} />
        </div>

        {/* Auth details */}
        {status?.last_auth && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Last authenticated: {new Date(status.last_auth).toLocaleString('en-IN')}
            {status.token_age_minutes != null && (
              <span> ({status.token_age_minutes} min ago{status.token_stale ? ' — stale' : ''})</span>
            )}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 6,
            background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: testResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </span>
            {testResult.error && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{testResult.error}</div>
            )}
            {testResult.message && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{testResult.message}</div>
            )}
          </div>
        )}
      </div>

      {/* Update Credentials Card */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? 16 : 0 }}>
          <div>
            <div className="card-title">Update Credentials</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Update your SmartAPI credentials. System must be stopped first.
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setSaveResult(null); }}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border-light)', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-secondary)',
            }}
          >
            {showForm ? 'Cancel' : 'Edit Credentials'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSave}>
            <div style={{ fontSize: 12, color: 'var(--accent-yellow)', marginBottom: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
              Only fill in fields you want to change. Empty fields will be left unchanged.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CredInput label="API Key" value={creds.api_key} onChange={(v) => setCreds({ ...creds, api_key: v })} placeholder="Your SmartAPI key" />
              <CredInput label="Client ID" value={creds.client_id} onChange={(v) => setCreds({ ...creds, client_id: v })} placeholder="e.g. D12345" />
              <CredInput label="Password" value={creds.password} onChange={(v) => setCreds({ ...creds, password: v })} placeholder="Trading password" type="password" />
              <CredInput label="MPIN" value={creds.mpin} onChange={(v) => setCreds({ ...creds, mpin: v })} placeholder="4-digit MPIN" type="password" />
              <CredInput label="TOTP Secret" value={creds.totp_secret} onChange={(v) => setCreds({ ...creds, totp_secret: v })} placeholder="Base32 TOTP secret" style={{ gridColumn: 'span 2' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="submit"
                disabled={saving || !Object.values(creds).some((v) => v.trim())}
                style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                  opacity: saving || !Object.values(creds).some((v) => v.trim()) ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save & Update'}
              </button>
            </div>

            {saveResult && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 6,
                background: saveResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${saveResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: saveResult.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {saveResult.success
                    ? `Updated: ${saveResult.updated_fields?.join(', ')}`
                    : saveResult.error || 'Update failed'}
                </span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Help section */}
      <div className="card" style={{ padding: 16, marginTop: 16, borderLeft: '3px solid var(--accent-blue)' }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Troubleshooting</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong>Auth fails after working previously?</strong> — AngelOne may have reset your app. Go to <a href="https://smartapi.angelone.in/publisher" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>SmartAPI Dashboard</a> and re-create/verify your app to get a new API key.</div>
          <div style={{ marginTop: 6 }}><strong>Invalid TOTP?</strong> — Ensure your TOTP secret matches the one linked to your AngelOne account. Re-scan the QR code if needed.</div>
          <div style={{ marginTop: 6 }}><strong>Session expired errors (AB1004/AB1010)?</strong> — The system auto-retries these. Click "Re-Authenticate" to force a fresh login.</div>
        </div>
      </div>
    </div>
  );
}

function CredField({ label, set, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      background: set ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
      borderRadius: 6, fontSize: 12,
    }}>
      <span style={{ color: set ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
        {set ? '✓' : '✗'}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {value && <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{value}</span>}
    </div>
  );
}

function CredInput({ label, value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6,
          border: '1px solid var(--border-light)', background: 'var(--bg-secondary)',
          color: 'var(--text-primary)', fontSize: 13, outline: 'none',
        }}
      />
    </div>
  );
}

export default BrokerSettings;
