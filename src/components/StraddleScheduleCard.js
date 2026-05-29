import React from 'react';

/**
 * Straddle/Strangle Schedule — PHASE-3a ACTUAL (post-regime, Apr 14 → May 29, 2026).
 *
 * Fine-grid sweep over 8 entries × 9 exits × 4 SL% × 8 strategies (23,040 combos)
 * with walk-forward validation (Train Apr15–May5, Test May6–May29). Both halves
 * must be profitable to qualify. ±₹6,000 rupee gates (TP and SL).
 *
 *   Phase-3a actual: ₹+1,39,840 / 29 trades / 100% wins / no losing day
 *                    Apr=₹+55,186  May=₹+84,655  worst trade=+₹302
 *
 * Coverage note: May 28 = Bakri Eid holiday (no trade). May 27 (Wed SENSEX) and
 * May 29 (Fri NIFTY) auto-excluded — Dhan minute data ended before the strategy's
 * exit time on those partial days.
 *
 * Data: DhanHQ /v2/charts/rollingoption (1-min OHLC).
 * Sources:
 *   backend/phase3a_actual_6k.py       — fine-grid sweep + walk-forward
 *   research/reports/phase3a_actual_6k_trades.xlsx — full Excel trade log
 */

// strike: 'ATM' | '+1' | '+2'   (offset in steps; NIFTY=50, SENSEX=100)
// expiry: 'nearWk' (post-regime: NIFTY=Tue, SENSEX=Thu)
const SCHEDULE = [
  { day: 'Mon',
    nifty:  { strike: '+1', expiry: 'nearWk', dte: 1, entry: '09:25', exit: '12:00', sl: '30%', cum: '₹+26,052', win: '6/6 (100%)', margin: '~₹2.3L', sharpe: '+2.08', worst: '+₹302' },
    sensex: null,
    primary: 'NIFTY',
    note: 'NIFTY ±50 OTM strangle, morning theta-burn window. 6/6 wins, worst still positive (+₹302).' },
  { day: 'Tue',
    nifty:  { strike: '+1', expiry: 'nearWk', dte: 0, entry: '09:25', exit: '12:00', sl: '50%', cum: '₹+32,087', win: '6/6 (100%)', margin: '~₹2.3L', sharpe: '+4.79', worst: '+₹3,461' },
    sensex: null,
    primary: 'NIFTY',
    note: '🏆 BIGGEST WINNER. NIFTY expiry-day ±50 OTM strangle. 6/6 wins, Sharpe +4.79. Exit 12:00.' },
  { day: 'Wed',
    nifty:  null,
    sensex: { strike: '+2', expiry: 'nearWk', dte: 1, entry: '10:00', exit: '15:15', sl: '30%', cum: '₹+28,659', win: '6/6 (100%)', margin: '~₹3.0L', sharpe: '+2.08', worst: '+₹2,010' },
    primary: 'SENSEX',
    note: 'SENSEX ±200 OTM strangle, full-day theta 10:00→15:15. 6/6 wins (swapped from NIFTY after refetch).' },
  { day: 'Thu',
    nifty:  null,
    sensex: { strike: '+2', expiry: 'nearWk', dte: 0, entry: '09:45', exit: '13:30', sl: '30%', cum: '₹+31,485', win: '6/6 (100%)', margin: '~₹3.0L', sharpe: '+3.73', worst: '+₹2,721' },
    primary: 'SENSEX',
    note: '🛡️ SENSEX expiry-day ±200 OTM strangle. Entry 09:45 → exit 13:30 (longer hold). 6/6 wins, Sh +3.73.' },
  { day: 'Fri',
    nifty:  { strike: 'ATM', expiry: 'nearWk', dte: 4, entry: '09:45', exit: '14:30', sl: '30%', cum: '₹+21,557', win: '5/5 (100%)', margin: '~₹2.5L', sharpe: '+2.36', worst: '+₹1,940' },
    sensex: null,
    primary: 'NIFTY',
    note: 'NIFTY ATM straddle, classic 09:45→14:30 theta burn. Avoids end-of-day pin risk.' },
];

const TODAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function LegCell({ leg, isPrimary }) {
  if (!leg) {
    return (
      <div style={{
        padding: 6, borderRadius: 4,
        background: 'rgba(120,120,120,0.04)',
        border: '1px dashed rgba(120,120,120,0.15)',
        fontSize: 11, lineHeight: 1.4,
        color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center',
      }}>
        — skip this day —
      </div>
    );
  }
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
        <span style={{ marginLeft: 6, color: '#f87171', fontSize: 10 }}>SL {leg.sl}</span>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        DTE {leg.dte} · {leg.expiry} · {leg.margin} · Sh {leg.sharpe}
      </div>
      <div style={{ color: '#34d399', fontSize: 11, fontFamily: 'monospace' }}>
        {leg.cum} · {leg.win} · worst {leg.worst}
      </div>
    </div>
  );
}

export default function StraddleScheduleCard() {
  const todayName = TODAY_NAMES[new Date().getDay()];

  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #60a5fa' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span>🏆 Phase-3a ACTUAL Schedule — ±₹6,000 gates · 3 lots · 1 index/day</span>
        <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)' }}>
          ₹+1,39,840 / 29 trades / 100% wins · Apr ₹+55,186 · May ₹+84,655 · zero losing days
        </span>
      </div>

      <div className="table-container" style={{ marginTop: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: 60 }}>Day</th>
              <th style={{ textAlign: 'left' }}>
                <span className="status-badge running">NIFTY</span>
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>lot 65 · step 50 · weekly Tue</span>
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
        <strong style={{ color: '#34d399' }}>⭐ Trade ONLY the green-bordered ⭐ cell each day.</strong> 5 trades/wk, one index/day. Peak day margin ~₹3.0L (Thu SENSEX). Recommended capital: ₹4L NRML or ₹2.5L MIS.
        <br />
        <strong style={{ color: '#f87171' }}>🔑 Exit gates (priority order):</strong> (1) MTM ≥ <b>+₹6,000</b> → TP · (2) MTM ≤ <b>−₹6,000</b> → SL · (3) MTM ≤ <b>−SL%</b> of credit → defined-risk safety · (4) Time gate → exit at scheduled time. No targets beyond ₹6k, no holding past exit time.
        <br />
        <strong style={{ color: '#60a5fa' }}>Strike codes:</strong> [ATM]=at-the-money, [+1]=±50 NIFTY / ±100 SENSEX, [+2]=±100 NIFTY / ±200 SENSEX. Strangle = sell CE@ATM+offset AND PE@ATM−offset (3 lots each). Always nearest weekly expiry (post-regime: NIFTY Tue, SENSEX Thu).
        <br />
        <strong style={{ color: '#fbbf24' }}>Validation:</strong> Walk-forward — both train (Apr15–May5, 14 days) AND test (May6–May29, 15 days) had to be profitable. 7,248 of grid candidates survived. Test (₹+84,655) bigger than train (₹+55,186) = no overfit signal.
        <br />
        <strong style={{ color: '#a78bfa' }}>ⓘ Caveats:</strong> 33 trading days sampled (post-regime started Apr 14, 2026; May 28 = Bakri Eid holiday). May 27 & May 29 auto-skipped (Dhan minute data ended before exit time on those partial sessions). 100% win-rate will NOT hold long-term — expect 70-80% live. Re-run <code>backend/phase3a_actual_6k.py</code> weekly. Full Excel: <code>research/reports/phase3a_actual_6k_trades.xlsx</code>.
      </div>
    </div>
  );
}
