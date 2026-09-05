function updatePreview() {
  const principal = Number(document.getElementById('f-principal').value);
  const rate = Number(document.getElementById('f-rate').value);
  const tenure = Number(document.getElementById('f-tenure').value);
  const type = document.getElementById('f-type').value;

  const result = previewEmi(principal, rate, tenure, type);
  const panel = document.getElementById('preview-panel');
  if (!result) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  document.getElementById('preview-cards').innerHTML = `
    <div class="card"><div class="card-label">Monthly EMI</div><div class="card-value">${money(result.emi)}</div></div>
    <div class="card"><div class="card-label">Total Interest</div><div class="card-value">${money(result.totalInterest)}</div></div>
    <div class="card"><div class="card-label">Total Repayable</div><div class="card-value">${money(result.totalPayable)}</div></div>
  `;
}

(async function init() {
  await initSidebar('loans');
  document.getElementById('f-date').value = todayISO();

  try {
    const customers = await api.get('/customers');
    const select = document.getElementById('f-customer');
    select.innerHTML = '<option value="">Select a customer…</option>' + customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' — ' + escapeHtml(c.phone) : ''}</option>`).join('');
    const presetId = qs('customerId');
    if (presetId) select.value = presetId;
  } catch (e) {
    toast('Failed to load customers: ' + e.message);
  }

  ['f-principal', 'f-rate', 'f-tenure', 'f-type'].forEach((id) => document.getElementById(id).addEventListener('input', updatePreview));

  document.getElementById('btn-create').addEventListener('click', async () => {
    const payload = {
      customerId: document.getElementById('f-customer').value,
      principal: document.getElementById('f-principal').value,
      interestRatePct: document.getElementById('f-rate').value,
      interestType: document.getElementById('f-type').value,
      tenureMonths: document.getElementById('f-tenure').value,
      disbursementDate: document.getElementById('f-date').value,
      firstEmiDate: document.getElementById('f-first-emi-date').value,
      processingFee: document.getElementById('f-fee').value,
      purpose: document.getElementById('f-purpose').value,
      collateral: document.getElementById('f-collateral').value
    };
    if (!payload.customerId) { toast('Select a customer'); return; }
    try {
      const loan = await api.post('/loans', payload);
      toast('Loan created');
      window.location.href = `loan-detail.html?id=${loan.id}`;
    } catch (e) {
      toast('Failed: ' + e.message);
    }
  });
})();
