// API Client for Business Entity Resolution Platform
const BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `HTTP error ${res.status}`);
    }
    return json;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password, is_demo = false) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, is_demo }),
    }),

  // Dashboard
  getDashboard: () => request('/api/dashboard'),
  getDemoEntity: () => request('/api/demo/explore'),

  // Entities
  getEntities: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.page_size) query.set('page_size', params.page_size);
    if (params.country && params.country !== 'ALL') query.set('country', params.country);
    if (params.source) query.set('source', params.source);
    if (params.match_status && params.match_status !== 'ALL') query.set('match_status', params.match_status);
    if (params.confidence_min) query.set('confidence_min', params.confidence_min);
    if (params.search) query.set('search', params.search);
    return request(`/api/entities?${query.toString()}`);
  },

  getEntityById: (id) => request(`/api/entities/${encodeURIComponent(id)}`),
  searchEntities: (q) => request(`/api/entities/search?q=${encodeURIComponent(q)}`),

  // Matches
  getMatchDetails: (id) => request(`/api/matches/${encodeURIComponent(id)}`),
  getCandidates: (id) => request(`/api/candidates/${encodeURIComponent(id)}`),

  // Analytics
  getAnalytics: () => request('/api/analytics'),

  // Dataset
  getDatasetStats: () => request('/api/dataset/stats'),
  getDatasetPreview: (source = 'S1', page = 1, page_size = 20) =>
    request(`/api/dataset/preview?source=${source}&page=${page}&page_size=${page_size}`),

  // Settings
  getSettings: () => request('/api/settings'),
  updateSettings: (config) =>
    request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};
