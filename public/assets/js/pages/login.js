(function () {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('error');
  const btn = document.getElementById('btn-submit');

  const redirectTo = new URLSearchParams(window.location.search).get('next') || 'index.html';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: document.getElementById('f-password').value })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Sign in failed');
      }
      window.location.href = redirectTo;
    } catch (err) {
      errorEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
})();
