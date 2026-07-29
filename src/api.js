import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';
const API_TIMEOUT_MS = Number(process.env.REACT_APP_API_TIMEOUT_MS || 20000);

const api = axios.create({
  baseURL: API_BASE,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 20000,
});

export const fetchAllSnapshots = () => api.get('/api/market/snapshots');
export const fetchGlobalIndices = () => api.get('/api/market/global-indices');
export const fetchActiveTrades = () => api.get('/api/trades/active');
export const fetchTodayTrades = () => api.get('/api/trades/today');
export const fetchPerformance = () => api.get('/api/performance');
export const fetchAlerts = (limit = 50, date = null) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (date) params.set('target_date', date);
  return api.get(`/api/alerts?${params.toString()}`);
};
export const fetchSignals = (limit = 200, date = null) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (date) params.set('target_date', date);
  return api.get(`/api/signals?${params.toString()}`);
};
export const fetchSystemStatus = () => api.get('/api/system/status');
export const fetchSystemActivity = () => api.get('/api/system/activity');
export const startSystem = () => api.post('/api/system/start');
export const stopSystem = () => api.post('/api/system/stop');
export const setTradingMode = (mode) => api.post('/api/system/trading-mode', { mode });

// History APIs
export const fetchCalendarData = (year, month) => api.get(`/api/history/calendar/${encodeURIComponent(year)}/${encodeURIComponent(month)}`);
export const fetchDayData = (date) => api.get(`/api/history/day/${encodeURIComponent(date)}`);

// Strategy Evaluation / Recommendations
export const fetchRecommendations = () => api.get('/api/recommendations');
export const triggerEvaluation = () => api.post('/api/evaluate/run');
export const fetchEvalStatus = () => api.get('/api/evaluate/status');

// Pre-market Condor Setup (informational — manual setup only)
export const fetchTodaysCondorSetup = () => api.get('/api/condor-setup/today');
export const fetchCondorSetupStatus = () => api.get('/api/condor-setup/status');
export const triggerCondorSetupRecompute = () => api.post('/api/condor-setup/recompute');

// Weekly/monthly S/R confluence zones (informational only — no strategy attached)
export const fetchLevelZones = (symbol) => api.get(`/api/level-zones/${symbol}`);
export const fetchLevelZoneTrades = (symbol = null) => api.get('/api/level-zone-alerts/trades', { params: symbol ? { symbol } : {} });
export const fetchLevelZoneAlertStatus = () => api.get('/api/level-zone-alerts/status');

// Weekly (Wed→Tue) + Monthly Classic-pivot (3R/3S) expiry-planning charts
// (informational only — auto-recomputed on schedule, see backend scheduler)
export const fetchExpiryLevels = (symbol, timeframe) => api.get(`/api/expiry-levels/${symbol}/${timeframe}`);
export const fetchExpiryLevelsStatus = () => api.get('/api/expiry-levels/status');
export const triggerExpiryLevelsRecompute = () => api.post('/api/expiry-levels/recompute');

// Market Intelligence
export const fetchIntelligence = () => api.get('/api/intelligence');
export const fetchIntelligenceNews = (days = 1) => api.get(`/api/intelligence/news?days=${encodeURIComponent(days)}`);
export const refreshIntelligence = () => api.post('/api/intelligence/refresh');

// Strategy Selection
export const fetchStrategySelection = () => api.get('/api/strategy-selection');
export const fetchPerformanceComparison = () => api.get('/api/performance/comparison');

// Broker Settings
export const fetchBrokerStatus = () => api.get('/api/broker/status');
export const testBrokerConnection = () => api.post('/api/broker/test');
export const updateBrokerCredentials = (creds) => api.post('/api/broker/update-credentials', creds);
export const reAuthenticateBroker = () => api.post('/api/broker/re-authenticate');

// Trading Account selection (Angel vs Kite)
export const fetchTradingAccount = () => api.get('/api/broker/trading-account');
export const setTradingAccount = (account) => api.post('/api/broker/trading-account', { account });

// Kite (Zerodha) — daily OAuth + credential management
export const fetchKiteStatus = () => api.get('/api/broker/kite/status');
export const fetchKiteLoginUrl = () => api.get('/api/auth/kite/login-url');
export const updateKiteCredentials = (payload) => api.post('/api/broker/kite/update-credentials', payload);

