function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyShort(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

// Opens a WhatsApp chat pre-filled with an EMI reminder — uses the wa.me
// click-to-chat link, so it needs no WhatsApp Business API setup.
function sendWhatsAppReminder({ phone, customerName, loanNo, emi, dueDate, companyName }) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) { toast('No phone number on file for this customer'); return; }
  const withCountryCode = digits.length === 10 ? '91' + digits : digits;
  const message = `Dear ${customerName}, this is a reminder that your EMI of ${money(emi)} for loan ${loanNo} was due on ${fmtDate(dueDate)}. Kindly make the payment at the earliest. Thank you, ${companyName || 'VRV Dhan Vaibhav Foundation'}.`;
  window.open(`https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`, '_blank');
}
