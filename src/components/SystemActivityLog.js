import React, { useState } from 'react';

const SOURCE_LABELS = {
  angelone_auth: 'AngelOne Auth',
  candles: 'Candle Data',
  options_chain: 'Options Chain',
  fii_dii: 'FII / DII',
  breadth: 'Market Breadth',
  news: 'Telegram News',
  global_indices: 'Global Indices',
  ai_insight: 'AI Insight',
};

const STATUS_COLORS = {
  ok: '#10b981',
  warn: '#f59e0b',
  error: '#ef4444',
  pending: '#6b7280',
};

const EVENT_COLORS = {
  cycle: '#6b7280',
  auth: '#8b5cf6',
  intelligence: '#3b82f6',
  data: '#06b6d4',
  candle: '#10b981',
  indicators: '#10b981',
  options: '#06b6d4',
  regime: '#a78bfa',
  gate: '#f59e0b',
  signal: '#eab308',
  filter: '#f59e0b',
  score: '#f97316',
  option_ltp: '#06b6d4',
  ai: '#8b5cf6',
  trade: '#10b981',
};

const EVENT_ICONS = {
  cycle: '⟳',
  auth: '🔑',
  intelligence: '🧠',
  data: '📊',
  candle: '📈',
  indicators: '📐',
  options: '⛓',
  regime: '🌊',
  gate: '🚧',
  signal: '⚡',
  filter: '🔽',
  score: '🎯',
  option_ltp: '💰',
  ai: '🤖',
  trade: '✅',
};

function SystemActivityLog({ activity }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(true);

  if (!activity) return null;

  const { events = [], data_sources = {}, cycle = 0, regimes = {} } = activity;

  // Filter events
  const filtered = filter === 'all'
    ? events
    : filter === 'important'
      ? events.filter(e => ['signal', 'score', 'ai', 'trade', 'gate', 'intelligence', 'filter'].includes(e.type))
      : events.filter(e => e.type === filter);

  // Show latest first
  const displayEvents = [...filtered].reverse().slice(0, 100);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>System Pipeline Monitor</h3>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            Cycle #{cycle}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
        >
          {expanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Data Source Health */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => {
              const src = data_sources[key] || { status: 'pending', detail: '' };
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--card-bg)', padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${STATUS_COLORS[src.status] || '#333'}22`,
                  fontSize: 11,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_COLORS[src.status] || '#6b7280',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  {src.detail && (
                    <span style={{ color: STATUS_COLORS[src.status], fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {src.detail}
                    </span>
                  )}
                  {src.updated && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{src.updated}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Per-Instrument Regime & HTF */}
          {Object.keys(regimes).length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {Object.entries(regimes).map(([sym, info]) => (
                <div key={sym} style={{
                  background: 'var(--card-bg)', padding: '4px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', fontSize: 11,
                  display: 'flex', gap: 10, alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sym}</span>
                  {info.price && <span style={{ color: 'var(--accent-blue)' }}>₹{info.price.toLocaleString('en-IN')}</span>}
                  <span style={{ color: '#a78bfa' }}>{info.regime}</span>
                  <span style={{ color: info.htf_trend === 'bullish' ? '#10b981' : info.htf_trend === 'bearish' ? '#ef4444' : '#6b7280' }}>
                    HTF: {info.htf_trend}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              ['all', 'All'],
              ['important', 'Important'],
              ['signal', 'Signals'],
              ['ai', 'AI'],
              ['trade', 'Trades'],
              ['data', 'Data'],
              ['candle', 'Candles'],
              ['regime', 'Regime'],
              ['gate', 'Gates'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                style={{
                  padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  border: filter === val ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                  background: filter === val ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: filter === val ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {label} {val === 'all' ? `(${events.length})` : ''}
              </button>
            ))}
          </div>

          {/* Event feed */}
          <div style={{ maxHeight: 400, overflowY: 'auto', fontSize: 11, lineHeight: 1.7 }}>
            {displayEvents.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
                No activity yet — waiting for system to start
              </div>
            ) : (
              displayEvents.map((evt, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '3px 0',
                  borderBottom: evt.type === 'cycle' ? '1px solid var(--border)' : 'none',
                  opacity: evt.type === 'cycle' ? 0.7 : 1,
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 10, flexShrink: 0, minWidth: 52 }}>
                    {evt.ts}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 12 }}>
                    {EVENT_ICONS[evt.type] || '•'}
                  </span>
                  {evt.instrument && (
                    <span style={{
                      color: '#3b82f6', fontWeight: 600, flexShrink: 0,
                      minWidth: 60, fontSize: 10, marginTop: 1,
                    }}>
                      {evt.instrument}
                    </span>
                  )}
                  <span style={{ color: EVENT_COLORS[evt.type] || 'var(--text-primary)' }}>
                    {evt.msg}
                  </span>
                  {evt.data && Object.keys(evt.data).length > 0 && evt.type === 'ai' && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 10, marginLeft: 4 }}>
                      [{evt.data.confidence}% conf]
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SystemActivityLog;
