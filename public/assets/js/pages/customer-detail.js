let customerId = null;
let customer = null;

function renderKycView() {
  const rows = [
    ['Father / Spouse Name', customer.fatherOrSpouseName],
    ['Date of Birth', customer.dob ? fmtDate(customer.dob) : ''],
    ['Gender', customer.gender],
    ['Occupation', customer.occupation],
    ['Phone', customer.phone],
    ['Alternate Phone', customer.altPhone],
    ['Email', customer.email],
    ['Monthly Income', customer.monthlyIncome ? money(customer.monthlyIncome) : ''],
    ['Address', [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')],
    ['Aadhaar Number', customer.aadhaarNumber],
    ['PAN Number', customer.panNumber],
    ['Guarantor', customer.guarantorName ? `${customer.guarantorName} (${customer.guarantorPhone || 'no phone'})` : ''],
    ['Guarantor Address', customer.guarantorAddress]
  ].filter((r) => r[1]);

  document.getElementById('kyc-view').innerHTML = rows.length
    ? rows.map((r) => `<div class="stat-line"><span class="label">${r[0]}</span><span class="value">${escapeHtml(r[1])}</span></div>`).join('')
    : '<p class="hint">No KYC details filled in yet. Click Edit to add them.</p>';
}

function renderPhotoAndDocs() {
  const photoPreview = document.getElementById('photo-preview');
  const photoPlaceholder = document.getElementById('photo-placeholder');
  if (customer.photoPath) {
    photoPreview.src = customer.photoPath + '?t=' + Date.now();
    photoPreview.style.display = 'block';
    photoPlaceholder.style.display = 'none';
  } else {
    photoPreview.style.display = 'none';
    photoPlaceholder.style.display = 'flex';
    photoPlaceholder.textContent = (customer.name || '?')[0].toUpperCase();
  }

  const frontImg = document.getElementById('id-front-preview');
  const frontEmpty = document.getElementById('id-front-empty');
  if (customer.idFrontPath) { frontImg.src = customer.idFrontPath + '?t=' + Date.now(); frontImg.style.display = 'block'; frontEmpty.style.display = 'none'; }
  else { frontImg.style.display = 'none'; frontEmpty.style.display = 'flex'; }

  const backImg = document.getElementById('id-back-preview');
  const backEmpty = document.getElementById('id-back-empty');
  if (customer.idBackPath) { backImg.src = customer.idBackPath + '?t=' + Date.now(); backImg.style.display = 'block'; backEmpty.style.display = 'none'; }
  else { backImg.style.display = 'none'; backEmpty.style.display = 'flex'; }
}

function renderLoans() {
  const body = document.getElementById('loans-body');
  const loans = customer.loans || [];
  body.innerHTML = loans.length ? loans.map((l) => {
    const outstanding = l.schedule.filter((s) => s.status !== 'paid').reduce((s, i) => s + i.emi, 0);
    return `
    <tr>
      <td><a class="link" href="loan-detail.html?id=${l.id}">${escapeHtml(l.loanNo)}</a></td>
      <td class="num">${money(l.principal)}</td>
      <td class="num">${money(l.emiAmount)}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td class="num">${money(outstanding)}</td>
      <td><a class="btn small" href="loan-detail.html?id=${l.id}">Open</a></td>
    </tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="6">No loans for this customer yet.</td></tr>';
}

async function loadCustomer() {
  customer = await api.get(`/customers/${customerId}`);
  document.getElementById('page-title').textContent = customer.name;
  document.getElementById('crumb-name').textContent = customer.name;
  document.title = `${customer.name} — VRV Dhan Vaibhav Foundation`;
  document.getElementById('btn-new-loan').href = `loan-new.html?customerId=${customer.id}`;
  renderKycView();
  renderPhotoAndDocs();
  renderLoans();
}

async function openEditModal() {
  const result = await Modal.open('Edit KYC Details', customerFormHtml(customer), { saveLabel: 'Save Changes', maxWidth: '760px' });
  if (result !== 'save') return;
  const payload = readCustomerForm();
  if (!payload.name) { toast('Name is required'); return; }
  try {
    await api.put(`/customers/${customerId}`, payload);
    toast('KYC details updated');
    await loadCustomer();
  } catch (e) {
    toast('Failed: ' + e.message);
  }
}

function uploadFile(inputEl, uploadFn) {
  inputEl.addEventListener('change', async () => {
    if (!inputEl.files || !inputEl.files[0]) return;
    try {
      await uploadFn(inputEl.files[0]);
      toast('Uploaded');
      await loadCustomer();
    } catch (e) {
      toast('Upload failed: ' + e.message);
    } finally {
      inputEl.value = '';
    }
  });
}

(async function init() {
  await initSidebar('customers');
  customerId = qs('id');
  if (!customerId) { window.location.href = 'customers.html'; return; }

  try {
    await loadCustomer();
  } catch (e) {
    toast('Failed to load customer: ' + e.message);
    return;
  }

  document.getElementById('btn-edit').addEventListener('click', openEditModal);

  document.getElementById('btn-delete').addEventListener('click', async () => {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    try {
      await api.del(`/customers/${customerId}`);
      window.location.href = 'customers.html';
    } catch (e) {
      toast('Delete failed: ' + e.message);
    }
  });

  document.getElementById('btn-upload-photo').addEventListener('click', () => document.getElementById('photo-input').click());
  document.getElementById('btn-upload-front').addEventListener('click', () => document.getElementById('id-front-input').click());
  document.getElementById('btn-upload-back').addEventListener('click', () => document.getElementById('id-back-input').click());

  uploadFile(document.getElementById('photo-input'), (file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.postForm(`/customers/${customerId}/photo`, fd);
  });
  uploadFile(document.getElementById('id-front-input'), (file) => {
    const fd = new FormData();
    fd.append('idFront', file);
    return api.postForm(`/customers/${customerId}/documents`, fd);
  });
  uploadFile(document.getElementById('id-back-input'), (file) => {
    const fd = new FormData();
    fd.append('idBack', file);
    return api.postForm(`/customers/${customerId}/documents`, fd);
  });
})();
