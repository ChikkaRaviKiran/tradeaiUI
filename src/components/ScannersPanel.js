import React from 'react';

/**
 * ScannersPanel — shows the live status of the active scanners
 * (Config P, Move Detection, NR5 Breakout, PDH/PDL Breakout, 14:30 Vacuum, Range Breakout).
 * Sourced from /api/system/status.
 * Note: AI-GPT scanner is hidden from the UI (logic retained in backend, disabled by default).
 */
function ScannersPanel({ systemStatus }) {
  const scanners = systemStatus?.scanners || {};

  const cards = [
    {
      key: 'config_p',
      title: 'Config P',
      subtitle: 'Bearish · detect_move · conf≥70',
      data: scanners.config_p,
    },
    {
      key: 'move_det',
      title: 'Move-Det',
      subtitle: 'Bearish · scan_all · conf≥80',
      data: scanners.move_det,
    },
    // AI-GPT card intentionally hidden — scanner logic preserved in backend
    // (app/engine/ai_gpt_scanner.py) but disabled via AI_GPT_SCANNER_ENABLED=false.
    {
      key: 'nr5',
      title: 'NR5 Breakout',
      subtitle: 'Volatility contraction · PAPER',
      data: scanners.nr5,
    },
    {
      key: 'pdh_pdl',
      title: 'PDH/PDL Breakout',
      subtitle: 'Prev-day H/L break · PAPER',
      data: scanners.pdh_pdl,
    },
    {
      key: 'vacuum',
      title: '14:30 Vacuum',
      subtitle: 'Afternoon coil break · PAPER',
      data: scanners.vacuum,
    },
    {
      key: 'range_breakout',
      title: 'Range Breakout',
      subtitle: '09:45-10:30 · Option C · PAPER',
      data: scanners.range_breakout,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
      {cards.map(card => {
        const d = card.data || {};
        const active = d.active;
        const inTrade = d.in_trade;
        const dayTradeable = d.day_tradeable;
        const signalFound = d.signal_found;
        const failures = d.ai_failures_today;

        const statusColor = !active
          ? 'var(--text-muted)'
          : inTrade
            ? 'var(--accent-blue)'
            : (card.key === 'nr5'
                ? (d.setup_checked && d.is_nr5_day === false)
                  ? 'var(--accent-red)'
                  : (d.gap_skip ? 'var(--accent-red)' : 'var(--accent-green)')
                : card.key === 'pdh_pdl'
                  ? (d.setup_checked && d.is_tradeable_day === false)
                    ? 'var(--accent-red)'
                    : 'var(--accent-green)'
                : card.key === 'vacuum'
                  ? (d.setup_checked && d.is_tradeable_day === false)
                    ? 'var(--accent-red)'
                    : 'var(--accent-green)'
                : card.key === 'range_breakout'
                  ? (signalFound ? 'var(--accent-blue)' : 'var(--accent-green)')
                : (dayTradeable === false || (failures !== undefined && failures >= 5))
                  ? 'var(--accent-red)'
                  : 'var(--accent-green)');

        const statusLabel = !active
          ? 'DISABLED'
          : inTrade
            ? 'IN TRADE'
            : card.key === 'nr5'
              ? (!d.setup_checked
                  ? 'WAITING'
                  : d.is_nr5_day === false
                    ? 'NOT NR5'
                    : d.gap_skip
                      ? 'GAP SKIP'
                      : signalFound
                        ? 'DONE TODAY'
                        : 'WATCHING')
              : card.key === 'pdh_pdl'
                ? (!d.setup_checked
                    ? 'WAITING'
                    : signalFound
                      ? 'DONE TODAY'
                      : 'WATCHING')
              : card.key === 'vacuum'
                ? (!d.setup_checked
                    ? 'WAITING'
                    : d.is_tradeable_day === false
                      ? 'NO COIL'
                      : signalFound
                        ? 'DONE TODAY'
                        : 'WATCHING')
              : card.key === 'range_breakout'
                ? (signalFound ? 'DONE TODAY' : 'WATCHING')
              : signalFound === true && card.key !== 'ai_gpt'
                ? 'DONE TODAY'
                : (dayTradeable === false)
                  ? 'DAY SKIPPED'
                  : (failures !== undefined && failures >= 5)
                    ? 'AI FAILED'
                    : 'WATCHING';

        return (
          <div className="card" key={card.key} style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{card.title}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor }}>
                {statusLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              {card.subtitle}
            </div>
            {!active && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Not initialised
              </div>
            )}
            {active && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.7rem' }}>
                {card.key === 'nr5' ? (
                  <>
                    <Row label="Setup" value={d.setup_checked ? (d.is_nr5_day ? 'NR5 ✓' : 'Not NR5') : 'Pending'} />
                    {d.gap_pct !== undefined && d.gap_pct !== null && (
                      <Row label="Gap" value={`${d.gap_pct >= 0 ? '+' : ''}${d.gap_pct.toFixed(2)}%`} />
                    )}
                    {d.prev_high && (
                      <Row label="Prev H" value={d.prev_high.toFixed(2)} />
                    )}
                    {d.prev_low && (
                      <Row label="Prev L" value={d.prev_low.toFixed(2)} />
                    )}
                    {d.prev_range && (
                      <Row label="Prev rng" value={`${d.prev_range.toFixed(1)} pts`} />
                    )}
                    <Row label="Signal" value={signalFound ? 'Yes' : 'Watching'} />
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                ) : card.key === 'pdh_pdl' ? (
                  <>
                    <Row label="Setup" value={d.setup_checked ? (d.is_tradeable_day ? 'Ready ✓' : 'No data') : 'Pending'} />
                    {d.prev_high && (
                      <Row label="Prev H" value={d.prev_high.toFixed(2)} />
                    )}
                    {d.prev_low && (
                      <Row label="Prev L" value={d.prev_low.toFixed(2)} />
                    )}
                    <Row label="Signal" value={signalFound ? 'Yes' : 'Watching'} />
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                ) : card.key === 'vacuum' ? (
                  <>
                    <Row label="Setup" value={d.setup_checked ? (d.is_tradeable_day ? 'Coil ✓' : 'No coil') : 'Pending'} />
                    {d.coil_high != null && (
                      <Row label="Coil H" value={d.coil_high.toFixed(2)} />
                    )}
                    {d.coil_low != null && (
                      <Row label="Coil L" value={d.coil_low.toFixed(2)} />
                    )}
                    {d.coil_range != null && d.avg_range != null && d.avg_range > 0 && (
                      <Row label="Range" value={`${d.coil_range.toFixed(1)} (${(100 * d.coil_range / d.avg_range).toFixed(0)}%)`} />
                    )}
                    <Row label="Signal" value={signalFound ? 'Yes' : 'Watching'} />
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                ) : card.key === 'range_breakout' ? (
                  <>
                    <Row label="Setup" value="Active" />
                    <Row label="Window" value="09:45-10:30" />
                    <Row label="Signal" value={signalFound ? 'Yes' : 'Watching'} />
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                ) : (
                  <>
                    {dayTradeable !== undefined && (
                      <Row label="Day" value={dayTradeable ? 'Tradeable' : 'Skipped'} />
                    )}
                    {signalFound !== undefined && (
                      <Row label="Signal" value={signalFound ? 'Yes' : 'Watching'} />
                    )}
                    {d.last_trade_week !== undefined && d.last_trade_week !== null && (
                      <Row label="Last week" value={`W${d.last_trade_week}`} />
                    )}
                    {d.ai_runs_today !== undefined && (
                      <Row label="AI runs" value={d.ai_runs_today} />
                    )}
                    {failures !== undefined && (
                      <Row label="AI fails" value={failures} />
                    )}
                    {d.last_run_at && (
                      <Row label="Last run" value={d.last_run_at} />
                    )}
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                )}
              </div>
            )}
            {(card.key === 'nr5' || card.key === 'pdh_pdl' || card.key === 'vacuum' || card.key === 'range_breakout') && active && d.trade && (
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                fontSize: '0.7rem',
              }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                  {d.trade.exited ? 'Last trade' : 'Active trade'}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {d.trade.side} @ {d.trade.entry_spot?.toFixed(2)} · {d.trade.entry_time}
                </div>
                {card.key === 'vacuum' ? (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    SL ₹{d.trade.option_sl_price?.toFixed(2)} · TP ₹{d.trade.option_target_price?.toFixed(2)}
                  </div>
                ) : card.key === 'range_breakout' ? (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    SL ₹{d.trade.option_sl_price?.toFixed(2)} · T1 ₹{d.trade.option_t1_price?.toFixed(2)} · T2 ₹{d.trade.option_t2_price?.toFixed(2)}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    SL {d.trade.stop_level?.toFixed(2)} · TP {d.trade.target_level?.toFixed(2)}
                  </div>
                )}
                {d.trade.option_symbol && (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    {d.trade.option_symbol} ₹{d.trade.option_entry_price?.toFixed(2)}
                  </div>
                )}
                {d.trade.exited && (
                  <div style={{ marginTop: 2 }}>
                    Exit {d.trade.exit_spot?.toFixed(2)} · {d.trade.exit_time} · {d.trade.exit_reason}
                  </div>
                )}
              </div>
            )}
            {active && d.last_decision && (
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                fontSize: '0.7rem',
              }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Last decision</div>
                <div style={{ fontWeight: 600 }}>{d.last_decision}</div>
                {d.last_decision_detail && (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    {d.last_decision_detail}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </>
  );
}

export default ScannersPanel;
