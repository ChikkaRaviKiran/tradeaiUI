import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchBrokerAccounts,
  createBrokerAccount,
  updateBrokerAccount,
  deleteBrokerAccount,
  testBrokerAccount,
  setPrimaryBrokerAccount,
  setDataFeedBrokerAccount,
  provisionProxy,
  deleteProxy,
  getProxyStatus,
} from '../api';

const BROKERS = [
  { value: 'angel', label: 'AngelOne', color: '#f97316' },
  { value: 'kite', label: 'Kite', color: '#0ea5e9' },
  { value: 'dhan', label: 'Dhan', color: '#a855f7' },
];

// Which credential fields each broker actually needs.
// Everything else is hidden from the form (and the server accepts
// missing keys as empty strings, so nothing else needs to change).
const BROKER_FIELDS = {
  angel: {
    hint: 'AngelOne needs API Key, MPIN and TOTP Secret. Client ID is your AngelOne login (e.g. R123456). AngelOne whitelists IP per api_key — give each account its own proxy.',
    show: { api_key: true, mpin: true, totp_secret: true, proxy_url: true },
    clientIdLabel: 'Client ID *',
  },
  kite: {
    hint: 'Kite needs API Key + Secret. Access Token is generated daily via the Kite OAuth flow — paste it here or run the login URL after saving. Kite whitelists a single IP per app — give each account its own proxy.',
    show: { api_key: true, api_secret: true, access_token: true, proxy_url: true },
    clientIdLabel: 'Client ID / User ID *',
  },
  dhan: {
    hint: 'Dhan needs the Client ID and Access Token from web.dhan.co → Profile → DhanHQ Trading APIs. Assigning a proxy is optional but recommended for isolating rate-limits per account.',
    show: { access_token: true, proxy_url: true },
    clientIdLabel: 'Client ID *',
  },
};

const EMPTY_FORM = {
  id: null,
  name: '',
  broker: 'angel',
  client_id: '',
  api_key: '',
  api_secret: '',
  password: '',
  mpin: '',
  totp_secret: '',
  access_token: '',
  login_method: 'manual',
  paper_trading: false,
  is_active: true,
  is_data_feed: false,
  is_primary: false,
  proxy_url: '',
};

function BrokerBadge({ broker }) {
  const spec = BROKERS.find((b) => b.value === broker) || { label: broker, color: '#64748b' };
  return (
    <span
      style={{
        background: spec.color,
        color: '#fff',
        padding: '2px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {spec.label}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    connected: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '● Connected' },
    disconnected: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: '● Disconnected' },
    error: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '● Error' },
    unknown: { bg: 'rgba(148,163,184,0.10)', color: '#64748b', label: '○ Unknown' },
  };
  const style = map[status] || map.unknown;
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {style.label}
    </span>
  );
}

