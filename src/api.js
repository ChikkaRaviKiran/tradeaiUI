import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const fetchMarketSnapshot = () => api.get('/api/market/snapshot');
export const fetchGlobalIndices = () => api.get('/api/market/global-indices');
export const fetchActiveTrades = () => api.get('/api/trades/active');
export const fetchTodayTrades = () => api.get('/api/trades/today');
export const fetchTradeHistory = (limit = 100) => api.get(`/api/trades/history?limit=${encodeURIComponent(limit)}`);
export const fetchPerformance = () => api.get('/api/performance');
export const fetchTodayPerformance = () => api.get('/api/performance/today');
export const fetchAlerts = (limit = 50) => api.get(`/api/alerts?limit=${encodeURIComponent(limit)}`);
export const fetchSystemStatus = () => api.get('/api/system/status');
export const startSystem = () => api.post('/api/system/start');
export const stopSystem = () => api.post('/api/system/stop');

// History APIs
export const fetchCalendarData = (year, month) => api.get(`/api/history/calendar/${encodeURIComponent(year)}/${encodeURIComponent(month)}`);
export const fetchDayData = (date) => api.get(`/api/history/day/${encodeURIComponent(date)}`);
export const fetchDaySummary = (date) => api.get(`/api/history/summary/${encodeURIComponent(date)}`);
export const fetchDaySnapshots = (date) => api.get(`/api/history/snapshots/${encodeURIComponent(date)}`);
export const fetchDayAlerts = (date) => api.get(`/api/history/alerts/${encodeURIComponent(date)}`);

export default api;
