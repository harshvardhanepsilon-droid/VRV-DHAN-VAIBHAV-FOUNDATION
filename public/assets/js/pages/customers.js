let allCustomers = [];

async function openNewCustomerModal() {
  const result = await Modal.open('New Customer — KYC Details', customerFormHtml(), { saveLabel: 'Create Customer', maxWidth: '760px' });
  if (result !== 'save') return;
  const payload = readCustomerForm();
  if (!payload.name) { toast('Name is required'); return; }
  try {
    const customer = await api.post('/customers', payload);
    toast('Customer created');
    window.location.href = `customer-detail.html?id=${customer.id}`;
  } catch (e) {
    toast('Failed: ' + e.message);
  }
}

function renderStats() {
  const totalOutstanding = allCustomers.reduce((s, c) => s + c.totalOutstanding, 0);
  const withLoans = allCustomers.filter((c) => c.loanCount > 0).length;
  document.getElementById('stat-cards').innerHTML = `
    <div class="card"><div class="card-label">Total Customers</div><div class="card-value">${allCustomers.length}</div></div>
    <div class="card"><div class="card-label">With Active Loans</div><div class="card-value">${withLoans}</div></div>
    <div class="card warning"><div class="card-label">Total Outstanding</div><div class="card-value">${moneyShort(totalOutstanding)}</div></div>
  `;
}

function renderTable(list) {
  const body = document.getElementById('customer-body');
  body.innerHTML = list.length ? list.map((c) => `
    <tr>
      <td>${c.photoPath ? `<img src="${c.photoPath}" style="width:34px;height:34px;border-radius:8px;object-fit:cover;">` : `<div class="avatar-placeholder" style="width:34px;height:34px;font-size:14px;border-radius:8px;">${escapeHtml((c.name || '?')[0].toUpperCase())}</div>`}</td>
      <td><a class="link" href="customer-detail.html?id=${c.id}">${escapeHtml(c.name)}</a></td>
      <td>${escapeHtml(c.phone || '-')}</td>
      <td>${escapeHtml(c.city || '-')}</td>
      <td class="num">${c.loanCount}</td>
      <td class="num">${money(c.totalOutstanding)}</td>
      <td><a class="btn small" href="customer-detail.html?id=${c.id}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="7">No customers yet. Click "+ New Customer" to add your first KYC record.</td></tr>';
}

(async function init() {
  await initSidebar('customers');
  try {
    allCustomers = await api.get('/customers');
  } catch (e) {
    toast('Failed to load customers: ' + e.message);
    return;
  }
  renderStats();
  renderTable(allCustomers);

  document.getElementById('btn-new-customer').addEventListener('click', openNewCustomerModal);
  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return renderTable(allCustomers);
    renderTable(allCustomers.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.aadhaarNumber || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    ));
  });
})();
