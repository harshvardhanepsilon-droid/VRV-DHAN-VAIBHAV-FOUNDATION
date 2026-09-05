function readInputs() {
  return {
    principal: Number(document.getElementById('f-principal').value),
    rate: Number(document.getElementById('f-rate').value),
    tenure: Number(document.getElementById('f-tenure').value),
    type: document.getElementById('f-type').value
  };
}

function update() {
  const { principal, rate, tenure, type } = readInputs();
  const result = previewEmi(principal, rate, tenure, type);
  const scheduleBody = document.getElementById('schedule-body');

  if (!result) {
    document.getElementById('preview-cards').innerHTML = '<p class="hint">Enter a principal, rate, and tenure to see the EMI.</p>';
    scheduleBody.innerHTML = '<tr class="empty-row"><td colspan="6">Enter loan terms above.</td></tr>';
    document.getElementById('btn-create-loan').href = 'loan-new.html';
    return;
  }

  document.getElementById('preview-cards').innerHTML = `
    <div class="card"><div class="card-label">Monthly EMI</div><div class="card-value">${money(result.emi)}</div></div>
    <div class="card"><div class="card-label">Total Interest</div><div class="card-value">${money(result.totalInterest)}</div></div>
    <div class="card"><div class="card-label">Total Repayable</div><div class="card-value">${money(result.totalPayable)}</div></div>
  `;

  const schedule = previewSchedule(principal, rate, tenure, type, new Date());
  scheduleBody.innerHTML = schedule.map((s) => `
    <tr>
      <td>${s.seq}</td>
      <td>${fmtDate(s.dueDate)}</td>
      <td class="num">${money(s.emi)}</td>
      <td class="num">${money(s.principal)}</td>
      <td class="num">${money(s.interest)}</td>
      <td class="num">${money(s.balance)}</td>
    </tr>
  `).join('');

  const params = new URLSearchParams({ principal, rate, tenure, type }).toString();
  document.getElementById('btn-create-loan').href = `loan-new.html?${params}`;
}

(async function init() {
  await initSidebar('calculator');
  ['f-principal', 'f-rate', 'f-tenure', 'f-type'].forEach((id) => document.getElementById(id).addEventListener('input', update));
  update();
})();