// Dhan — daily access-token rotation + credential management
export const fetchDhanStatus = () => api.get('/api/broker/dhan/status');
export const testDhanConnection = () => api.post('/api/broker/dhan/test');
export const updateDhanCredentials = (payload) => api.post('/api/broker/dhan/update-credentials', payload);
export const refreshDhanInstruments = () => api.post('/api/broker/dhan/refresh-instruments');

// Account-level daily-loss kill switch (per BrokerAccount)
export const fetchKillSwitch = () => api.get('/api/risk/kill-switch');
export const updateKillSwitch = (payload) => api.put('/api/risk/kill-switch', payload);
export const resetKillSwitch = (payload) => api.post('/api/risk/kill-switch/reset', payload || {});

// Positions / history parity APIs
export const fetchPositions = () => api.get('/api/positions');
export const exitPositions = (payload) => api.post('/api/positions/exit', payload);
export const rearmPositions = () => api.post('/api/positions/rearm');
export const fetchTradeHistory = (params = {}) => api.get('/api/trade-history', { params });
export const captureEodSnapshot = () => api.post('/api/eod/snapshot');

// ATL ATM runtime APIs
export const fetchAtmRuntime = () => api.get('/api/atm/runtime');
export const forceCloseAtm = () => api.post('/api/atm/force-close');
export const placeNowAtm = () => api.post('/api/atm/place-now');
export const resetAtm = () => api.post('/api/atm/reset');
// Multi-instance (registry) runtime — one entry per StrategyInstance row.
// Use this to diagnose why one strategy placed but another didn't (broker
// binding, wrong_index gating, halt state, order_error events, etc.).
export const fetchAtmInstances = () => api.get('/api/atm/instances');
export const forceCloseAtmInstance = (id) => api.post(`/api/atm/instances/${id}/force-close`);
export const placeNowAtmInstance = (id) => api.post(`/api/atm/instances/${id}/place-now`);
export const resetAtmInstance = (id) => api.post(`/api/atm/instances/${id}/reset`);

// ATL Straddle strategy settings
export const fetchAtlStraddleSettings = () => api.get('/api/strategy-settings/atl-straddle');
export const updateAtlStraddleSettings = (payload) => api.put('/api/strategy-settings/atl-straddle', payload);

// ── Multi-account Broker Accounts ────────────────────────────────────────
export const fetchBrokerAccounts = () => api.get('/api/accounts');
export const createBrokerAccount = (payload) => api.post('/api/accounts', payload);
export const updateBrokerAccount = (id, payload) => api.put(`/api/accounts/${encodeURIComponent(id)}`, payload);
export const deleteBrokerAccount = (id) => api.delete(`/api/accounts/${encodeURIComponent(id)}`);
export const testBrokerAccount = (id) => api.post(`/api/accounts/${encodeURIComponent(id)}/test`);
export const setPrimaryBrokerAccount = (id) => api.post(`/api/accounts/${encodeURIComponent(id)}/set-primary`);
export const setDataFeedBrokerAccount = (id) => api.post(`/api/accounts/${encodeURIComponent(id)}/set-data-feed`);

// Proxy management (Lightsail SOCKS5)
export const listProxies = () => api.get('/api/proxy/list');
export const getProxyStatus = (id) => api.get(`/api/proxy/status/${encodeURIComponent(id)}`);
export const provisionProxy = (id) => api.post(`/api/proxy/provision/${encodeURIComponent(id)}`);
export const deleteProxy = (id) => api.delete(`/api/proxy/${encodeURIComponent(id)}`);

// ── Multi-strategy StrategyInstances ─────────────────────────────────────
export const fetchStrategyInstances = () => api.get('/api/strategy-instances');
export const createStrategyInstance = (payload) => api.post('/api/strategy-instances', payload);
export const updateStrategyInstance = (id, payload) => api.put(`/api/strategy-instances/${encodeURIComponent(id)}`, payload);
export const deleteStrategyInstance = (id) => api.delete(`/api/strategy-instances/${encodeURIComponent(id)}`);
export const toggleStrategyInstance = (id, is_active) =>
  api.post(`/api/strategy-instances/${encodeURIComponent(id)}/toggle`, { is_active });

