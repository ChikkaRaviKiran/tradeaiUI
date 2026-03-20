import React, { useState } from 'react';

const BIAS_COLORS = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#f59e0b',
};

const SIGNAL_LABELS = {
  strong_buy: { text: 'Strong Buy', color: '#16a34a' },
  buy: { text: 'Buy', color: '#22c55e' },
  neutral: { text: 'Neutral', color: '#f59e0b' },
  sell: { text: 'Sell', color: '#ef4444' },
  strong_sell: { text: 'Strong Sell', color: '#dc2626' },
  strong_bullish: { text: 'Strong Bullish', color: '#16a34a' },
  bullish: { text: 'Bullish', color: '#22c55e' },
  bearish: { text: 'Bearish', color: '#ef4444' },
  strong_bearish: { text: 'Strong Bearish', color: '#dc2626' },
  unavailable: { text: 'N/A', color: '#6b7280' },
};

function getSignalStyle(signal) {
  return SIGNAL_LABELS[signal] || SIGNAL_LABELS.unavailable;
}

export default function MarketIntelligence({ intelligence, onRefresh }) {
  const [showNews, setShowNews] = useState(false);
  const [newsData, setNewsData] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);

  if (!intelligence) {
    return (
      <div className="card" style={{ opacity: 0.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Pre-market analysis not yet available</span>
          {onRefresh && (
            <button className="btn btn-start" style={{ fontSize: 12, padding: '4px 12px' }} onClick={onRefresh}>
              Run Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const { insight, fii_dii, breadth } = intelligence;
  const bias = insight?.market_bias || 'neutral';
  const confidence = insight?.confidence || 0;
  const summary = insight?.summary || insight?.ai_summary || '';
  const plan = insight?.trading_plan || '';
  const keyLevels = insight?.key_levels || {};
  const scoreModifier = insight?.score_modifier || 0;
  const riskAdvice = insight?.risk_advice || 'normal';
  const observations = insight?.key_observations || [];
  const lessonsApplied = insight?.lessons_applied || [];

  const loadNews = async () => {
    if (newsData) {
      setShowNews(!showNews);
      return;
    }
    setLoadingNews(true);
    try {
      const resp = await fetch('/api/intelligence/news?days=2');
      const data = await resp.json();
      setNewsData(data.news || []);
      setShowNews(true);
    } catch {
      setNewsData([]);
      setShowNews(true);
    }
    setLoadingNews(false);
  };

  return (
    <div>
      {/* AI Bias Header */}
      <div className="card" style={{ borderLeft: `4px solid ${BIAS_COLORS[bias] || '#6b7280'}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: BIAS_COLORS[bias], textTransform: 'uppercase' }}>
              {bias}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 12 }}>
              Confidence: {confidence}%
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 12 }}>
              Risk: <span style={{ textTransform: 'capitalize' }}>{riskAdvice}</span>
            </span>
            <span style={{ fontSize: 13, marginLeft: 12, color: scoreModifier > 0 ? '#22c55e' : scoreModifier < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
              Score Modifier: {scoreModifier > 0 ? '+' : ''}{scoreModifier}
            </span>
          </div>
          {onRefresh && (
            <button className="btn btn-start" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onRefresh}>
              Refresh
            </button>
          )}
        </div>
        {summary && <p style={{ margin: '0 0 8px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{summary}</p>}

        {observations.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Key Observations:</span>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 13 }}>
              {observations.map((obs, i) => <li key={i} style={{ marginBottom: 2 }}>{obs}</li>)}
            </ul>
          </div>
        )}

        {lessonsApplied.length > 0 && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>Lessons Applied:</span>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              {lessonsApplied.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Data Grid: FII/DII + Breadth + Key Levels + Plan */}
      <div className="grid grid-2" style={{ gap: 12 }}>
        {/* FII/DII */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>FII / DII Flow</h4>
          {fii_dii ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>FII Net:</span>
                <span style={{ fontWeight: 600, color: fii_dii.fii_net >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fii_dii.fii_net >= 0 ? '+' : ''}{fii_dii.fii_net?.toFixed(0)} Cr
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>DII Net:</span>
                <span style={{ fontWeight: 600, color: fii_dii.dii_net >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fii_dii.dii_net >= 0 ? '+' : ''}{fii_dii.dii_net?.toFixed(0)} Cr
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>Net Combined:</span>
                <span style={{ fontWeight: 600, color: fii_dii.net_institutional >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fii_dii.net_institutional >= 0 ? '+' : ''}{fii_dii.net_institutional?.toFixed(0)} Cr
                </span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: getSignalStyle(fii_dii.signal).color + '22',
                  color: getSignalStyle(fii_dii.signal).color,
                }}>
                  {getSignalStyle(fii_dii.signal).text}
                </span>
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Data unavailable</span>
          )}
        </div>

        {/* Market Breadth */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>Market Breadth</h4>
          {breadth ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>Advancing:</span>
                <span style={{ fontWeight: 600, color: '#22c55e' }}>{breadth.total_advancing}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>Declining:</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{breadth.total_declining}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>A/D Ratio:</span>
                <span style={{ fontWeight: 600, color: breadth.advance_decline_ratio >= 1.0 ? '#22c55e' : '#ef4444' }}>
                  {breadth.advance_decline_ratio?.toFixed(2)}
                </span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: getSignalStyle(breadth.breadth_signal).color + '22',
                  color: getSignalStyle(breadth.breadth_signal).color,
                }}>
                  {getSignalStyle(breadth.breadth_signal).text}
                </span>
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Data unavailable</span>
          )}
        </div>

        {/* Key Levels */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>Key Levels</h4>
          {keyLevels.nifty_support || keyLevels.nifty_resistance ? (
            <div>
              {keyLevels.nifty_support && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Support:</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {keyLevels.nifty_support.map((lvl, i) => (
                      <span key={i} style={{ padding: '2px 8px', background: 'rgba(34,197,94,0.15)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {keyLevels.nifty_resistance && (
                <div>
                  <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Resistance:</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {keyLevels.nifty_resistance.map((lvl, i) => (
                      <span key={i} style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.15)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No key levels identified</span>
          )}
        </div>

        {/* Trading Plan */}
        <div className="card" style={{ padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>Trading Plan</h4>
          {plan ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{plan}</p>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No plan generated</span>
          )}
        </div>
      </div>

      {/* Sector Strength */}
      {breadth?.sectors && breadth.sectors.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>Sector Performance</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {breadth.sectors
              .sort((a, b) => b.change_pct - a.change_pct)
              .map((sector, i) => (
                <span key={i} style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: sector.change_pct > 0.5 ? 'rgba(34,197,94,0.15)' : sector.change_pct < -0.5 ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                  color: sector.change_pct > 0.5 ? '#22c55e' : sector.change_pct < -0.5 ? '#ef4444' : 'var(--text-secondary)',
                }}>
                  {sector.name.replace('NIFTY ', '')}: {sector.change_pct > 0 ? '+' : ''}{sector.change_pct.toFixed(2)}%
                </span>
              ))}
          </div>
        </div>
      )}

      {/* News Toggle */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button
          className="btn"
          style={{ fontSize: 12, padding: '6px 16px', background: 'var(--card-bg)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}
          onClick={loadNews}
          disabled={loadingNews}
        >
          {loadingNews ? 'Loading...' : showNews ? 'Hide News' : 'Show Market News'}
        </button>
      </div>

      {/* News Items */}
      {showNews && newsData && (
        <div className="card" style={{ marginTop: 12, padding: 14 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Market News ({newsData.length} items)
          </h4>
          {newsData.length === 0 ? (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No news collected yet</span>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {newsData.map((item, i) => (
                <div key={i} style={{
                  padding: '8px 0',
                  borderBottom: i < newsData.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontSize: 13, flex: 1 }}>{item.extracted_text}</p>
                    <span style={{
                      marginLeft: 8,
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      background: item.sentiment === 'bullish' ? 'rgba(34,197,94,0.15)' : item.sentiment === 'bearish' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: item.sentiment === 'bullish' ? '#22c55e' : item.sentiment === 'bearish' ? '#ef4444' : '#f59e0b',
                    }}>
                      {item.sentiment} ({item.sentiment_score > 0 ? '+' : ''}{item.sentiment_score?.toFixed(1)})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.source && (
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: item.source === 'telegram' ? 'rgba(59,130,246,0.15)' : item.source === 'moneycontrol' ? 'rgba(234,88,12,0.15)' : 'rgba(16,185,129,0.15)',
                          color: item.source === 'telegram' ? '#3b82f6' : item.source === 'moneycontrol' ? '#ea580c' : '#10b981',
                        }}>
                          {item.source === 'telegram' ? 'TG' : item.source === 'moneycontrol' ? 'MC' : 'ET'}
                        </span>
                      )}
                      {item.symbols ? (
                        item.symbols.split(',').filter(Boolean).map((sym, j) => (
                          <span key={j} style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            background: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                          }}>
                            {sym.trim()}
                          </span>
                        ))
                      ) : null}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : item.date || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
