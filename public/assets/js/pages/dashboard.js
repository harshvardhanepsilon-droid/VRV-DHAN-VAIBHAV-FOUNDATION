(async function init() {
  await initSidebar('dashboard');

  let data;
  try {
    data = await api.get('/dashboard');
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message);
    return;
  }

  document.getElementById('stat-cards').innerHTML = `
    <a class="card" href="customers.html"><div class="card-label">Total Customers</div><div class="card-value">${data.totalCustomers}</div></a>
    <a class="card" href="loans.html?status=active"><div class="card-label">Active Loans</div><div class="card-value">${data.activeLoanCount}</div><div class="card-sub">${data.totalLoans} total &middot; ${data.closedLoanCount} closed</div></a>
    <a class="card success" href="loans.html"><div class="card-label">Total Disbursed</div><div class="card-value">${moneyShort(data.totalDisbursed)}</div></a>
    <a class="card success" href="reports.html"><div class="card-label">Total Collected</div><div class="card-value">${moneyShort(data.totalCollected)}</div></a>
    <a class="card warning" href="loans.html"><div class="card-label">Outstanding</div><div class="card-value">${moneyShort(data.totalOutstanding)}</div></a>
    <a class="card danger" href="overdue.html"><div class="card-label">Overdue EMIs</div><div class="card-value">${data.overdueCount}</div><div class="card-sub">${moneyShort(data.overdueAmount)} due</div></a>
  `;

  const overdueBody = document.getElementById('overdue-body');
  overdueBody.innerHTML = data.overdueInstallments.length ? data.overdueInstallments.map((i) => `
    <tr>
      <td>${escapeHtml(i.customerName)}</td>
      <td><a class="link" href="loan-detail.html?id=${i.loanId}">${escapeHtml(i.loanNo)}</a></td>
      <td>${fmtDate(i.dueDate)}</td>
      <td class="num">${money(i.remaining)}</td>
      <td><a class="btn small" href="loan-detail.html?id=${i.loanId}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="5">No overdue EMIs. Nice work!</td></tr>';

  const upcomingBody = document.getElementById('upcoming-body');
  upcomingBody.innerHTML = data.upcomingInstallments.length ? data.upcomingInstallments.map((i) => `
    <tr>
      <td>${escapeHtml(i.customerName)}</td>
      <td><a class="link" href="loan-detail.html?id=${i.loanId}">${escapeHtml(i.loanNo)}</a></td>
      <td>${fmtDate(i.dueDate)}</td>
      <td class="num">${money(i.emi)}</td>
      <td><a class="btn small" href="loan-detail.html?id=${i.loanId}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="5">Nothing due in the next 7 days.</td></tr>';

  const recentBody = document.getElementById('recent-body');
  recentBody.innerHTML = data.recentLoans.length ? data.recentLoans.map((l) => `
    <tr>
      <td><a class="link" href="loan-detail.html?id=${l.id}">${escapeHtml(l.loanNo)}</a></td>
      <td>${escapeHtml(l.customerName)}</td>
      <td class="num">${money(l.principal)}</td>
      <td class="num">${money(l.emiAmount)}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td><a class="btn small" href="loan-detail.html?id=${l.id}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="6">No loans yet. <a class="link" href="loan-new.html">Create the first one</a>.</td></tr>';
})();
