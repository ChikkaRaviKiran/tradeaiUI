import React, { useEffect, useState } from 'react';
import { fetchLevelZones } from '../api';

const INDICES = ['NIFTY', 'SENSEX'];
const CLASSIC_ORDER = ['R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3'];
const CAMARILLA_ORDER = ['R4', 'R3', 'R2', 'R1', 'S1', 'S2', 'S3', 'S4'];

function PivotBlock({ label, block, prefix }) {
  if (!block) {
    return (
      <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
        {label}: not enough history yet.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        {label}: {block.start} to {block.end} · H {block.high.toFixed(2)} · L {block.low.toFixed(2)} · C {block.close.toFixed(2)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><td colSpan={2} style={{ color: '#64748b', paddingBottom: 2 }}>Classic Pivots</td></tr>
          </thead>
          <tbody>
            {CLASSIC_ORDER.map((k) => (
              <tr key={k}>
                <td style={{ color: '#94a3b8', padding: '1px 6px 1px 0' }}>{k}</td>
                <td style={{ textAlign: 'right', fontWeight: k === 'P' ? 700 : 400 }}>
                  {block[`${prefix}_pivot_${k}`]?.toFixed(2) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><td colSpan={2} style={{ color: '#64748b', paddingBottom: 2 }}>Camarilla</td></tr>
          </thead>
          <tbody>
            {CAMARILLA_ORDER.map((k) => (
              <tr key={k}>
                <td style={{ color: '#94a3b8', padding: '1px 6px 1px 0' }}>{k}</td>
                <td style={{ textAlign: 'right' }}>
                  {block[`${prefix}_camarilla_${k}`]?.toFixed(2) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ZonesLadder({ zones, spot }) {
  const items = [
    ...zones.map((z) => ({ ...z, isSpot: false })),
    { price: spot, isSpot: true, confidence: null, sources: [] },
  ].sort((a, b) => b.price - a.price);

  return (
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 6 }}>
      <tbody>
        {items.map((it) => {
          if (it.isSpot) {
            return (
              <tr key="spot" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <td style={{ padding: '4px 6px', color: '#3b82f6', fontWeight: 700, width: 90 }}>
                  {it.price.toFixed(2)}
                </td>
                <td style={{ padding: '4px 6px', color: '#3b82f6', fontWeight: 700 }}>&larr; Spot</td>
              </tr>
            );
          }
          const isResistance = it.price > spot;
          return (
            <tr key={`${it.price}-${it.sources.join('|')}`} style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ padding: '4px 6px', color: isResistance ? '#ef4444' : '#10b981', fontWeight: 700, width: 90 }}>
                {it.price.toFixed(2)}
              </td>
              <td style={{ padding: '4px 6px' }}>
                <span style={{
                  background: '#1e293b', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginRight: 6,
                }}>
                  x{it.confidence}
                </span>
                <span style={{ color: '#64748b' }}>{it.sources.join(', ')}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LevelZonesCard({ symbol, data }) {
  if (!data || data.status !== 'ok') {
    return (
      <div className="card" style={{ flex: 1, minWidth: 380 }}>
        <h3 style={{ margin: 0 }}>{symbol}</h3>
        <p style={{ color: '#94a3b8', marginTop: 12 }}>
          {data?.notes || 'No data available.'}
        </p>
      </div>
    );
  }
  return (
    <div className="card" style={{ flex: 1, minWidth: 380 }}>
      <h3 style={{ margin: 0 }}>{symbol}</h3>
      <div style={{ fontSize: 13, marginTop: 6 }}>
        <span style={{ color: '#94a3b8' }}>Spot: </span>{data.spot.toFixed(2)}
      </div>

      <PivotBlock label="Weekly (prior completed week)" block={data.weekly} prefix="weekly" />
      <PivotBlock label="Monthly (prior completed month)" block={data.monthly} prefix="monthly" />

      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
        Confluence zones (weekly + monthly pivots, recent swing highs/lows, round numbers) &mdash; the
        "x" count is how many independent sources agree, higher = stronger zone:
      </div>
      <ZonesLadder zones={data.zones} spot={data.spot} />
    </div>
  );
}

export default function LevelZonesPanel() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const results = await Promise.all(INDICES.map((sym) => fetchLevelZones(sym)));
        if (!cancelled) {
          const map = {};
          INDICES.forEach((sym, i) => { map[sym] = results[i]?.data; });
          setData(map);
        }
      } catch {
        if (!cancelled) setError('Failed to load level zones.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h2 style={{ margin: 0 }}>Weekly / Monthly Support &amp; Resistance</h2>
      <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, maxWidth: 640 }}>
        Higher-timeframe pivots and confluence zones, for your own reference when planning directional
        (buy) trades. <strong>Informational only</strong> &mdash; no strategy or auto-execution is attached to this.
      </p>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading&hellip;</p>
      ) : error ? (
        <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          {INDICES.map((sym) => (
            <LevelZonesCard key={sym} symbol={sym} data={data[sym]} />
          ))}
        </div>
      )}
    </div>
  );
}
