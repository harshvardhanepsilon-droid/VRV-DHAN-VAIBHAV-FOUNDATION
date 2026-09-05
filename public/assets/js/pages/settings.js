let company = null;

function fillForm() {
  document.getElementById('f-name').value = company.name || '';
  document.getElementById('f-tagline').value = company.tagline || '';
  document.getElementById('f-address').value = company.address || '';
  document.getElementById('f-city').value = company.city || '';
  document.getElementById('f-state').value = company.state || '';
  document.getElementById('f-pincode').value = company.pincode || '';
  document.getElementById('f-regno').value = company.regNo || '';
  document.getElementById('f-pan').value = company.pan || '';
  document.getElementById('f-phone').value = company.phone || '';
  document.getElementById('f-email').value = company.email || '';
  document.getElementById('f-signatory').value = company.signatory || '';
  document.getElementById('f-signatory-desig').value = company.signatoryDesignation || '';
  document.getElementById('f-jurisdiction').value = company.jurisdiction || '';
  document.getElementById('f-rate').value = company.defaultInterestRatePct || '';
  document.getElementById('f-type').value = company.defaultInterestType || 'reducing';
  document.getElementById('f-penalty').value = company.penaltyPct || '';

  const preview = document.getElementById('logo-preview');
  const placeholder = document.getElementById('logo-placeholder');
  if (company.logoDataUrl) {
    preview.src = company.logoDataUrl + '?t=' + Date.now();
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

async function load() {
  const config = await api.get('/config');
  company = config.company;
  fillForm();
}

(async function init() {
  await initSidebar('settings');
  try {
    await load();
  } catch (e) {
    toast('Failed to load settings: ' + e.message);
    return;
  }

  document.getElementById('btn-upload-logo').addEventListener('click', () => document.getElementById('logo-input').click());
  document.getElementById('logo-input').addEventListener('change', async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const fd = new FormData();
    fd.append('logo', e.target.files[0]);
    try {
      await api.postForm('/config/company/logo', fd);
      toast('Logo updated');
      await load();
    } catch (err) {
      toast('Upload failed: ' + err.message);
    }
    e.target.value = '';
  });

  document.getElementById('btn-save').addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('f-name').value.trim(),
      tagline: document.getElementById('f-tagline').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      city: document.getElementById('f-city').value.trim(),
      state: document.getElementById('f-state').value.trim(),
      pincode: document.getElementById('f-pincode').value.trim(),
      regNo: document.getElementById('f-regno').value.trim(),
      pan: document.getElementById('f-pan').value.trim(),
      phone: document.getElementById('f-phone').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      signatory: document.getElementById('f-signatory').value.trim(),
      signatoryDesignation: document.getElementById('f-signatory-desig').value.trim(),
      jurisdiction: document.getElementById('f-jurisdiction').value.trim(),
      defaultInterestRatePct: document.getElementById('f-rate').value,
      defaultInterestType: document.getElementById('f-type').value,
      penaltyPct: document.getElementById('f-penalty').value
    };
    try {
      await api.put('/config/company', payload);
      toast('Settings saved');
      await load();
    } catch (e) {
      toast('Save failed: ' + e.message);
    }
  });
})();
