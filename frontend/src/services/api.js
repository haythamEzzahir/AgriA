const API = '/api';

async function getToken() {
  try {
    const stored = localStorage.getItem('session');
    if (!stored) return null;
    return JSON.parse(stored).access_token || null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = await getToken();

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const auth = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const register = {
  create: (body) => request('/register', { method: 'POST', body: JSON.stringify(body) }),
};

export const farms = {
  list: () => request('/farms'),
  get: (id) => request(`/farms/${id}`),
  create: (body) => request('/farms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/farms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/farms/${id}`, { method: 'DELETE' }),
};

export const ndvi = {
  get: (farmId) => request(`/ndvi/${farmId}`),
  history: (farmId) => request(`/ndvi/${farmId}/history`),
};

export const weather = {
  forecast: (lat, lon) => request(`/weather/forecast?lat=${lat}&lon=${lon}`),
};

export const ai = {
  explain: (body) => request('/ai/explain', { method: 'POST', body: JSON.stringify(body) }),
  history: (farmId) => request(`/ai/history/${farmId}`),
};

export const soil = {
  get: (farmId) => request(`/soil/${farmId}`),
};

export const analyze = {
  run: (farmId, language = 'mixed') => request(`/analyze/${farmId}`, { method: 'POST', body: JSON.stringify({ language }) }),
};

export const alerts = {
  list: (farmId) => request(`/alerts/${farmId}`),
};

export const recommendations = {
  get: (farmId) => request(`/recommendations/${farmId}`),
};

export const marketplace = {
  list: (params) => {
    const searchParams = new URLSearchParams();
    if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request(`/marketplace${qs ? '?' + qs : ''}`);
  },
  get: (id) => request(`/marketplace/${id}`),
  create: (body) => request('/marketplace', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/marketplace/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/marketplace/${id}`, { method: 'DELETE' }),
};
