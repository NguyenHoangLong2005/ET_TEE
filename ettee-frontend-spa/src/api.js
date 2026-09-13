const STORAGE_KEY = 'ettee_auth';

const API_BASE = 'http://localhost:8080';

function getAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

async function apiRequest(path, options = {}) {
  const auth = getAuth();
  const headers = { ...(options.headers || {}) };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    const message = body?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(message);
  }

  return body.data;
}

export const EtteeApi = {
  login: async (usernameOrPhone, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrPhone, password })
    });

    setAuth(data);
    return data;
  },
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => apiRequest(path, { method: 'DELETE' })
};
