import React, { useState, useEffect, useCallback } from 'react';
import { fetchStrategySelection, fetchPerformanceComparison } from '../api';

/* ── Strategy schedule data ──────────────────────────────────── */
const STRATEGIES = [
  {
    id: 'RANGE_BREAKOUT',
    name: 'Range Breakout',
    short: 'RB',
    color: '#f59e0b',
    instruments: ['NIFTY', 'SENSEX'],
    window: '09:45 – 10:15',
    windowStart: '09:45',
    windowEnd: '10:15',
    entry: 'ADX < 20, 30-bar range < 0.80%, breakout + RSI/volume/body confirmation',
    exit: '20% SL (1R) → T1 +1R (SL→BE) → T2 +2R (lock 1R) → EOD 15:10',
    pfNifty: 1.82,
    pfSensex: 1.90,
  },
  {
    id: 'EMA_BREAKOUT',
    name: 'EMA Breakout',
    short: 'EMA',
    color: '#3b82f6',
    instruments: ['NIFTY'],
    window: '11:00 – 12:00',
    windowStart: '11:00',
    windowEnd: '12:00',
    entry: 'Price crosses EMA50, EMA9 > EMA20, RSI 50-70, body ≥ 40%',
    exit: '20% SL (1R) → T1 +1R (SL→BE) → T2 +2R (lock 1R) → EOD 15:10',
    pfNifty: 1.15,
    pfSensex: null,
  },
  {
    id: 'MOMENTUM_BREAKOUT',
    name: 'Momentum Breakout',
    short: 'MB',
    color: '#ef4444',
    instruments: ['SENSEX'],
    window: '09:45 – 10:15',
    windowStart: '09:45',
    windowEnd: '10:15',
    entry: 'Donchian 20-bar breakout, ADX > 25, RSI > 60, volume ≥ 1.5×',
    exit: '20% SL (1R) → T1 +1R (SL→BE) → T2 +2R (lock 1R) → EOD 15:10',
    pfNifty: null,
    pfSensex: 1.49,
  },
];

const RISK_RULES = [
  { icon: '🛡️', label: 'Daily Loss Cap', value: '₹1,500', desc: 'Stop all trading for the day once cumulative P&L crosses -₹1,500' },
  { icon: '📊', label: 'Gap Filter', value: '> 1.0%', desc: 'Skip entire day if any instrument opens with gap > 1% from previous close' },
  { icon: '🎯', label: 'Stop Loss', value: '20% of premium', desc: 'Fixed 20% SL on option premium (1R risk per trade)' },
  { icon: '💰', label: 'Capital', value: '₹1,00,000', desc: '1 lot per trade, uniform position sizing' },
];

const TIME_SLOTS = [
  { time: '09:15', label: '09:15' },
  { time: '09:30', label: '09:30' },
  { time: '09:45', label: '09:45' },
  { time: '10:00', label: '10:00' },
  { time: '10:15', label: '10:15' },
  { time: '10:30', label: '10:30' },
  { time: '11:00', label: '11:00' },
  { time: '11:30', label: '11:30' },
  { time: '12:00', label: '12:00' },
  { time: '12:30', label: '12:30' },
  { time: '13:00', label: '13:00' },
  { time: '14:00', label: '14:00' },
  { time: '15:00', label: '15:00' },
  { time: '15:10', label: '15:10' },
  { time: '15:30', label: '15:30' },
];

