import React from 'react';

/**
 * Straddle/Strangle Schedule — ULTIMATE SWEEP WINNER (Jan–May 2026).
 *
 * 4-dimensional optimization across (entry × exit × strike-offset × expiry-rank)
 * per (weekday × index), validated on full 5 months of post-regime data.
 *
 *   Phase-3a (best single index/day):  ₹+4,82,838 / 77 trades / 83% win  ≈ ₹+97K/mo
 *   Phase-3b (both indexes daily):     ₹+7,50,615 / 149 trades / 79% win ≈ ₹+1.50L/mo
 *
 * Beats prior baselines:
 *   ATM straddle (post-regime):  ₹+3,16,001
 *   Strangle +2 (fixed window):  ₹+3,82,753
 *   → +₹1L over old schedule, every month positive.
 *
 * Golden rule: never hold 0-DTE NIFTY/SENSEX into last 90 minutes.
 *
 * Sources:
 *   backend/ultimate_sweep.py          — 4D sweep + replay
 *   backend/phase3a_breakdown_v2.py    — per-day verification
 */

// strike: 'ATM' | '+1' | '+2' | '+3'   (offset in steps; NIFTY=50, SENSEX=100)
// expiry: 'nearWk' | 'nextWk'
const SCHEDULE = [
  { day: 'Mon',
    nifty:  { strike: '+3', expiry: 'nearWk', dte: 3, entry: '09:20', exit: '11:00', cum: '₹+86,163', win: '93%', margin: '~₹2.7L' },
    sensex: { strike: 'ATM', expiry: 'nearWk', dte: 4, entry: '09:20', exit: '11:00', cum: '₹+47,040', win: '80%', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: 'Both indexes 09:20→11:00 morning. NIFTY +3 OTM strangle = 93% win.' },
  { day: 'Tue',
    nifty:  { strike: 'ATM', expiry: 'nearWk', dte: 2, entry: '09:30', exit: '14:30', cum: '₹+1,61,032', win: '82%', margin: '~₹3.0L' },
    sensex: { strike: 'ATM', expiry: 'nearWk', dte: 3, entry: '09:30', exit: '15:00', cum: '₹+92,910', win: '75%', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: '🏆 BIGGEST WINNER. NIFTY DTE-2 ATM = ₹+1.6L over 17 trades. Exit 14:30, NOT 15:15.' },
  { day: 'Wed',
    nifty:  { strike: '+2', expiry: 'nearWk', dte: 1, entry: '10:30', exit: '14:30', cum: '₹+55,608', win: '76%', margin: '~₹2.7L' },
    sensex: { strike: 'ATM', expiry: 'nearWk', dte: 2, entry: '09:45', exit: '15:00', cum: '₹+99,594', win: '85%', margin: '~₹2.5L' },
    primary: 'SENSEX',
    note: '🛡️ SENSEX DTE-2 ATM 09:45→15:00 = 85% win, worst day only ₹-1K.' },
  { day: 'Thu',
    nifty:  { strike: '+2', expiry: 'nearWk', dte: 0, entry: '09:20', exit: '15:15', cum: '₹+48,386', win: '71%', margin: '~₹2.7L' },
    sensex: { strike: 'ATM', expiry: 'nearWk', dte: 1, entry: '10:00', exit: '15:15', cum: '₹+86,121', win: '75%', margin: '~₹2.5L' },
    primary: 'SENSEX',
    note: 'SENSEX 1-DTE full session. NIFTY 0-DTE OK only at +2 OTM (delta protection).' },
  { day: 'Fri',
    nifty:  { strike: '+1', expiry: 'nearWk', dte: 6, entry: '10:00', exit: '13:00', cum: '₹+49,927', win: '77%', margin: '~₹2.7L' },
    sensex: { strike: 'ATM', expiry: 'nearWk', dte: 0, entry: '10:00', exit: '13:30', cum: '₹+23,831', win: '71%', margin: '~₹2.5L' },
    primary: 'NIFTY',
    note: 'NIFTY next-week (6-DTE) +1 OTM. SENSEX 0-DTE — exit 13:30 sharp.' },
];

const TODAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function LegCell({ leg, isPrimary }) {
  const strikeColor = leg.strike === 'ATM' ? '#60a5fa' : '#fbbf24';
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
        <span style={{ marginLeft: 6, color: strikeColor, fontSize: 11 }}>[{leg.strike}]</span>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        DTE {leg.dte} · {leg.expiry} · {leg.margin}
      </div>
      <div style={{ color: '#34d399', fontSize: 11, fontFamily: 'monospace' }}>
        {leg.cum} · win {leg.win}
      </div>
    </div>
  );
}

export default function StraddleScheduleCard() {
  const todayName = TODAY_NAMES[new Date().getDay()];

  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #60a5fa' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span>🏆 ULTIMATE Straddle/Strangle Schedule — 3 lots</span>
        <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)' }}>
          3a: ₹+4.83L / 77 trades / 83% win · ~₹97K/mo · ⭐ = primary (₹4.4L margin)
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
        <strong style={{ color: '#f87171' }}>🔑 GOLDEN RULE — never hold expiry-day into last 90 min:</strong> Tue NIFTY exit 14:30. Fri SENSEX exit 13:30. This rule keeps every month positive.
        <br />
        <strong style={{ color: '#34d399' }}>⭐ Phase-3a (₹4.4L margin):</strong> Trade only the green-bordered ⭐ cell each day. 5 trades/wk. ₹+4.83L / 5 months = ~₹97K/mo. Worst single day in 5mo: ₹-10,833 (Tue Feb).
        <br />
        <strong style={{ color: '#fbbf24' }}>Phase-3b (~₹5.5L margin):</strong> Trade BOTH NIFTY + SENSEX cells daily. ₹+7.51L / 5mo ≈ ~₹1.50L/mo. Needs pledged collateral.
        <br />
        <strong style={{ color: '#60a5fa' }}>Setup — strike codes:</strong> [ATM]=at-the-money, [+1/+2/+3]=OTM offset (NIFTY ±50/100/150, SENSEX ±100/200/300). Strangle = sell CE@ATM+offset AND PE@ATM−offset (3 lots each). Always nearest weekly expiry, 3 lots.
        <br />
        <strong style={{ color: '#a78bfa' }}>ⓘ Caveats:</strong> Tuned on 12–18 samples/bucket (5 months). Win rates will drift ±10%. Re-run <code>ultimate_sweep.py</code> after any exchange calendar shift.
      </div>
    </div>
  );
}
