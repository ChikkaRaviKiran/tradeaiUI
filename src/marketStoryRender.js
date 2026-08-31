/* Market Story renderers.
 *
 * A direct port of the AgenticTrading positioning page controller. The browser
 * formats and colours; it does not decide anything. Everything below renders
 * `payload.view`, which is assembled server-side by app/positioning/view.py. A
 * direction computed in JavaScript would be a second implementation of the only
 * conclusion on the page, and the two would drift.
 *
 * These are pure functions returning HTML strings so the markup stays identical
 * to the original page. Every interpolated value passes through `esc`.
 */

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const num = (v, dp = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(dp));

export const FIRST_MARK = '09:30';

export function summaryHtml(payload) {
  const s = payload.latest;
  if (!s) {
    return {
      summary: '<p class="muted">Nothing recorded for this session yet.</p>',
      coverage: '',
    };
  }
  const open = payload.opening || {};
  const drift = (a, b) => (a == null || b == null ? '' :
    ` <span class="muted">(${a - b >= 0 ? '+' : ''}${(a - b).toFixed(0)} today)</span>`);

  const summary = `
    <div><span>Time</span><b>${esc(s.at.slice(11, 16))}</b></div>
    <div><span>Spot</span><b>${num(s.spot)}</b></div>
    <div><span>PCR</span><b>${num(s.pcr, 3)}</b></div>
    <div><span>ATM IV</span><b>${num(s.atm_iv, 1)}</b></div>
    <div><span>Heaviest call</span><b>${num(s.heaviest_call, 0)}${drift(s.heaviest_call, open.heaviest_call)}</b></div>
    <div><span>Heaviest put</span><b>${num(s.heaviest_put, 0)}${drift(s.heaviest_put, open.heaviest_put)}</b></div>
    <div><span>Max pain</span><b>${num(s.max_pain, 0)}</b></div>
    <div><span>Strikes</span><b>${s.strikes}</b></div>`;

  // Coverage is stated because a timeline built from four snapshots looks
  // identical to one built from seventy, and only one of them is worth reading.
  // Counted INSIDE market hours only: out-of-hours polls store happily and
  // would otherwise pad the count with buckets that cannot contain behaviour.
  const cov = (payload.view || {}).coverage || {};
  const inSession = cov.in_session || 0;
  const expected = cov.expected || 75;
  const clipped = (payload.view || {}).clipped
    ? ` ${cov.total - inSession} bucket(s) outside market hours are excluded from`
      + ` the reading, which is taken at ${(payload.view || {}).reading_at}.`
    : '';
  const coverage =
    `${inSession} in-session snapshot(s), ${cov.first || ''}`
    + `–${cov.last || ''}. A full session is about ${expected}. `
    + (inSession < 12
      ? 'Too few to read a timeline from — gaps look the same as calm.'
      : 'Behaviour needs three consecutive snapshots to be called strong, so gaps suppress it.')
    + clipped;

  return { summary, coverage };
}

/* Provenance, stated on the page rather than inferred from how full it looks.
 * A rebuilt session reads a five-minute bar close where a live poll reads last
 * traded price, and covers a narrower strike ladder, so the two are not the
 * same observation even though they render identically. */
const SOURCE_NOTE = {
  live: 'Polled live during the session.',
  rolling: 'Rebuilt after the close from the expired-options rolling API. '
    + 'Premium is a 5-minute bar close, not last traded price, and the ladder '
    + 'is capped at ATM±10, so strike totals and max pain are truncated.',
};

export function sourceHtml(payload) {
  const mix = payload.sources || {};
  const names = Object.keys(mix);
  if (!names.length) return '';
  const chips = names.map((n) =>
    `<span class="src src-${esc(n)}">${esc(n)} · ${mix[n]} bucket(s)</span>`).join('');
  const notes = names.map((n) =>
    `<div class="muted">${esc(SOURCE_NOTE[n] || 'Unknown origin.')}</div>`).join('');
  const warn = names.length > 1
    ? '<div class="src-warn">This session mixes sources. Buckets from '
      + 'different sources are not comparable, and a change measured across '
      + 'the join is an artefact of the join.</div>'
    : '';
  return `<div class="src-row">${chips}</div>${notes}${warn}`;
}

/* The bar length is the measured percentage change, clamped for display at
 * 25%. It is not a strength rating. Anything that looked like a rating would
 * be a confidence number drawn as a picture, which is the thing this page is
 * explicitly not allowed to invent. */
