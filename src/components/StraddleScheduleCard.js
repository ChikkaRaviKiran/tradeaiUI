import React from 'react';

/**
 * ATM Straddle Schedule — RETUNED for POST-REGIME (April 15+ 2026).
 *
 * After mid-April 2026 the exchange shifted weekly expiries:
 *   NIFTY: Thu → Tue   |   SENSEX: Fri → Thu
 *
 * The OLD schedule (Jan–Mar windows) lost ₹17K in May because same windows
 * now hit 0-DTE expiry days = sharp PM gamma. This NEW schedule was tuned
 * on Apr 15 – May 22 data:
 *
 *   Phase-3a (post-regime): ₹+1,24,961 / 23 trades / 95% win
 *   → projected ~₹1.0L/month in the new regime
 *
 * Key rule: NEVER hold 0-DTE NIFTY/SENSEX into the last 90 minutes.
 *
 * Sources:
 *   backend/retune_post_regime.py      — sweep & winning windows
 *   backend/phase3a_breakdown_v2.py    — per-day PnL verification
 */

// Each weekday: primary (3a) is the ⭐ cell; trade both for 3b.
const SCHEDULE = [
  { day: 'Mon',
    nifty:  { dte: 1, entry: '09:20', exit: '15:15', margin: '~₹3.0L' },
    sensex: { dte: 3, entry: '11:00', exit: '12:00', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: 'NIFTY 1-DTE, full session. SENSEX 3-DTE quick midday scalp.' },
  { day: 'Tue',
    nifty:  { dte: 0, entry: '09:30', exit: '13:30', margin: '~₹3.0L' },
    sensex: { dte: 2, entry: '09:45', exit: '14:30', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: '🏆 NIFTY expiry-day — exit 13:30 SHARP, no exceptions (PM gamma kills).' },
  { day: 'Wed',
    nifty:  { dte: 6, entry: '10:30', exit: '15:15', margin: '~₹3.0L' },
    sensex: { dte: 1, entry: '10:00', exit: '15:15', margin: '~₹2.5L' },
    primary: 'SENSEX',
    note: '🛡️ SENSEX 1-DTE most reliable. NIFTY next-week (6-DTE) late entry.' },
  { day: 'Thu',
    nifty:  { dte: 5, entry: '09:45', exit: '15:00', margin: '~₹3.0L' },
    sensex: { dte: 0, entry: '09:20', exit: '11:30', margin: '~₹2.5L' },
    primary: 'SENSEX',
    note: 'SENSEX expiry-day — morning ONLY (exit 11:30). NIFTY next-week safe.' },
  { day: 'Fri',
    nifty:  { dte: 4, entry: '09:45', exit: '14:30', margin: '~₹3.0L' },
    sensex: { dte: 6, entry: '09:30', exit: '13:30', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: 'NIFTY next-week (4-DTE). SENSEX far-leg (6-DTE) morning trade.' },
];

const TODAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function LegCell({ leg, isPrimary }) {
  return (
    <div style={{
      padding: 6,
      borderRadius: 4,
      background: isPrimary ? 'rgba(52,211,153,0.10)' : 'rgba(120,120,120,0.06)',
      border: isPrimary ? '1px solid rgba(52,211,153,0.45)' : '1px dashed rgba(120,120,120,0.25)',
      fontSize: 12, lineHeight: 1.4,
    }}>
      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
        {isPrimary && <span style={{ color: '#34d399', marginRight: 4 }}>⭐</span>}
        {leg.entry} → {leg.exit}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        DTE {leg.dte} · {leg.margin}
      </div>
    </div>
  );
}

export default function StraddleScheduleCard() {
  const todayName = TODAY_NAMES[new Date().getDay()];

  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #60a5fa' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span>📅 ATM Straddle Schedule — 3 lots (POST-REGIME, Apr 15+)</span>
        <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)' }}>
          3a: ₹+1.25L / 23 trades / 95% win · ~₹1L/mo · ⭐ = primary (₹4.4L margin)
        </span>
      </div>

      <div className="table-container" style={{ marginTop: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: 60 }}>Day</th>
              <th style={{ textAlign: 'left' }}>
                <span className="status-badge running">NIFTY</span>
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>lot 75 · step 50 · weekly Tue</span>
              </th>
              <th style={{ textAlign: 'left' }}>
                <span className="status-badge stopped">SENSEX</span>
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>lot 20 · step 100 · weekly Thu</span>
              </th>
              <th style={{ textAlign: 'left' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.map((row) => {
              const isToday = row.day === todayName;
              return (
                <tr key={row.day}
                    style={isToday ? { background: 'rgba(96,165,250,0.10)' } : undefined}>
                  <td style={{ fontWeight: isToday ? 700 : 600, verticalAlign: 'middle' }}>
                    {row.day}
                    {isToday && <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>← TODAY</div>}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <LegCell leg={row.nifty} isPrimary={row.primary === 'NIFTY'} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <LegCell leg={row.sensex} isPrimary={row.primary === 'SENSEX'} />
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12, verticalAlign: 'middle' }}>
                    {row.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, padding: 8, background: 'rgba(96,165,250,0.06)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        <strong style={{ color: '#f87171' }}>🔑 GOLDEN RULE — never hold expiry-day into PM:</strong> Tue NIFTY exit 13:30 sharp. Thu SENSEX exit 11:30 sharp. This is the rule that flipped May from -₹17K to +₹1.25L.
        <br />
        <strong style={{ color: '#34d399' }}>⭐ Phase-3a (₹4.4L):</strong> Trade only the green-bordered ⭐ cell. 5 trades/wk. Projected ~₹1L/mo. Worst single day in retune: ₹-6,581 (Mon NIFTY).
        <br />
        <strong style={{ color: '#fbbf24' }}>Phase-3b (~₹5.5L):</strong> Trade BOTH cells each day. ~₹1.4L/mo. Needs pledged collateral.
        <br />
        <strong style={{ color: '#60a5fa' }}>Setup:</strong> Sell ATM CE + ATM PE (3 lots each side) at entry minute. NIFTY round to nearest 50, SENSEX nearest 100. Nearest weekly expiry. Exit at the time shown.
        <br />
        <strong style={{ color: '#a78bfa' }}>ⓘ Sample caveats:</strong> Only 3–5 days/bucket in retune. 100% win rates WILL degrade to 70-80% live. Re-tune again if exchange shifts expiry calendar.
      </div>
    </div>
  );
}
