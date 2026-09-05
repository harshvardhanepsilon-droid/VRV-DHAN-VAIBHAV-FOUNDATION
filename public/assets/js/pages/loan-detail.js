let loanId = null;
let loan = null;

function renderStats() {
  document.getElementById('stat-cards').innerHTML = `
    <div class="card"><div class="card-label">EMI Amount</div><div class="card-value">${money(loan.emiAmount)}</div></div>
    <div class="card"><div class="card-label">Installments Paid</div><div class="card-value">${loan.installmentsPaid} / ${loan.installmentsTotal}</div></div>
    <div class="card success"><div class="card-label">Amount Paid</div><div class="card-value">${moneyShort(loan.amountPaid)}</div></div>
    <div class="card warning"><div class="card-label">Amount Pending</div><div class="card-value">${moneyShort(loan.amountPending)}</div></div>
    <div class="card ${loan.overdueCount ? 'danger' : ''}"><div class="card-label">Overdue</div><div class="card-value">${loan.overdueCount}</div><div class="card-sub">${money(loan.overdueAmount)}</div></div>
  `;
}

function renderSummary() {
  const c = loan.customer || {};
  const rows = [
    ['Customer', `<a class="link" href="customer-detail.html?id=${c.id}">${escapeHtml(c.name || 'Unknown')}</a>`],
    ['Phone', escapeHtml(c.phone || '-')],
    ['Principal', money(loan.principal)],
    ['Interest Rate', `${loan.interestRatePct}% p.a. (${loan.interestType === 'flat' ? 'Flat' : 'Reducing Balance'})`],
    ['Tenure', `${loan.tenureMonths} months`],
    ['Disbursement Date', fmtDate(loan.disbursementDate)],
    ['Total Interest', money(loan.totalInterest)],
    ['Total Repayable', money(loan.totalPayable)],
    ['Processing Fee', money(loan.processingFee || 0)],
    ['Purpose', escapeHtml(loan.purpose || '-')],
    ['Collateral', escapeHtml(loan.collateral || 'Unsecured / None')]
  ];
  document.getElementById('summary-grid').innerHTML = rows.map((r) => `<div class="field"><label>${r[0]}</label><div style="padding:8px 0;font-weight:600;">${r[1]}</div></div>`).join('');
}

function renderSchedule() {
  const body = document.getElementById('schedule-body');
  body.innerHTML = loan.schedule.map((inst) => `
    <tr>
      <td>${inst.seq}</td>
      <td>${fmtDate(inst.dueDate)}</td>
      <td class="num">${money(inst.emi)}</td>
      <td class="num">${money(inst.principal)}</td>
      <td class="num">${money(inst.interest)}</td>
      <td class="num">${money(inst.balance)}</td>
      <td><span class="badge ${inst.status}">${inst.status}</span>${inst.status === 'paid' ? `<div class="hint">on ${fmtDate(inst.paidDate)}</div>` : ''}</td>
      <td>${inst.status === 'paid'
        ? `<button class="btn small" data-unpay="${inst.seq}">Undo</button>`
        : `<button class="btn small primary" data-pay="${inst.seq}">Mark Paid</button>`}</td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-pay]').forEach((btn) => btn.addEventListener('click', () => openPayModal(Number(btn.dataset.pay))));
  body.querySelectorAll('[data-unpay]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Undo this payment?')) return;
    try {
      await api.post(`/loans/${loanId}/installments/${btn.dataset.unpay}/unpay`);
      toast('Payment undone');
      await loadLoan();
    } catch (e) { toast('Failed: ' + e.message); }
  }));
}

async function openPayModal(seq) {
  const inst = loan.schedule.find((s) => s.seq === seq);
  const html = `
    <div class="field"><label>Amount Received (₹)</label><input type="number" id="p-amount" value="${inst.emi}" step="0.01"></div>
    <div class="field" style="margin-top:12px;"><label>Payment Date</label><input type="date" id="p-date" value="${todayISO()}"></div>
  `;
  const result = await Modal.open(`Record Payment — Installment #${seq}`, html, { saveLabel: 'Mark Paid' });
  if (result !== 'save') return;
  const amount = document.getElementById('p-amount').value;
  const date = document.getElementById('p-date').value;
  try {
    await api.post(`/loans/${loanId}/installments/${seq}/pay`, { paidAmount: amount, paidDate: date });
    toast('Payment recorded');
    await loadLoan();
  } catch (e) {
    toast('Failed: ' + e.message);
  }
}

async function loadLoan() {
  loan = await api.get(`/loans/${loanId}`);
  document.getElementById('page-title').textContent = `Loan ${loan.loanNo}`;
  document.getElementById('crumb-loan').textContent = loan.loanNo;
  document.getElementById('page-sub').textContent = `${loan.customer ? loan.customer.name : 'Unknown customer'} — ${loan.tenureMonths} month ${loan.interestType === 'flat' ? 'flat-rate' : 'reducing-balance'} loan`;
  document.getElementById('btn-agreement').href = `/api/loans/${loanId}/agreement.pdf`;
  document.getElementById('f-status').value = loan.status;
  document.getElementById('schedule-hint').textContent = `${loan.installmentsTotal} installments starting ${fmtDate(loan.schedule[0] ? loan.schedule[0].dueDate : loan.disbursementDate)}`;
  renderStats();
  renderSummary();
  renderSchedule();
}

(async function init() {
  await initSidebar('loans');
  loanId = qs('id');
  if (!loanId) { window.location.href = 'loans.html'; return; }

  try {
    await loadLoan();
  } catch (e) {
    toast('Failed to load loan: ' + e.message);
    return;
  }

  document.getElementById('f-status').addEventListener('change', async (e) => {
    try {
      await api.put(`/loans/${loanId}`, { status: e.target.value });
      toast('Status updated');
      await loadLoan();
    } catch (err) {
      toast('Failed: ' + err.message);
    }
  });

  document.getElementById('btn-delete').addEventListener('click', async () => {
    if (!confirm(`Delete loan ${loan.loanNo}? This cannot be undone.`)) return;
    try {
      await api.del(`/loans/${loanId}`);
      window.location.href = 'loans.html';
    } catch (e) {
      toast('Delete failed: ' + e.message);
    }
  });
})();