export function boardHtml(payload) {
  const rows = payload.scoreboard || [];
  if (!rows.length) return '<p class="muted">Nothing recorded yet.</p>';
  return rows.map((r) => {
    const pct = r.change_pct;
    const width = pct === null ? 0 : Math.min(Math.abs(pct), 25) / 25 * 100;
    const dir = pct === null ? 'flat' : (pct > 0 ? 'up' : (pct < 0 ? 'down' : 'flat'));
    const label = pct === null ? 'no comparable earlier snapshot'
      : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% over ${r.window_min} min`;
    return `
      <div class="bd">
        <div class="bd-name">${esc(r.name)}</div>
        <div class="bd-value">${esc(r.value)}</div>
        <div class="bd-bar"><i class="${dir}" style="width:${width.toFixed(0)}%"></i></div>
        <div class="bd-change ${dir}">${esc(label)}</div>
        <div class="bd-measure muted">${esc(r.measure)}</div>
      </div>`;
  }).join('');
}

/* The four questions, always in the same order and always all four. A live
 * feed whose shape moves with its content cannot be skimmed, and skimming is
 * the only way anyone reads one of these during a session. */
const PARTS = [
  ['changed', 'What changed', 'Nothing new cleared the filters.'],
  ['stopped', 'What stopped', 'Nothing that was running has ended.'],
  ['continuing', 'Continuing', 'Nothing carried over.'],
  ['observe', 'Observe next', 'Nothing to watch yet.'],
];

function partsHtml(s, sections) {
  const src = sections || s;
  return PARTS.map(([key, title, empty]) => {
    const lines = src[key] || [];
    const body = lines.length
      ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : `<p class="muted">${esc(empty)}</p>`;
    return `<div class="part part-${key}"><em>${title}</em>${body}</div>`;
  }).join('');
}

export function storyHtml(payload) {
  const v = payload.view || {};
  const s = v.story || {};
  const lines = s.lines || [];
  if (!lines.length) {
    return {
      html: '<p class="muted">Not enough snapshots for a story yet.</p>',
      time: '',
    };
  }
  return {
    html: `<div class="story">
      <p class="story-lines">${lines.map((l) => esc(l)).join(' ')}</p>
    </div>`,
    time: v.reading_at ? `as at ${v.reading_at} · index ${num(v.spot)}` : '',
  };
}

export function alertsHtml(payload) {
  const rows = payload.alerts || [];
  if (!rows.length) return '<p class="muted">No active alerts.</p>';
  return `<ul class="reasons">${rows.map((a) => {
    const cls = `a-${esc(String(a.level || 'info').toLowerCase())}`;
    const lvl = esc(String(a.level || 'info').toUpperCase());
    const at = a.at ? ` <span class="muted">@ ${esc(a.at)}</span>` : '';
    const src = a.source ? ` <span class="muted">(${esc(a.source)})</span>` : '';
    return `<li class="${cls}"><strong>[${lvl}] ${esc(a.title || 'Alert')}</strong>${at}${src}<br>${esc(a.message || '')}</li>`;
  }).join('')}</ul>`;
}

/* The page reports on the quarter hour while collection runs every five
 * minutes. The gap is stated rather than left for the reader to assume away. */
export function cadenceHtml(payload) {
  const v = payload.view || {};
  if (!v.available) return null;
  if (!v.on_grid) {
    return `<span class="cad-warn">Before the first ${v.report_minutes}-minute
      reading of the day.</span> Showing the latest five-minute snapshot
      (${esc(v.data_at)}) until ${esc(FIRST_MARK)}.`;
  }
  const lag = v.data_lag_min > 0
    ? `Collected through ${esc(v.data_at)}, ${v.data_lag_min} min newer than this reading.`
    : 'Collection is level with this reading.';
  const next = v.next_reading_at
    ? ` Next reading at <b>${esc(v.next_reading_at)}</b>.` : ' The session has closed.';
  return `Reporting every ${v.report_minutes} minutes, as at
    <b>${esc(v.reading_at)}</b>. ${lag} Detection runs every five minutes and
    loses nothing.${next}`;
}

/* Tone drives colour only. The label itself is computed server-side from a
 * fixed weight table and is never re-derived here. */
export function dirTone(label) {
  if (!label || label === 'Neutral') return 'flat';
  return label.endsWith('Bullish') ? 'up' : 'down';
}

export function directionHtml(payload) {
  const v = payload.view || {};
  const d = v.direction;
  const st = v.stability || {};
  if (!d) return '<p class="muted">Not enough data for a direction view.</p>';

  const tone = dirTone(d.label);
  const stable = st.stable_since
    ? `stable since ${esc(st.stable_since)} · ${esc(st.duration)}`
    : 'no history yet';
  const flips = st.changes
    ? `changed ${st.changes} time(s) today` : 'no changes today';
  /* The reading time first. "Stable since 09:45" was the most prominent time on
   * this card and it is a duration anchor, not the moment of the reading, so a
   * card that had just updated looked exactly like one that had stopped. */
  const next = v.next_reading_at
    ? ` · next reading ${esc(v.next_reading_at)}` : ' · session closed';
  const warn = st.unstable
    ? '<div class="src-warn">Direction has changed often today. The current '
      + 'bias may be unstable.</div>' : '';

  return `
    <div class="dir dir-${tone}">
      <div class="dir-label"><span class="dir-dot"></span>${esc(d.label)}</div>
      <div class="dir-meta"><b>as at ${esc(v.reading_at || d.at)}</b> · ${stable}
        · ${flips}${next}</div>
    </div>
    ${warn}
    <div class="dir-cols">
      <div class="part"><em>Why</em>
        <ul>${(d.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
      <div class="part part-counter"><em>Counterpoints</em>
        <ul>${(d.counterpoints || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
    </div>
    <p class="dir-disc muted">${esc(d.disclaimer)}</p>`;
}

export function fieldsHtml(payload) {
  const rows = (payload.view || {}).positioning || [];
  if (!rows.length) return '<p class="muted">Nothing recorded yet.</p>';
  return rows.map((f) => `
    <div class="fd">
      <div class="fd-name">${esc(f.name)}</div>
      <div class="fd-value">${esc(f.value)}</div>
      <div class="fd-status">${esc(f.status)}</div>
      <div class="fd-dur">${f.duration ? esc(f.duration) : ''}${
        f.duration ? ' · ' : ''}updated ${esc(f.updated)}</div>
      <div class="fd-measure muted">${esc(f.measure)}</div>
    </div>`).join('');
}

const CHANGE_PARTS = [
  ['changed', 'What changed', 'Nothing new cleared the filters.'],
  ['stopped', 'What stopped', 'Nothing that was running has ended.'],
  ['continuing', 'What continues', 'Nothing carried over.'],
];

export function changesHtml(payload) {
  const c = (payload.view || {}).changes || {};
  return CHANGE_PARTS.map(([key, title, empty]) => {
    const lines = c[key] || [];
    const body = lines.length
      ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : `<p class="muted">${esc(empty)}</p>`;
    return `<div class="part part-${key}"><em>${title}</em>${body}</div>`;
  }).join('');
}

export function watchHtml(payload) {
  const lines = (payload.view || {}).watch_next || [];
  return lines.length
    ? `<ul class="watch">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : '<p class="muted">Nothing to watch yet.</p>';
}

export function phasesHtml(payload) {
  const rows = (payload.view || {}).phases || [];
  return rows.length
    ? rows.map((p) => `
      <div class="ph">
        <div class="ph-time">${esc(p.from)}–${esc(p.to)}</div>
        <div class="ph-name">${esc(p.name)}</div>
        <div class="ph-min muted">${p.minutes} min</div>
      </div>`).join('')
    : '<p class="muted">No phase lasted long enough to report.</p>';
}

/* One row per quarter hour. `moved` is flagged rather than left to the reader
 * to spot, because the point of a list this long is finding the four rows where
 * something actually turned. */
export function checkpointsHtml(payload) {
  const rows = (payload.view || {}).checkpoints || [];
  if (!rows.length) return '<p class="muted">No quarter-hour reading yet.</p>';
  return rows.map((c) => {
    const band = c.support !== null && c.resistance !== null
      ? `${c.support}–${c.resistance}` : '—';
    return `
      <div class="cp${c.moved ? ' cp-moved' : ''}">
        <div class="cp-time">${esc(c.at)}</div>
        <div class="cp-dir dir-${dirTone(c.label)}">
          <span class="dir-dot"></span>${esc(c.label)}
        </div>
        <div class="cp-spot">${c.spot === null ? '—' : c.spot.toFixed(0)}</div>
        <div class="cp-band muted">${esc(band)}</div>
        <div class="cp-note">${esc(c.summary)}</div>
      </div>`;
  }).join('');
}

/* The arithmetic, shown in full so the label above can be argued with. */
export function devDirectionHtml(payload) {
  const d = (payload.view || {}).direction;
  if (!d) return '<p class="muted">Nothing computed.</p>';
  const rows = (d.contributors || []).map((c) => `
    <div class="bd">
      <div class="bd-name">${esc(c.kind)}</div>
      <div class="bd-value ${c.weight > 0 ? 'up' : 'down'}">${c.weight > 0 ? '+' : ''}${c.weight}</div>
      <div class="bd-change">${esc(c.label)} — ${esc(c.detail)}</div>
    </div>`).join('');
  return `${rows || '<p class="muted">No contributors.</p>'}
    <p class="note muted">bullish ${d.bullish} · bearish ${d.bearish}
      · net ${d.net} → <b>${esc(d.label)}</b>. A behaviour counts once however
      many strikes carry it, and at least two independent behaviours are
      required before the label may leave Neutral.</p>`;
}

export function trendHtml(payload, showLow) {
  const all = (payload.stories || []).slice().reverse();
  const rows = showLow ? all : all.filter((s) => s.importance !== 'LOW');
  if (!rows.length) {
    return all.length
      ? '<p class="muted">Every update so far was quiet. Tick the box to see them.</p>'
      : '<p class="muted">No updates yet.</p>';
  }
  return rows.map((s) => `
    <div class="story sm">
      <div class="story-head">
        <span class="ev-time">${esc(s.from)} → ${esc(s.at)}</span>
        <span class="imp ${esc(s.importance)}">${esc(s.importance)}</span>
        <span class="muted">index ${num(s.spot)}</span>
      </div>
      ${partsHtml(s)}
    </div>`).join('');
}

/* `shown`, not `state`. Whether a behaviour is on its first bucket or its
 * fourth changes nothing about where to look; the five streak states stay in
 * the payload for later study and out of the reader's way. */
function eventHtml(e) {
  const strike = e.strike ? ` · ${Number(e.strike).toFixed(0)}` : '';
  return `
    <div class="ev ${esc(e.severity)}">
      <div class="ev-head">
        <span class="ev-time">${esc(e.at)}</span>
        <span class="ev-name">${esc(e.behaviour)}${esc(strike)}</span>
        <span class="ev-state st-${esc(e.shown)}">${esc(e.shown)}</span>
        <span class="ev-spot">index ${num(e.spot)}</span>
      </div>
      <div class="ev-q"><em>What changed</em>
        <ul>${e.evidence.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="ev-q"><em>Commonly read as<span class="untested">untested</span></em>
        <p>${esc(e.commonly_read_as)}</p>
      </div>
      <div class="ev-q"><em>Watch next</em><p>${esc(e.watch_next)}</p></div>
    </div>`;
}

export function activeHtml(payload) {
  if (!payload.active || !payload.active.length) return '<p class="muted">Nothing active.</p>';
  return payload.active.map(eventHtml).join('');
}

export function timelineHtml(payload) {
  if (!payload.timeline || !payload.timeline.length) {
    return '<p class="muted">No behaviour detected yet.</p>';
  }
  /* The engine emits a line per state change; the reader sees three statuses.
   * Without this collapse one episode prints "active" three times, which is
   * the streak leaking back out through the timeline. */
  const seen = new Map();
  const rows = payload.timeline.filter((e) => {
    if (seen.get(e.key) === e.shown) return false;
    seen.set(e.key, e.shown);
    return true;
  });
  return rows.reverse().map(eventHtml).join('');
}

/* The rewrite is shown beside the computed paragraph, never instead of it. If
 * the editor rejected the draft the reasons are shown, because a guard that
 * fires silently teaches nobody anything. */
export function rewriteHtml(out) {
  const ok = out.source === 'llm';
  return `
    <div class="rewrite ${ok ? 'ok' : 'bad'}">
      <div class="story-head">
        <span class="imp ${ok ? 'MEDIUM' : 'CRITICAL'}">${ok ? 'rewritten' : 'rejected'}</span>
        <span class="muted">${esc(out.model || '')}</span>
        <span class="untested">untested</span>
      </div>
      ${ok ? `<p class="story-lines">${esc(out.story)}</p>`
          : `<p class="muted">The rewrite was discarded and the computed wording kept.</p>
             <ul class="why">${(out.rejected || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`}
    </div>`;
}

/* --- session clock ------------------------------------------------------ */

export function istNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hhmm: `${get('hour')}:${get('minute')}`,
  };
}

export function inMarketHours(hhmm) {
  return hhmm >= '09:15' && hhmm <= '15:30';
}

export function floorTo5(hhmm) {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  const fm = Math.floor(m / 5) * 5;
  return `${String(h).padStart(2, '0')}:${String(fm).padStart(2, '0')}`;
}

export function msToNextQuarter() {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(Math.floor(now.getMinutes() / 15) * 15 + 15);
  return Math.max(1000, next.getTime() - now.getTime());
}
