(async function init() {
  await initSidebar('reports');

  let data;
  try {
    data = await api.get('/reports/summary');
  } catch (e) {
    toast('Failed to load report summary: ' + e.message);
    return;
  }

  document.getElementById('stat-cards').innerHTML = `
    <div class="card"><div class="card-label">Total Customers</div><div class="card-value">${data.totalCustomers}</div></div>
    <div class="card"><div class="card-label">Total Loans</div><div class="card-value">${data.totalLoans}</div><div class="card-sub">${data.activeLoans} active &middot; ${data.closedLoans} closed</div></div>
    <div class="card success"><div class="card-label">Total Disbursed</div><div class="card-value">${moneyShort(data.totalDisbursed)}</div></div>
    <div class="card success"><div class="card-label">Total Collected</div><div class="card-value">${moneyShort(data.totalCollected)}</div></div>
    <div class="card warning"><div class="card-label">Outstanding</div><div class="card-value">${moneyShort(data.totalOutstanding)}</div></div>
    <div class="card danger"><div class="card-label">Overdue Amount</div><div class="card-value">${moneyShort(data.overdueAmount)}</div></div>
  `;
})();
