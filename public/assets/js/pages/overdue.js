(async function init() {
  await initSidebar('overdue');

  let loans;
  try {
    loans = await api.get('/loans');
  } catch (e) {
    toast('Failed to load: ' + e.message);
    return;
  }

  const today = new Date();
  const overdue = [];
  loans.forEach((l) => {
    l.schedule.forEach((inst) => {
      if (inst.status === 'overdue') {
        const days = Math.floor((today - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24));
        overdue.push({ loanId: l.id, loanNo: l.loanNo, customerName: l.customerName, days, ...inst });
      }
    });
  });
  overdue.sort((a, b) => b.days - a.days);

  document.getElementById('stat-cards').innerHTML = `
    <div class="card danger"><div class="card-label">Overdue Installments</div><div class="card-value">${overdue.length}</div></div>
    <div class="card danger"><div class="card-label">Total Overdue Amount</div><div class="card-value">${moneyShort(overdue.reduce((s, i) => s + i.emi, 0))}</div></div>
  `;

  document.getElementById('overdue-body').innerHTML = overdue.length ? overdue.map((i) => `
    <tr>
      <td>${escapeHtml(i.customerName)}</td>
      <td><a class="link" href="loan-detail.html?id=${i.loanId}">${escapeHtml(i.loanNo)}</a></td>
      <td>${fmtDate(i.dueDate)}</td>
      <td class="num">${i.days}</td>
      <td class="num">${money(i.emi)}</td>
      <td><a class="btn small" href="loan-detail.html?id=${i.loanId}">Open</a></td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="6">No overdue EMIs. Everything is on track.</td></tr>';
})();
