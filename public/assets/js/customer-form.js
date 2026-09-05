function customerFormHtml(c = {}) {
  return `
    <div class="form-grid">
      <div class="field span-2"><label>Full Name *</label><input id="f-name" value="${escapeHtml(c.name || '')}" placeholder="e.g. Ramesh Kumar"></div>
      <div class="field"><label>Father / Spouse Name</label><input id="f-fname" value="${escapeHtml(c.fatherOrSpouseName || '')}"></div>
      <div class="field"><label>Date of Birth</label><input type="date" id="f-dob" value="${c.dob || ''}"></div>
      <div class="field"><label>Gender</label>
        <select id="f-gender">
          <option value="">Select</option>
          <option value="Male" ${c.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${c.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option value="Other" ${c.gender === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="field"><label>Occupation</label><input id="f-occupation" value="${escapeHtml(c.occupation || '')}"></div>
      <div class="field"><label>Phone *</label><input id="f-phone" value="${escapeHtml(c.phone || '')}" placeholder="10-digit mobile"></div>
      <div class="field"><label>Alternate Phone</label><input id="f-altphone" value="${escapeHtml(c.altPhone || '')}"></div>
      <div class="field"><label>Email</label><input id="f-email" value="${escapeHtml(c.email || '')}"></div>
      <div class="field"><label>Monthly Income (₹)</label><input type="number" id="f-income" value="${c.monthlyIncome || ''}"></div>
      <div class="field span-2"><label>Address</label><textarea id="f-address">${escapeHtml(c.address || '')}</textarea></div>
      <div class="field"><label>City</label><input id="f-city" value="${escapeHtml(c.city || '')}"></div>
      <div class="field"><label>State</label><input id="f-state" value="${escapeHtml(c.state || '')}"></div>
      <div class="field"><label>Pincode</label><input id="f-pincode" value="${escapeHtml(c.pincode || '')}"></div>
      <div class="field"><label>Aadhaar Number</label><input id="f-aadhaar" value="${escapeHtml(c.aadhaarNumber || '')}" maxlength="14" placeholder="XXXX XXXX XXXX"></div>
      <div class="field"><label>PAN Number</label><input id="f-pan" value="${escapeHtml(c.panNumber || '')}" maxlength="10" style="text-transform:uppercase;"></div>
      <div class="field"><label>Guarantor Name</label><input id="f-gname" value="${escapeHtml(c.guarantorName || '')}"></div>
      <div class="field"><label>Guarantor Phone</label><input id="f-gphone" value="${escapeHtml(c.guarantorPhone || '')}"></div>
      <div class="field span-2"><label>Guarantor Address</label><textarea id="f-gaddress">${escapeHtml(c.guarantorAddress || '')}</textarea></div>
    </div>
    <div class="error-text" id="f-error" style="display:none;"></div>
  `;
}

function readCustomerForm() {
  return {
    name: document.getElementById('f-name').value.trim(),
    fatherOrSpouseName: document.getElementById('f-fname').value.trim(),
    dob: document.getElementById('f-dob').value,
    gender: document.getElementById('f-gender').value,
    occupation: document.getElementById('f-occupation').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    altPhone: document.getElementById('f-altphone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    monthlyIncome: document.getElementById('f-income').value,
    address: document.getElementById('f-address').value.trim(),
    city: document.getElementById('f-city').value.trim(),
    state: document.getElementById('f-state').value.trim(),
    pincode: document.getElementById('f-pincode').value.trim(),
    aadhaarNumber: document.getElementById('f-aadhaar').value.trim(),
    panNumber: document.getElementById('f-pan').value.trim().toUpperCase(),
    guarantorName: document.getElementById('f-gname').value.trim(),
    guarantorPhone: document.getElementById('f-gphone').value.trim(),
    guarantorAddress: document.getElementById('f-gaddress').value.trim()
  };
}
