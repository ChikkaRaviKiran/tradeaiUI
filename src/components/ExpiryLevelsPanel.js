import React, { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { fetchExpiryLevels, fetchExpiryLevelsStatus, triggerExpiryLevelsRecompute } from '../api';

const INDICES = ['NIFTY', 'SENSEX'];

const R_COLORS = { r1: '#ef4444', r2: '#f87171', r3: '#fca5a5' };
const S_COLORS = { s1: '#10b981', s2: '#34d399', s3: '#6ee7b7' };

function ExpiryLevelChart({ title, data }) {
  if (!data || data.status !== 'ok') {
    return (
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
        <strong>{title}:</strong> {data?.notes || 'not enough history yet.'}
      </div>
    );
  }

  const levels = [
    { key: 'r3', label: 'R3', value: data.r3, color: R_COLORS.r3 },
    { key: 'r2', label: 'R2', value: data.r2, color: R_COLORS.r2 },
    { key: 'r1', label: 'R1', value: data.r1, color: R_COLORS.r1 },
    { key: 's1', label: 'S1', value: data.s1, color: S_COLORS.s1 },
    { key: 's2', label: 'S2', value: data.s2, color: S_COLORS.s2 },
    { key: 's3', label: 'S3', value: data.s3, color: S_COLORS.s3 },
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        <strong>{title}</strong>: {data.period_start} &rarr; {data.period_end}
        {' · '}H {data.high?.toFixed(2)} / L {data.low?.toFixed(2)} / C {data.close?.toFixed(2)}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data.candles || []} margin={{ top: 5, right: 55, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={20} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={65} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }} />
          <Line type="monotone" dataKey="close" stroke="#e5e7eb" dot={false} strokeWidth={1.5} name="Close" isAnimationActive={false} />
          {levels.map((lvl) => (lvl.value == null ? null : (
            <ReferenceLine
              key={lvl.key}
              y={lvl.value}
              stroke={lvl.color}
              strokeDasharray={lvl.key.startsWith('r') ? undefined : '4 3'}
              label={{ value: `${lvl.label} ${lvl.value.toFixed(1)}`, position: 'right', fill: lvl.color, fontSize: 10 }}
            />
          )))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpiryLevelsCard({ symbol, refreshTick }) {
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [w, m] = await Promise.all([
        fetchExpiryLevels(symbol, 'weekly'),
        fetchExpiryLevels(symbol, 'monthly'),
      ]);
      setWeekly(w?.data || null);
      setMonthly(m?.data || null);
      setError('');
    } catch {
      setError(`Failed to load ${symbol} expiry levels.`);
    }
  }, [symbol]);

  useEffect(() => { load(); }, [load, refreshTick]);

  return (
    <div className="card" style={{ flex: 1, minWidth: 420 }}>
      <h3 style={{ margin: 0 }}>{symbol}</h3>
      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}
      <ExpiryLevelChart title="Weekly (Wed → Tue)" data={weekly} />
      <ExpiryLevelChart title="Monthly" data={monthly} />
    </div>
  );
}

export default function ExpiryLevelsPanel() {
  const [recomputing, setRecomputing] = useState(false);
  const [status, setStatus] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    fetchExpiryLevelsStatus().then((r) => setStatus(r?.data || null)).catch(() => {});
  }, [refreshTick]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await triggerExpiryLevelsRecompute();
    } finally {
      setRecomputing(false);
      setRefreshTick((t) => t + 1);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>Weekly & Monthly Expiry Levels</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, maxWidth: 640 }}>
            Classic pivot 3 resistance + 3 support levels only (no Camarilla mixed in).
            Weekly auto-recomputes every <strong>Wednesday</strong> morning (Wed&rarr;Tue expiry cycle);
            Monthly auto-recomputes at the <strong>start of a new month</strong>.
            <strong> Informational only</strong> — nothing here places orders for you.
          </p>
        </div>
        <button className="btn" onClick={handleRecompute} disabled={recomputing}>
          {recomputing ? 'Recomputing…' : 'Recompute Now'}
        </button>
      </div>

      {status?.next_run_at && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Next scheduled check: {new Date(status.next_run_at).toLocaleString('en-IN')}
          {status.last_error ? ` · last error: ${status.last_error}` : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {INDICES.map((sym) => <ExpiryLevelsCard key={sym} symbol={sym} refreshTick={refreshTick} />)}
      </div>
    </div>
  );
}
