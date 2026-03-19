import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const fetchMarketSnapshot = () => api.get('/api/market/snapshot');
export const fetchAllSnapshots = () => api.get('/api/market/snapshots');
export const fetchGlobalIndices = () => api.get('/api/market/global-indices');
export const fetchActiveTrades = () => api.get('/api/trades/active');
export const fetchTodayTrades = () => api.get('/api/trades/today');
export const fetchTradeHistory = (limit = 100) => api.get(`/api/trades/history?limit=${encodeURIComponent(limit)}`);
export const fetchPerformance = () => api.get('/api/performance');
export const fetchTodayPerformance = () => api.get('/api/performance/today');
export const fetchAlerts = (limit = 50, date = null) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (date) params.set('target_date', date);
  return api.get(`/api/alerts?${params.toString()}`);
};
export const fetchSystemStatus = () => api.get('/api/system/status');
export const startSystem = () => api.post('/api/system/start');
export const stopSystem = () => api.post('/api/system/stop');
export const setTradingMode = (mode) => api.post('/api/system/trading-mode', { mode });

// History APIs
export const fetchCalendarData = (year, month) => api.get(`/api/history/calendar/${encodeURIComponent(year)}/${encodeURIComponent(month)}`);
export const fetchDayData = (date) => api.get(`/api/history/day/${encodeURIComponent(date)}`);
export const fetchDaySummary = (date) => api.get(`/api/history/summary/${encodeURIComponent(date)}`);
export const fetchDaySnapshots = (date) => api.get(`/api/history/snapshots/${encodeURIComponent(date)}`);
export const fetchDayAlerts = (date) => api.get(`/api/history/alerts/${encodeURIComponent(date)}`);

// Strategy Evaluation / Recommendations
export const fetchRecommendations = () => api.get('/api/recommendations');
export const triggerEvaluation = () => api.post('/api/evaluate/run');
export const fetchEvalStatus = () => api.get('/api/evaluate/status');
export const fetchEvaluationHistory = (date) => api.get(`/api/evaluate/history/${encodeURIComponent(date)}`);

// Market Intelligence
export const fetchIntelligence = () => api.get('/api/intelligence');
export const fetchIntelligenceNews = (days = 1) => api.get(`/api/intelligence/news?days=${encodeURIComponent(days)}`);
export const fetchIntelligenceHistory = (limit = 7) => api.get(`/api/intelligence/history?limit=${encodeURIComponent(limit)}`);
export const refreshIntelligence = () => api.post('/api/intelligence/refresh');

export default api;