export default function SettingsAccountsPanel() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchBrokerAccounts();
      setAccounts(res?.data?.accounts || []);
    } catch (e) {
      setError('Failed to load accounts.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll for proxy-provisioning updates. Mirrors OptionSelling: while any
  // account has proxy_status === 'provisioning', refresh the list every 10s
  // until AWS reports the IP (then proxy_status flips to 'active').
  const provisioningKey = accounts
    .filter((a) => a.proxy_status === 'provisioning')
    .map((a) => a.id)
    .join(',');
  useEffect(() => {
    if (!provisioningKey) return undefined;
    const interval = setInterval(() => { load(); }, 10000);
    return () => clearInterval(interval);
  }, [provisioningKey, load]);


  const editing = form.id != null;

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage('');
    setError('');
  };

  const startEdit = (a) => {
    setForm({
      id: a.id,
      name: a.name || '',
      broker: a.broker || 'angel',
      client_id: a.client_id || '',
      api_key: a.api_key || '',
      api_secret: '',
      password: '',
      mpin: '',
      totp_secret: '',
      access_token: '',
      login_method: a.login_method || 'manual',
      paper_trading: !!a.paper_trading,
      is_active: !!a.is_active,
      is_data_feed: !!a.is_data_feed,
      is_primary: !!a.is_primary,
      proxy_url: a.proxy_url || '',
    });
    setShowForm(true);
    setMessage('');
    setError('');
  };

  const cancelForm = () => { setShowForm(false); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.name.trim() || !form.client_id.trim()) {
      setError('Name and Client ID are required.');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      // Only send secret fields when non-empty — keeps existing values on edit.
      const payload = { ...form };
      ['api_secret', 'password', 'mpin', 'totp_secret', 'access_token'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      if (editing) {
        await updateBrokerAccount(form.id, payload);
        setMessage('Account updated.');
      } else {
        await createBrokerAccount(payload);
        setMessage('Account created.');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Failed to save account.';
      setError(String(detail));
    }
    setSaving(false);
  };

  const withRowBusy = async (id, key, fn) => {
    setRowBusy((s) => ({ ...s, [`${id}:${key}`]: true }));
    try { await fn(); } finally {
      setRowBusy((s) => { const c = { ...s }; delete c[`${id}:${key}`]; return c; });
    }
  };

  const doTest = (a) => withRowBusy(a.id, 'test', async () => {
    setError(''); setMessage('');
    try {
      const res = await testBrokerAccount(a.id);
      setMessage(`${a.name}: ${res?.data?.detail || res?.data?.status || 'ok'}`);
      await load();
    } catch (e) {
      setError(`Test failed: ${e?.response?.data?.detail || e.message}`);
    }
  });

  const doDelete = (a) => withRowBusy(a.id, 'delete', async () => {
    if (!window.confirm(`Delete account "${a.name}"? Strategies bound to it will be paused.`)) return;
    setError(''); setMessage('');
    try {
      await deleteBrokerAccount(a.id);
      setMessage('Account deleted.');
      await load();
    } catch (e) {
      setError(`Delete failed: ${e?.response?.data?.detail || e.message}`);
    }
  });

  const doPrimary = (a) => withRowBusy(a.id, 'primary', async () => {
    try { await setPrimaryBrokerAccount(a.id); await load(); }
    catch (e) { setError(`Set primary failed: ${e?.response?.data?.detail || e.message}`); }
  });

  const doDataFeed = (a) => withRowBusy(a.id, 'feed', async () => {
    try { await setDataFeedBrokerAccount(a.id); await load(); }
    catch (e) { setError(`Set data feed failed: ${e?.response?.data?.detail || e.message}`); }
  });

  const doProvisionProxy = (a) => withRowBusy(a.id, 'proxy', async () => {
    setError(''); setMessage('');
    try {
      const res = await provisionProxy(a.id);
      const msg = res?.data?.message || 'Proxy provisioned.';
      if (res?.data?.status === 'error') {
        setError(msg);
      } else {
        setMessage(msg);
      }
      await load();
    } catch (e) {
      setError(`Proxy provision failed: ${e?.response?.data?.message || e?.response?.data?.detail || e.message}`);
    }
  });

  const doDeleteProxy = (a) => withRowBusy(a.id, 'proxy', async () => {
    if (!window.confirm(`Delete the Lightsail proxy for "${a.name}"? The account row will keep working but lose its dedicated IP.`)) return;
    setError(''); setMessage('');
    try {
      const res = await deleteProxy(a.id);
      if (res?.data?.status === 'error') setError(res.data.message || 'Proxy delete failed');
      else setMessage(res?.data?.message || 'Proxy deleted.');
      await load();
    } catch (e) {
      setError(`Proxy delete failed: ${e?.response?.data?.message || e?.response?.data?.detail || e.message}`);
    }
  });

  const rows = useMemo(() => accounts, [accounts]);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>Broker Accounts</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Add multiple broker logins. Each strategy instance can be bound to one.
          </div>
        </div>
        <button className="btn btn-start" onClick={startCreate}>+ Add Account</button>
      </div>

      {message && <div style={{ color: 'var(--accent-green)', fontSize: 12, marginBottom: 8 }}>{message}</div>}
      {error && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 12 }}>Loading accounts…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: 12, fontStyle: 'italic' }}>
          No broker accounts yet. Click <b>+ Add Account</b> to configure one.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>
                <th style={th}>Name</th>
                <th style={th}>Broker</th>
                <th style={th}>Client ID</th>
                <th style={th}>Mode</th>
                <th style={th}>Auth</th>
                <th style={th}>Connection</th>
                <th style={th}>Proxy IP</th>
                <th style={th}>Flags</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
                  </td>
                  <td style={td}><BrokerBadge broker={a.broker} /></td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{a.client_id}</td>
                  <td style={td}>
                    <span style={{
                      background: a.paper_trading ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.15)',
                      color: a.paper_trading ? '#94a3b8' : '#10b981',
                      padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    }}>
                      {a.paper_trading ? 'Paper' : 'Live'}
                    </span>
                  </td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{a.login_method}</td>
                  <td style={td}><StatusPill status={a.last_connection_status} /></td>
                  <td style={td}>
                    {a.proxy_status === 'active' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#10b981' }}>{a.proxy_ip}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.proxy_instance_name || 'active'}</span>
                      </div>
                    ) : a.proxy_status === 'provisioning' ? (
                      <span style={{ fontSize: 11, color: '#f59e0b' }}>⏳ provisioning…</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>none</span>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {a.is_primary && (
                        <span style={flagPill('#3b82f6')}>PRIMARY</span>
                      )}
                      {a.is_data_feed && (
                        <span style={flagPill('#10b981')}>DATA FEED</span>
                      )}
                      {!a.is_active && (
                        <span style={flagPill('#64748b')}>DISABLED</span>
                      )}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn" style={actionBtn} onClick={() => startEdit(a)}>Edit</button>
                      <button
                        className="btn"
                        style={actionBtn}
                        disabled={!!rowBusy[`${a.id}:test`]}
                        onClick={() => doTest(a)}
                      >
                        {rowBusy[`${a.id}:test`] ? '…' : 'Test'}
                      </button>
                      {!a.is_primary && (
                        <button
                          className="btn"
                          style={actionBtn}
                          disabled={!!rowBusy[`${a.id}:primary`]}
                          onClick={() => doPrimary(a)}
                        >
                          Set Primary
                        </button>
                      )}
                      {!a.is_data_feed && (
                        <button
                          className="btn"
                          style={actionBtn}
                          disabled={!!rowBusy[`${a.id}:feed`]}
                          onClick={() => doDataFeed(a)}
                        >
                          Set Data Feed
                        </button>
                      )}
                      {a.proxy_status === 'active' || a.proxy_status === 'provisioning' ? (
                        <button
                          className="btn"
                          style={{ ...actionBtn, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                          disabled={!!rowBusy[`${a.id}:proxy`]}
                          onClick={() => doDeleteProxy(a)}
                        >
                          {rowBusy[`${a.id}:proxy`] ? '…' : 'Delete Proxy'}
                        </button>
                      ) : (
                        <button
                          className="btn"
                          style={{ ...actionBtn, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
                          disabled={!!rowBusy[`${a.id}:proxy`]}
                          onClick={() => doProvisionProxy(a)}
                        >
                          {rowBusy[`${a.id}:proxy`] ? '…' : 'Provision Proxy'}
                        </button>
                      )}
                      <button
                        className="btn btn-stop"
                        style={{ ...actionBtn, background: 'var(--accent-red)', color: '#fff' }}
                        disabled={!!rowBusy[`${a.id}:delete`]}
                        onClick={() => doDelete(a)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{
          marginTop: 16, padding: 14, border: '1px solid var(--border-light)',
          borderRadius: 8, background: 'var(--bg-secondary)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            {editing ? `Edit Account #${form.id}` : 'Add New Account'}
          </div>
          {(() => {
            const spec = BROKER_FIELDS[form.broker] || BROKER_FIELDS.angel;
            const showField = (k) => !!spec.show[k];
            return (
              <>
                {spec.hint && (
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', marginBottom: 12,
                    padding: '8px 12px', background: 'var(--bg-primary)',
                    borderRadius: 6, borderLeft: '3px solid var(--accent-blue)',
                  }}>
                    {spec.hint}
                  </div>
                )}
                <div className="grid grid-4" style={{ gap: 10 }}>
                  <label className="atl-field">
                    <span>Name *</span>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. My Angel A/c" />
                  </label>
                  <label className="atl-field">
                    <span>Broker *</span>
                    <select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })}>
                      {BROKERS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </label>
                  <label className="atl-field">
                    <span>{spec.clientIdLabel}</span>
                    <input value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
                  </label>

                  {showField('api_key') && (
                    <label className="atl-field">
                      <span>API Key</span>
                      <input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
                    </label>
                  )}
                  {showField('api_secret') && (
                    <label className="atl-field">
                      <span>API Secret {editing && <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(blank = keep)</em>}</span>
                      <input type="password" value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} />
                    </label>
                  )}
                  {showField('mpin') && (
                    <label className="atl-field">
                      <span>MPIN {editing && <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(blank = keep)</em>}</span>
                      <input type="password" value={form.mpin} onChange={(e) => setForm({ ...form, mpin: e.target.value })} />
                    </label>
                  )}
                  {showField('totp_secret') && (
                    <label className="atl-field">
                      <span>TOTP Secret {editing && <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(blank = keep)</em>}</span>
                      <input type="password" value={form.totp_secret} onChange={(e) => setForm({ ...form, totp_secret: e.target.value })} />
                    </label>
                  )}
                  {showField('access_token') && (
                    <label className="atl-field">
                      <span>Access Token {editing && <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(blank = keep)</em>}</span>
                      <input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
                    </label>
                  )}
                  {showField('proxy_url') && (
                    <label className="atl-field">
                      <span>Proxy URL (optional)</span>
                      <input value={form.proxy_url} onChange={(e) => setForm({ ...form, proxy_url: e.target.value })} placeholder="socks5://user:pass@ip:port" />
                    </label>
                  )}

                  <label className="atl-field">
                    <span>Mode</span>
                    <select
                      value={form.paper_trading ? 'paper' : 'live'}
                      onChange={(e) => setForm({ ...form, paper_trading: e.target.value === 'paper' })}
                    >
                      <option value="live">Live</option>
                      <option value="paper">Paper</option>
                    </select>
                  </label>
                  <label className="atl-field">
                    <span>Active</span>
                    <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="atl-field">
                    <span>Primary Account</span>
                    <select value={form.is_primary ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_primary: e.target.value === 'true' })}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                  <label className="atl-field">
                    <span>Use for Data Feed</span>
                    <select value={form.is_data_feed ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_data_feed: e.target.value === 'true' })}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                </div>
              </>
            );
          })()}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-start" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : (editing ? 'Update Account' : 'Create Account')}
            </button>
            <button className="btn" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }} disabled={saving} onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontWeight: 600 };
const td = { padding: '10px 10px', verticalAlign: 'middle' };
const actionBtn = { padding: '4px 10px', fontSize: 12, borderRadius: 6 };
const flagPill = (bg) => ({
  background: bg, color: '#fff', padding: '2px 8px', borderRadius: 10,
  fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
});
