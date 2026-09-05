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
        const remaining = Math.max(0, Math.round((inst.emi - (inst.paidAmount || 0)) * 100) / 100);
        overdue.push({ loanId: l.id, loanNo: l.loanNo, customerName: l.customerName, customerPhone: l.customerPhone, days, remaining, ...inst });
      }
    });
  });
  overdue.sort((a, b) => b.days - a.days);

  document.getElementById('stat-cards').innerHTML = `
    <div class="card danger"><div class="card-label">Overdue Installments</div><div class="card-value">${overdue.length}</div></div>
    <div class="card danger"><div class="card-label">Total Overdue Amount</div><div class="card-value">${moneyShort(overdue.reduce((s, i) => s + i.remaining, 0))}</div></div>
  `;

  const body = document.getElementById('overdue-body');
  body.innerHTML = overdue.length ? overdue.map((i, idx) => `
    <tr>
      <td>${escapeHtml(i.customerName)}</td>
      <td><a class="link" href="loan-detail.html?id=${i.loanId}">${escapeHtml(i.loanNo)}</a></td>
      <td>${fmtDate(i.dueDate)}</td>
      <td class="num">${i.days}</td>
      <td class="num">${money(i.remaining)}${i.paidAmount ? `<div class="hint">${money(i.paidAmount)} paid of ${money(i.emi)}</div>` : ''}</td>
      <td class="actions-row">
        <a class="btn small" href="loan-detail.html?id=${i.loanId}">Open</a>
        <button class="btn small" data-remind="${idx}" title="Send WhatsApp reminder">WhatsApp</button>
      </td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="6">No overdue EMIs. Everything is on track.</td></tr>';

  body.querySelectorAll('[data-remind]').forEach((btn) => btn.addEventListener('click', () => {
    const i = overdue[Number(btn.dataset.remind)];
    sendWhatsAppReminder({ phone: i.customerPhone, customerName: i.customerName, loanNo: i.loanNo, emi: i.remaining, dueDate: i.dueDate });
  }));
})();
