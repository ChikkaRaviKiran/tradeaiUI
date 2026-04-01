import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
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

// Market Intelligence
export const fetchIntelligence = () => api.get('/api/intelligence');
export const fetchIntelligenceNews = (days = 1) => api.get(`/api/intelligence/news?days=${encodeURIComponent(days)}`);
export const refreshIntelligence = () => api.post('/api/intelligence/refresh');

// V2 Engine
export const fetchV2ActiveTrades = () => api.get('/api/v2/active');
export const fetchV2TodayTrades = () => api.get('/api/v2/today');
export const fetchV2Status = () => api.get('/api/v2/status');
export const fetchPerformanceComparison = () => api.get('/api/performance/comparison');

// Broker Settings
export const fetchBrokerStatus = () => api.get('/api/broker/status');
export const testBrokerConnection = () => api.post('/api/broker/test');
export const updateBrokerCredentials = (creds) => api.post('/api/broker/update-credentials', creds);
export const reAuthenticateBroker = () => api.post('/api/broker/re-authenticate');

export default api;
