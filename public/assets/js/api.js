const API_BASE = '/api';

async function apiRequest(method, path, body, isForm) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: (body && !isForm) ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined)
  });
  if (res.status === 401) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch (e) { /* no JSON body */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  postForm: (path, formData) => apiRequest('POST', path, formData, true),
  put: (path, body) => apiRequest('PUT', path, body),
  del: (path) => apiRequest('DELETE', path)
};

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('visible'), 2800);
}
