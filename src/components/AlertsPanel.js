import React, { useState } from 'react';
import { fetchAlerts } from '../api';

const TYPE_CONFIG = {
  signal: { emoji: '🔔', color: 'var(--accent-blue)', label: 'SIGNAL' },
  exit:   { emoji: '📤', color: 'var(--accent-yellow)', label: 'EXIT' },
  report: { emoji: '📊', color: 'var(--accent-blue)', label: 'REPORT' },
  info:   { emoji: 'ℹ️', color: 'var(--text-secondary)', label: 'INFO' },
};

function AlertsPanel({ alerts: defaultAlerts, compact }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filteredAlerts, setFilteredAlerts] = useState(null);
  const [loading, setLoading] = useState(false);

  // Use filtered alerts if a non-today date was explicitly selected, otherwise use live alerts
  const alerts = filteredAlerts !== null ? filteredAlerts : defaultAlerts;

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);

    if (date === todayStr) {
      setFilteredAlerts(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAlerts(200, date);
      setFilteredAlerts(res.data || []);
    } catch {
      setFilteredAlerts([]);
    }
    setLoading(false);
  };

  const dateBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        {selectedDate === todayStr ? 'Today' : selectedDate}
        {alerts && alerts.length > 0 ? ` · ${alerts.length}` : ''}
      </span>
      <input
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        max={todayStr}
        style={{
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
          border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
          fontSize: '0.7rem', cursor: 'pointer',
        }}
      />
    </div>
  );

  if (!alerts || alerts.length === 0) {
    return (
      <div>
        {dateBar}
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: '0.8rem' }}>
            {loading ? 'Loading...' : 'No alerts'}
          </p>
        </div>
      </div>
    );
  }

  const maxHeight = compact ? 580 : 420;

  return (
    <div>
      {dateBar}
      <div className="card alert-feed" style={{ maxHeight, padding: 0 }}>
      {alerts.map((alert) => {
        const cfg = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.info;
        const isWin = alert.pnl != null && alert.pnl > 0;

        return (
          <div key={alert.id} className="alert-item">
            <div className="alert-icon">
              {alert.alert_type === 'exit' ? (isWin ? '✅' : '❌') : cfg.emoji}
            </div>
            <div className="alert-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span className="alert-title">
                  {alert.title}
                  {alert.engine === 'v2' && (
                    <span className="tag tag-v2" style={{ marginLeft: 6, fontSize: '0.6rem', padding: '1px 5px' }}>V2</span>
                  )}
                </span>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <pre className="alert-msg"
                style={{
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              >
                {alert.message}
              </pre>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span className="tag tag-strategy" style={{ fontSize: '0.6rem' }}>{cfg.label}</span>
                {alert.strategy && (
                  <span className="tag tag-strategy" style={{ fontSize: '0.65rem' }}>{alert.strategy}</span>
                )}
                {alert.pnl != null && (
                  <span
                    className={`tag ${isWin ? 'tag-ce' : 'tag-pe'}`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {isWin ? '+' : ''}₹{alert.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default AlertsPanel;
