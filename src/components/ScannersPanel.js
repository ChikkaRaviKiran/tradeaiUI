import React from 'react';

/**
 * ScannersPanel — focused runtime status for core scanners.
 * Shows only Move Detection, PDH/PDL Breakout, and ATM Straddle.
 */
function ScannersPanel({ systemStatus }) {
  const scanners = systemStatus?.scanners || {};

  const cards = [
    {
      key: 'move_det',
      title: 'Move-Det',
      subtitle: 'Momentum continuation scanner',
      data: scanners.move_det,
    },
    {
      key: 'pdh_pdl',
      title: 'PDH/PDL Breakout',
      subtitle: 'Previous day level breakout scanner',
      data: scanners.pdh_pdl,
    },
    {
      key: 'atm',
      title: 'ATM Straddle',
      subtitle: 'Adaptive short straddle engine',
      data: scanners.atm,
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

        const statusColor = !active
          ? 'var(--text-muted)'
          : inTrade
            ? 'var(--accent-blue)'
            : (card.key === 'pdh_pdl'
                  ? (d.setup_checked && d.is_tradeable_day === false)
                    ? 'var(--accent-red)'
                    : 'var(--accent-green)'
                : card.key === 'atm'
                  ? (d.halted ? 'var(--accent-red)' : 'var(--accent-green)')
                : dayTradeable === false
                  ? 'var(--accent-red)'
                  : 'var(--accent-green)');

        const statusLabel = !active
          ? 'DISABLED'
          : inTrade
            ? 'IN TRADE'
            : card.key === 'pdh_pdl'
                ? (!d.setup_checked
                    ? 'WAITING'
                    : signalFound
                      ? 'DONE TODAY'
                      : 'WATCHING')
              : card.key === 'atm'
                ? (d.halted ? 'HALTED' : (d.phase || 'IDLE'))
              : signalFound === true
                ? 'DONE TODAY'
                : (dayTradeable === false)
                  ? 'DAY SKIPPED'
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
                {card.key === 'pdh_pdl' ? (
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
                ) : card.key === 'atm' ? (
                  <>
                    <Row label="Phase" value={d.phase || 'IDLE'} />
                    <Row label="Index" value={d.index || '-'} />
                    <Row label="Expiry" value={d.expiry || '-'} />
                    <Row label="Mode" value={d.live_mode ? 'LIVE' : 'PAPER'} />
                    <Row label="Halt" value={d.halted ? 'Yes' : 'No'} />
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
                    <Row label="In trade" value={inTrade ? 'Yes' : 'No'} />
                  </>
                )}
              </div>
            )}
            {card.key === 'pdh_pdl' && active && d.trade && (
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                fontSize: '0.7rem',
              }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                  {d.trade.exited ? 'Last trade' : 'Active trade'}
            {card.key === 'atm' && active && d.last_event && (
              <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Last Event: {d.last_event}
              </div>
            )}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {d.trade.side} @ {d.trade.entry_spot?.toFixed(2)} · {d.trade.entry_time}
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                  SL {d.trade.stop_level?.toFixed(2)} · TP {d.trade.target_level?.toFixed(2)}
                </div>
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
