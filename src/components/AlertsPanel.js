import React, { useState } from 'react';
import { fetchAlerts } from '../api';

const TYPE_CONFIG = {
  signal: { emoji: '🔔', color: 'var(--accent-blue)', label: 'SIGNAL' },
  exit:   { emoji: '📤', color: 'var(--accent-yellow)', label: 'EXIT' },
  report: { emoji: '📊', color: 'var(--accent-blue)', label: 'REPORT' },
  info:   { emoji: 'ℹ️', color: 'var(--text-secondary)', label: 'INFO' },
};

function AlertsPanel({ alerts: defaultAlerts }) {
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
      // Reset to live alerts
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
  if (!alerts || alerts.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {selectedDate === todayStr ? 'Today' : selectedDate}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            max={todayStr}
            style={{
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          />
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
            {loading ? 'Loading...' : `No alerts for ${selectedDate === todayStr ? 'today' : selectedDate}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {selectedDate === todayStr ? 'Today' : selectedDate} &middot; {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          max={todayStr}
          style={{
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
            fontSize: '0.75rem', cursor: 'pointer',
          }}
        />
      </div>
      <div className="card" style={{ maxHeight: 420, overflowY: 'auto' }}>
      {alerts.map((alert) => {
        const cfg = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.info;
        const isWin = alert.pnl != null && alert.pnl > 0;
        const isLoss = alert.pnl != null && alert.pnl < 0;

        return (
          <div
            key={alert.id}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>
              {alert.alert_type === 'exit' ? (isWin ? '✅' : '❌') : cfg.emoji}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alert.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                  {new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <pre
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              >
                {alert.message}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span className="tag tag-strategy" style={{ fontSize: '0.65rem' }}>{cfg.label}</span>
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