function StrategyHub() {
  const [selection, setSelection] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  useEffect(() => {
    fetchStrategySelection().then(r => setSelection(r.data)).catch(() => {});
    fetchPerformanceComparison().then(r => setComparison(r.data)).catch(() => {});
  }, []);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isMarketHours = currentTime >= '09:15' && currentTime <= '15:30';

  return (
    <div>
      {/* ── Strategy Schedule Visual ──────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Strategy Schedule</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 10 }}>
                Which strategy fires when and on which instrument
              </span>
            </div>
            {isMarketHours && (
              <span style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
              }}>
                MARKET OPEN · {currentTime}
              </span>
            )}
          </div>
        </div>

        {/* Timeline visualization */}
        <div style={{ padding: '12px 18px 16px', overflowX: 'auto' }}>
          {/* Time axis */}
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ width: 80, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', position: 'relative', minWidth: 700 }}>
              {TIME_SLOTS.map((slot, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)',
                  borderLeft: '1px solid var(--border)',
                  fontWeight: slot.time === '09:15' || slot.time === '15:30' ? 700 : 400,
                }}>
                  {slot.label}
                </div>
              ))}
            </div>
          </div>

          {/* NIFTY row */}
          <TimelineRow
            instrument="NIFTY"
            strategies={STRATEGIES.filter(s => s.instruments.includes('NIFTY'))}
            currentTime={currentTime}
            isMarketHours={isMarketHours}
          />

          {/* SENSEX row */}
          <TimelineRow
            instrument="SENSEX"
            strategies={STRATEGIES.filter(s => s.instruments.includes('SENSEX'))}
            currentTime={currentTime}
            isMarketHours={isMarketHours}
          />

          {/* EOD exit marker */}
          <div style={{ display: 'flex', marginTop: 6 }}>
            <div style={{ width: 80, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', position: 'relative', minWidth: 700 }}>
              <div style={{
                position: 'absolute',
                left: `${timeToPercent('15:10')}%`,
                top: -4,
                transform: 'translateX(-50%)',
                fontSize: 10,
                color: 'var(--accent-red)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                ▼ EOD Exit 15:10
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Strategy Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {STRATEGIES.map(strat => (
          <StrategyCard
            key={strat.id}
            strategy={strat}
            expanded={expandedStrategy === strat.id}
            onToggle={() => setExpandedStrategy(expandedStrategy === strat.id ? null : strat.id)}
            currentTime={currentTime}
            isMarketHours={isMarketHours}
          />
        ))}
      </div>

      {/* ── Risk Management Rules ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px 8px' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Risk Management</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 10 }}>Production rules applied to every trade</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {RISK_RULES.map((rule, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{rule.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {rule.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {rule.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {rule.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trade Flow Diagram ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Trade Decision Flow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {[
            { label: '09:15 Open', desc: 'Market opens', color: '#6b7280' },
            { label: 'Gap Check', desc: 'Skip if gap > 1%', color: '#f59e0b' },
            { label: '09:45 Window', desc: 'RB + MB scan', color: '#10b981' },
            { label: 'Signal Found?', desc: 'Entry conditions met', color: '#3b82f6' },
            { label: 'Execute Trade', desc: 'Buy CE/PE option', color: '#a78bfa' },
            { label: 'Manage Exit', desc: 'SL → T1 → T2 → EOD', color: '#ef4444' },
            { label: 'Loss Cap?', desc: 'Day P&L < -₹1,500?', color: '#f59e0b' },
            { label: '11:00 Window', desc: 'EMA scan (NIFTY)', color: '#10b981' },
            { label: '15:10 EOD', desc: 'Force close all', color: '#ef4444' },
          ].map((step, i, arr) => (
            <React.Fragment key={i}>
              <div style={{
                minWidth: 100, padding: '8px 10px', borderRadius: 8, textAlign: 'center',
                background: `${step.color}15`, border: `1px solid ${step.color}40`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 2 }}>{step.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{step.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Today's Strategy Selection (from backend) ─────────── */}
      {selection && selection.selections && selection.selections.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Today's Selection
            {selection.day_type && (
              <span style={{
                marginLeft: 10, padding: '2px 8px', borderRadius: 4, fontSize: 11,
                fontWeight: 700, background: 'rgba(107,114,128,0.12)', color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}>
                {selection.day_type}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {selection.selections.map((sel, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 8, background: 'rgba(107,114,128,0.06)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{sel.instrument}</span>
                  {sel.confidence && (
                    <span style={{
                      padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: sel.confidence === 'high' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: sel.confidence === 'high' ? '#10b981' : '#f59e0b',
                    }}>
                      {sel.confidence.toUpperCase()}
                    </span>
                  )}
                </div>
                {sel.strategies && sel.strategies.map((s, j) => (
                  <div key={j} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: STRATEGIES.find(st => st.id === s.name)?.color || '#6b7280',
                    }} />
                    <span style={{ fontWeight: 600 }}>{(s.name || '').replace(/_/g, ' ')}</span>
                    {s.score != null && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Score: {s.score}</span>
                    )}
                    {s.reason && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>— {s.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Timeline Row ─────────────────────────────────────────────── */
function TimelineRow({ instrument, strategies, currentTime, isMarketHours }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <div style={{
        width: 80, flexShrink: 0, fontWeight: 700, fontSize: 12, color: 'var(--text-primary)',
        paddingRight: 8, textAlign: 'right',
      }}>
        {instrument}
      </div>
      <div style={{
        flex: 1, position: 'relative', height: 32, minWidth: 700,
        background: 'rgba(107,114,128,0.06)', borderRadius: 4, border: '1px solid var(--border)',
      }}>
        {/* Strategy bars */}
        {strategies.map(strat => {
          const left = timeToPercent(strat.windowStart);
          const right = timeToPercent(strat.windowEnd);
          const width = right - left;
          const isActive = isMarketHours && currentTime >= strat.windowStart && currentTime <= strat.windowEnd;

          return (
            <div key={strat.id} title={`${strat.name}: ${strat.window}`} style={{
              position: 'absolute', left: `${left}%`, width: `${width}%`, top: 3, bottom: 3,
              background: isActive ? `${strat.color}40` : `${strat.color}20`,
              border: `2px solid ${isActive ? strat.color : `${strat.color}60`}`,
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: strat.color,
                textShadow: '0 0 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap',
              }}>
                {strat.short}
              </span>
            </div>
          );
        })}

        {/* Current time marker */}
        {isMarketHours && (
          <div style={{
            position: 'absolute', left: `${timeToPercent(currentTime)}%`,
            top: -2, bottom: -2, width: 2, background: '#fff', zIndex: 5,
            boxShadow: '0 0 6px rgba(255,255,255,0.5)',
          }} />
        )}

        {/* Pre-market zone */}
        <div style={{
          position: 'absolute', left: 0, width: `${timeToPercent('09:45')}%`,
          top: 0, bottom: 0, background: 'rgba(107,114,128,0.08)', borderRadius: '4px 0 0 4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Pre-market</span>
        </div>
      </div>
    </div>
  );
}

/* ── Strategy Card ────────────────────────────────────────────── */
function StrategyCard({ strategy, expanded, onToggle, currentTime, isMarketHours }) {
  const s = strategy;
  const isActive = isMarketHours && currentTime >= s.windowStart && currentTime <= s.windowEnd;
  const isPast = isMarketHours && currentTime > s.windowEnd;

  let statusLabel, statusColor, statusBg;
  if (!isMarketHours) {
    statusLabel = 'MARKET CLOSED';
    statusColor = '#6b7280';
    statusBg = 'rgba(107,114,128,0.12)';
  } else if (isActive) {
    statusLabel = '● SCANNING';
    statusColor = '#10b981';
    statusBg = 'rgba(16,185,129,0.12)';
  } else if (isPast) {
    statusLabel = 'WINDOW CLOSED';
    statusColor = '#6b7280';
    statusBg = 'rgba(107,114,128,0.12)';
  } else {
    statusLabel = 'WAITING';
    statusColor = '#f59e0b';
    statusBg = 'rgba(245,158,11,0.12)';
  }

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden', cursor: 'pointer',
      borderColor: isActive ? s.color : undefined,
      boxShadow: isActive ? `0 0 12px ${s.color}30` : undefined,
    }} onClick={onToggle}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: s.color,
            boxShadow: isActive ? `0 0 8px ${s.color}` : 'none',
          }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: statusBg, color: statusColor,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Quick info */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 16, fontSize: 12 }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Window</span>
          <div style={{ fontWeight: 600 }}>{s.window}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Instruments</span>
          <div style={{ fontWeight: 600 }}>{s.instruments.join(', ')}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>PF</span>
          <div style={{ fontWeight: 600 }}>
            {s.pfNifty && <span style={{ color: s.pfNifty >= 1.5 ? 'var(--accent-green)' : 'var(--text-primary)' }}>N:{s.pfNifty} </span>}
            {s.pfSensex && <span style={{ color: s.pfSensex >= 1.5 ? 'var(--accent-green)' : 'var(--text-primary)' }}>S:{s.pfSensex}</span>}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '10px 16px 14px', borderTop: '1px solid var(--border)',
          background: 'rgba(107,114,128,0.04)',
        }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Entry Conditions</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s.entry}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Exit Rules</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s.exit}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper: time string to percent of trading day ────────────── */
function timeToPercent(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const mins = h * 60 + m;
  const dayStart = 9 * 60 + 15;  // 09:15
  const dayEnd = 15 * 60 + 30;   // 15:30
  return Math.max(0, Math.min(100, ((mins - dayStart) / (dayEnd - dayStart)) * 100));
}

export default StrategyHub;
