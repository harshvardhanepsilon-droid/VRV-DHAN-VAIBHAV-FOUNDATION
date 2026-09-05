// Activity Log stays a live route (src/routes/activity.js, activity.html) —
// just dropped from the visible nav rather than removed as a feature.
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: 'index.html' },
  { key: 'customers', label: 'Customers', href: 'customers.html' },
  { key: 'loans', label: 'Loans', href: 'loans.html' },
  { key: 'overdue', label: 'Overdue EMIs', href: 'overdue.html' },
  { key: 'calculator', label: 'EMI Calculator', href: 'emi-calculator.html' },
  { key: 'reports', label: 'Reports', href: 'reports.html' },
  { key: 'settings', label: 'Settings', href: 'settings.html' }
];

function renderSidebar(activeKey, companyName, logoUrl) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const name = companyName || 'VRV Dhan Vaibhav Foundation';
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="" class="brand-logo">`
    : `<svg class="brand-logo" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
        <polyline points="40,55 120,175 200,55" fill="none" stroke="#152451" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="82,58 120,128 158,58" fill="none" stroke="#c9a12b" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

  el.innerHTML = `
    <div class="brand-row">${logoImg}<div class="brand">${name}</div></div>
    <div class="brand-caption">Loan &amp; KYC Management</div>
    ${NAV_ITEMS.map((item) => `<a class="navbtn${item.key === activeKey ? ' active' : ''}" href="${item.href}">${item.label}</a>`).join('')}
    <button class="navbtn navbtn-logout" id="btn-logout" type="button">Log Out</button>
  `;

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    window.location.href = 'login.html';
  });

  if (!document.getElementById('menu-toggle')) {
    const toggle = document.createElement('button');
    toggle.id = 'menu-toggle';
    toggle.className = 'menu-toggle';
    toggle.setAttribute('aria-label', 'Menu');
    toggle.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(toggle);

    const backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    const closeMenu = () => { el.classList.remove('open'); backdrop.classList.remove('visible'); };
    const openMenu = () => { el.classList.add('open'); backdrop.classList.add('visible'); };
    toggle.addEventListener('click', () => (el.classList.contains('open') ? closeMenu() : openMenu()));
    backdrop.addEventListener('click', closeMenu);
  }
  el.querySelectorAll('.navbtn').forEach((a) => a.addEventListener('click', () => {
    el.classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('visible');
  }));
}

async function initSidebar(activeKey) {
  renderSidebar(activeKey, 'VRV Dhan Vaibhav Foundation');
  try {
    const config = await api.get('/config');
    renderSidebar(activeKey, config.company.name, config.company.logoDataUrl);
  } catch (e) { /* keep default */ }
}