// Research Multi-Index Straddle APIs (new live modes: multi-index + indicator-gated)
export const fetchAtmResearchSettings = () => api.get('/api/atm-research/settings');
export const updateAtmResearchSettings = (payload) => api.put('/api/atm-research/settings', payload);
export const fetchAtmResearchDefaults = () => api.get('/api/atm-research/defaults');
export const fetchAtmResearchRuntime = () => api.get('/api/atm-research/runtime');
export const forceCloseAtmResearch = (index) => api.post('/api/atm-research/force-close', index ? { index } : {});
export const resetAtmResearch = (index) => api.post('/api/atm-research/reset', index ? { index } : {});

// MoveDet & PDH/PDL execution settings (lots mode + funds)
export const fetchMoveDetExecSettings = () => api.get('/api/strategy-settings/move-det');
export const updateMoveDetExecSettings = (payload) => api.put('/api/strategy-settings/move-det', payload);
export const fetchMoveDetBullExecSettings = () => api.get('/api/strategy-settings/move-det-bull');
export const updateMoveDetBullExecSettings = (payload) => api.put('/api/strategy-settings/move-det-bull', payload);
export const fetchPdhPdlExecSettings = () => api.get('/api/strategy-settings/pdh-pdl');
export const updatePdhPdlExecSettings = (payload) => api.put('/api/strategy-settings/pdh-pdl', payload);

// Global priority-handoff toggle (controls whether new MoveDet/Bull/PDH-PDL
// entries force-close existing positions across the three priority scanners + ATM)
export const fetchPriorityHandoffSettings = () => api.get('/api/strategy-settings/priority-handoff');
export const updatePriorityHandoffSettings = (payload) => api.put('/api/strategy-settings/priority-handoff', payload);

// Strategy Analytics (backtest results, rankings, today's plan)
export const fetchStrategyAnalytics = () => api.get('/api/strategy-analytics');

// Backtest
export const fetchBacktestConfig = () => api.get('/api/backtest/config');
export const runBacktest = (params) => api.post('/api/backtest/run', params, { timeout: 30000 });
export const fetchBacktestStatus = (jobId) => api.get(`/api/backtest/status/${encodeURIComponent(jobId)}`);
export const fetchBacktestJobs = () => api.get('/api/backtest/jobs');
export const exportBacktestExcel = (jobId) =>
  api.get(`/api/backtest/export/${encodeURIComponent(jobId)}`, { responseType: 'blob', timeout: 60000 });

// ── Pattern Engine APIs ──────────────────────────────────────────────────
export const peHealth = () => api.get('/api/pattern-engine/health');
export const pePatternList = () => api.get('/api/pattern-engine/patterns');
export const pePatternDetail = (id) => api.get(`/api/pattern-engine/patterns/${encodeURIComponent(id)}`);
export const peSetPatternStatus = (id, status) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/status`, { status });
export const peSetPatternSize = (id, size_multiplier) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/size`, { size_multiplier });
export const peLive = (symbol = 'NIFTY') =>
  api.get(`/api/pattern-engine/live?symbol=${encodeURIComponent(symbol)}`);
export const pePerformance = (days = 30) =>
  api.get(`/api/pattern-engine/performance?days=${days}`);
export const peProbes = (limit = 100) =>
  api.get(`/api/pattern-engine/probes?limit=${limit}`);
export const peRefreshStats = () => api.post('/api/pattern-engine/admin/refresh-stats');
export const peSeedPatterns = () => api.post('/api/pattern-engine/admin/seed');
export const peSchedulerStatus = () => api.get('/api/pattern-engine/scheduler/status');
export const peSchedulerRunNow = () => api.post('/api/pattern-engine/scheduler/run-now');
export const peSetPatternTrigger = (id, trigger_json, lock = true) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/trigger`, { trigger_json, lock });
export const peSetPatternExitRule = (id, exit_rule_json, lock = true) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/exit-rule`, { exit_rule_json, lock });
export const peSetPatternNotes = (id, notes) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/notes`, { notes });
export const peRebackfillPattern = (id, days = 540, reset = true) =>
  api.post(`/api/pattern-engine/patterns/${encodeURIComponent(id)}/rebackfill`, { days, reset });

export default api;
