import React from 'react';

/**
 * ScannersPanel — shows the live status of the three active scanners
 * (Config P, Move Detection, AI-GPT). Sourced from /api/system/status.
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
    {
      key: 'ai_gpt',
      title: 'AI-GPT',
      subtitle: scanners.ai_gpt?.model
        ? `GPT pipeline · ${scanners.ai_gpt.model}`
        : 'GPT pipeline · disabled',
      data: scanners.ai_gpt,
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
            : (dayTradeable === false || (failures !== undefined && failures >= 5))
              ? 'var(--accent-red)'
              : 'var(--accent-green)';

        const statusLabel = !active
          ? 'DISABLED'
          : inTrade
            ? 'IN TRADE'
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
