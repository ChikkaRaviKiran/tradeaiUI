import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBrokerStatus,
  testBrokerConnection,
  updateBrokerCredentials,
  reAuthenticateBroker,
  fetchTradingAccount,
  setTradingAccount,
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
