/* Market Story — the option positioning observer.
 *
 * A port of the AgenticTrading /positioning page. Deliberately standalone: it
 * is an experimental observer that should be able to break, be rewritten, or be
 * deleted without any of the trading dashboard being touched. It reads nothing
 * into the trading pipeline and never emits a trade instruction.
 *
 * The section bodies are rendered as HTML strings by marketStoryRender.js so the
 * markup matches the original page exactly. Every interpolated value passes
 * through that module's `esc`, so nothing reaches the DOM unescaped.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPositioning,
  fetchPositioningSessions,
  narratePositioning,
  pollPositioning,
} from '../api';
import {
  activeHtml,
  alertsHtml,
  boardHtml,
  cadenceHtml,
  changesHtml,
  checkpointsHtml,
  devDirectionHtml,
  directionHtml,
  fieldsHtml,
  floorTo5,
  inMarketHours,
  istNow,
  msToNextQuarter,
  phasesHtml,
  rewriteHtml,
  sourceHtml,
  storyHtml,
  summaryHtml,
  timelineHtml,
  trendHtml,
  watchHtml,
} from '../marketStoryRender';
import '../marketStory.css';

const AUTO_INTERVAL = 15 * 60 * 1000;

const BAD_RESPONSE = 'Backend is unreachable — the positioning API returned an unexpected response.';

// The dev/static server answers unknown /api paths with the SPA index.html and
// a 200, so axios does not raise. Check the shape before trusting it.
const isJsonObject = (data) => !!data && typeof data === 'object' && !Array.isArray(data);

const errorText = (err) =>
  err?.response?.data?.detail || err?.message || 'Request failed';

const Html = ({ html, ...rest }) => (
  <div {...rest} dangerouslySetInnerHTML={{ __html: html }} />
);

export default function MarketStory() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(istNow().date);
  const [latestBucket, setLatestBucket] = useState(null);
  const [payload, setPayload] = useState(null);
  const [rewrite, setRewrite] = useState('');
  const [error, setError] = useState('');
  const [showLow, setShowLow] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [narrating, setNarrating] = useState(false);

  // Refs rather than state for the auto-refresh bookkeeping: these are read
  // inside a timer callback and must never make it re-render.
  const sessionRef = useRef(currentSession);
  const payloadRef = useRef(null);
  const busyRef = useRef(false);
  const lastPollKeyRef = useRef(null);
  const lastCaptureKeyRef = useRef(null);

  const setSession = useCallback((day) => {
    sessionRef.current = day;
    setCurrentSession(day);
  }, []);

  const loadSessions = useCallback(async () => {
    const { data } = await fetchPositioningSessions();
    if (!isJsonObject(data)) throw new Error(BAD_RESPONSE);
    const today = istNow().date;
    const days = Array.from(new Set([today, ...(data.sessions || [])]));
    setSessions(days);
    if (!days.includes(sessionRef.current)) setSession(today);
    setLatestBucket(data.latest_bucket || null);
  }, [setSession]);

  const load = useCallback(async () => {
    try {
      const { data } = await fetchPositioning(sessionRef.current);
      if (!isJsonObject(data)) throw new Error(BAD_RESPONSE);
      payloadRef.current = data;
      setPayload(data);
      setError('');
    } catch (err) {
      payloadRef.current = null;
      setPayload(null);
      setError(errorText(err));
    }
  }, []);

  const autoTick = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await loadSessions();
      await load();

      const now = istNow();
      if (sessionRef.current !== now.date) {
        setSession(now.date);
        await load();
      }

      if (!inMarketHours(now.hhmm)) return;

      const bucket = floorTo5(now.hhmm);
      const captureKey = `${sessionRef.current}|${bucket}`;
      if (captureKey !== lastCaptureKeyRef.current) {
        const { data } = await pollPositioning();
        lastCaptureKeyRef.current = captureKey;
        await loadSessions();
        setSession(data.captured_at.slice(0, 10));
        await load();
      }

      // Keep quarter-hour story refresh logic too, in case a snapshot arrived
      // from another source and this tab only needs to repaint.
      const next = (payloadRef.current?.view || {}).next_reading_at;
      if (!next || now.hhmm < next) return;

      const pollKey = `${sessionRef.current}|${next}`;
      if (pollKey === lastPollKeyRef.current) return;
      lastPollKeyRef.current = pollKey;
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      busyRef.current = false;
    }
  }, [load, loadSessions, setSession]);

  // First paint: sessions, then the reading.
  useEffect(() => {
    (async () => {
      try {
        await loadSessions();
      } catch (err) {
        setError(errorText(err));
      }
      await load();
    })();
  }, [load, loadSessions]);

  // Auto refresh lands on the quarter hour rather than a fixed offset from
  // mount, because the readings themselves are computed on the quarter hour.
  useEffect(() => {
    if (!autoRefresh) return undefined;
    let interval = null;
    autoTick();
    const arm = setTimeout(() => {
      autoTick();
      interval = setInterval(autoTick, AUTO_INTERVAL);
    }, msToNextQuarter());
    return () => {
      clearTimeout(arm);
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, autoTick]);

  const onPickSession = async (e) => {
    setSession(e.target.value);
    await load();
  };

  const captureNow = async () => {
    setCapturing(true);
    try {
      const { data } = await pollPositioning();
      setError('');
      await loadSessions();
      setSession(data.captured_at.slice(0, 10));
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setCapturing(false);
    }
  };

  const narrate = async () => {
    const story = (payload?.view || {}).story || {};
    if (!(story.lines || []).length) {
      setRewrite('<p class="muted">No story to rewrite yet.</p>');
      return;
    }
    setNarrating(true);
    setRewrite('<p class="muted">Asking the local model. A cold load takes a while.</p>');
    try {
      const { data } = await narratePositioning(sessionRef.current);
      setRewrite(rewriteHtml(data));
      setError('');
    } catch (err) {
      setRewrite('');
      setError(errorText(err));
    } finally {
      setNarrating(false);
    }
  };

  const view = payload || {};
  const story = storyHtml(view);
  const cadence = payload ? cadenceHtml(view) : null;
  const { summary, coverage } = payload
    ? summaryHtml(view)
    : { summary: '', coverage: '' };

  return (
    <div className="market-story">
      <header className="topbar">
        <div className="brand">
          <span className={`dot${latestBucket ? ' on' : ''}`} />
          <h1>Market Story</h1>
          <span className="muted">
            {latestBucket ? `last snapshot ${latestBucket}` : 'no snapshots yet'}
          </span>
        </div>
        <div className="controls">
          <select title="recorded sessions" value={currentSession} onChange={onPickSession}>
            {sessions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button type="button" onClick={captureNow} disabled={capturing}>
            {capturing ? 'Capturing…' : 'Capture snapshot now'}
          </button>
          <label className="chk">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {' '}auto refresh
          </label>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        {/* The paragraph first. Everything above the fold answers "what is going
            on" without requiring the reader to know what a state machine is. */}
        <section className="card" id="story-card">
          <h2>
            Current market story{' '}
            <span className="muted" id="story-time">{story.time}</span>
          </h2>
          {cadence && <Html className="note muted" id="pos-cadence" html={cadence} />}
          <Html id="pos-story" html={payload ? story.html : '<p class="muted">Loading…</p>'} />
          <div className="story-tools">
            <button type="button" onClick={narrate} disabled={narrating}>
              {narrating ? 'Writing…' : 'Rewrite in plain English'}
            </button>
            <span className="muted">
              The local model may only reword the observations above. Every number
              is checked against them afterwards, and a rewrite that invents one
              or takes a side is discarded.
            </span>
          </div>
          <Html id="pos-rewrite" html={rewrite} />
        </section>

        <section className="card" id="alerts-card">
          <h2>Alerts</h2>
          <p className="note muted">
            Important changes distilled from this page. Observational only: alerts
            describe what changed and where to look next; they do not place orders.
          </p>
          <Html
            id="pos-alerts"
            html={payload ? alertsHtml(view) : '<p class="muted">No active alerts.</p>'}
          />
        </section>

        {/* The only derived conclusion on the page. */}
        <section className="card" id="dir-card">
          <h2>Direction view</h2>
          <p className="note muted">
            Recalculated on the quarter hour, not on every five-minute poll. A label
            that reconsiders itself every five minutes is a flicker rather than a
            faster read.
          </p>
          <Html
            id="pos-direction"
            html={payload ? directionHtml(view) : '<p class="muted">Loading…</p>'}
          />
        </section>

        <section className="card">
          <h2>Current positioning</h2>
          <p className="note muted">
            What each part of the chain is doing and how long it has been doing it.
            Duration is the point: a support strike one bucket old and one that has
            held for two hours are the same number and not the same information.
          </p>
          <Html
            id="pos-fields"
            html={payload ? fieldsHtml(view) : '<p class="muted">Nothing recorded yet.</p>'}
          />
          <p className="note muted" id="pos-coverage">{coverage}</p>
          <Html id="pos-source" className="note" html={payload ? sourceHtml(view) : ''} />
        </section>

        <section className="card">
          <h2>Last 15 minutes</h2>
          <Html
            id="pos-changes"
            html={payload ? changesHtml(view) : '<p class="muted">Nothing yet.</p>'}
          />
        </section>

        <section className="card">
          <h2>Watch next</h2>
          <p className="note muted">
            Where to look, never what to do. Every line is a question whose two
            answers are equally acceptable.
          </p>
          <Html
            id="pos-watch"
            html={payload ? watchHtml(view) : '<p class="muted">Nothing to watch yet.</p>'}
          />
        </section>

        <section className="card">
          <h2>Fifteen-minute readings</h2>
          <p className="note muted">
            One row per quarter hour on the clock — 09:30, 09:45, 10:00 — each
            recalculated at that moment rather than the closing reading carried
            backwards.
          </p>
          <Html
            id="pos-checkpoints"
            html={payload ? checkpointsHtml(view) : '<p class="muted">No readings yet.</p>'}
          />
        </section>

        <section className="card">
          <h2>Session timeline</h2>
          <p className="note muted">
            Behavioural phases rather than individual transitions. A behaviour that
            pauses for a bucket and resumes is one phase, not two.
          </p>
          <Html
            id="pos-phases"
            html={payload ? phasesHtml(view) : '<p class="muted">No phases yet.</p>'}
          />
        </section>

        {/* Everything the reader should not need. Still served, still correct,
            simply not the page. */}
        <section className="card" id="dev-card">
          <h2>Developer details</h2>
          <p className="note muted">
            The machinery underneath: state machine transitions, behaviour keys and
            the raw scoreboard. Nothing here is needed to read the page above it.
          </p>

          <details>
            <summary className="muted">Direction arithmetic</summary>
            <Html id="dev-direction" html={payload ? devDirectionHtml(view) : ''} />
          </details>

          <details>
            <summary className="muted">Scoreboard — measured percentage changes</summary>
            <Html id="pos-board" html={payload ? boardHtml(view) : ''} />
          </details>

          <details>
            <summary className="muted">Latest reading</summary>
            <Html className="pos-summary" id="pos-summary" html={summary} />
          </details>

          <details>
            <summary className="muted">Behaviour trend — every fifteen-minute update</summary>
            <label className="chk muted">
              <input
                type="checkbox"
                checked={showLow}
                onChange={(e) => setShowLow(e.target.checked)}
              />
              {' '}show quiet updates
            </label>
            <Html id="pos-trend" html={payload ? trendHtml(view, showLow) : ''} />
          </details>

          <details>
            <summary className="muted">Active now</summary>
            <Html id="pos-active" html={payload ? activeHtml(view) : ''} />
          </details>

          <details>
            <summary className="muted">Every behaviour change — one line per state transition</summary>
            <Html id="pos-timeline" html={payload ? timelineHtml(view) : ''} />
          </details>
        </section>
      </main>
    </div>
  );
}
