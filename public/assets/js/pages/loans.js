let allLoans = [];

function renderStats() {
  const active = allLoans.filter((l) => l.status === 'active');
  const totalOutstanding = allLoans.reduce((s, l) => s + l.amountPending, 0);
  const overdueCount = allLoans.reduce((s, l) => s + l.overdueCount, 0);
  document.getElementById('stat-cards').innerHTML = `
    <div class="card"><div class="card-label">Total Loans</div><div class="card-value">${allLoans.length}</div></div>
    <div class="card"><div class="card-label">Active</div><div class="card-value">${active.length}</div></div>
    <div class="card warning"><div class="card-label">Outstanding</div><div class="card-value">${moneyShort(totalOutstanding)}</div></div>
    <div class="card danger"><div class="card-label">Overdue EMIs</div><div class="card-value">${overdueCount}</div></div>
  `;
}

function renderTable(list) {
  const body = document.getElementById('loans-body');
  body.innerHTML = list.length ? list.map((l) => `
    <tr>
      <td><a class="link" href="loan-detail.html?id=${l.id}">${escapeHtml(l.loanNo)}</a></td>
      <td>${escapeHtml(l.customerName)}</td>
      <td class="num">${money(l.principal)}</td>
      <td class="num">${l.interestRatePct}%</td>
      <td class="num">${l.tenureMonths} mo</td>
      <td class="num">${money(l.emiAmount)}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td>${l.nextDue ? fmtDate(l.nextDue.dueDate) + (l.nextDue.status === 'overdue' ? ' <span class="badge overdue">overdue</span>' : '') : '-'}</td>
      <td><a class="btn small" href="loan-detail.html?id=${l.id}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="9">No loans match. <a class="link" href="loan-new.html">Create one</a>.</td></tr>';
}

function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const q = document.getElementById('search').value.trim().toLowerCase();
  let list = allLoans;
  if (status) list = list.filter((l) => l.status === status);
  if (q) list = list.filter((l) => l.customerName.toLowerCase().includes(q) || l.loanNo.toLowerCase().includes(q));
  renderTable(list);
}

(async function init() {
  await initSidebar('loans');
  try {
    allLoans = await api.get('/loans');
  } catch (e) {
    toast('Failed to load loans: ' + e.message);
    return;
  }
  renderStats();
  const statusFromUrl = qs('status');
  if (statusFromUrl) document.getElementById('filter-status').value = statusFromUrl;
  applyFilters();
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('search').addEventListener('input', applyFilters);
})();
