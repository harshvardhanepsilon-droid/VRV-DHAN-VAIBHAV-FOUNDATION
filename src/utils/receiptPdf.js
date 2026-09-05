const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// One-page payment receipt, styled to match the loan agreement's letterhead
// so the two documents look like they come from the same system.
function generateReceiptPdf({ company, customerName, loanNo, seq, totalInstallments, amount, date, balanceAfter }) {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ---- Letterhead (same layout as the agreement, simplified) ----
  const headerStartY = doc.y;
  const hasLogo = !!company.logoBuffer;
  const logoSize = 46;
  const headerX = hasLogo ? doc.page.margins.left + logoSize + 12 : doc.page.margins.left;
  const headerTextWidth = pageWidth - (headerX - doc.page.margins.left);

  if (hasLogo) {
    try { doc.image(company.logoBuffer, doc.page.margins.left, headerStartY, { width: logoSize, height: logoSize }); } catch (e) { /* ignore bad image */ }
  }
  doc.fontSize(17).fillColor('#0f172a').font('Helvetica-Bold').text(company.name || 'VRV DHAN VAIBHAV FOUNDATION', headerX, headerStartY, { width: headerTextWidth });
  const addressLine = [company.address, [company.city, company.state, company.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' | ');
  doc.fontSize(9).fillColor('#475569').font('Helvetica');
  if (addressLine) doc.text(addressLine, headerX, doc.y, { width: headerTextWidth });
  if (company.phone) doc.text(`Ph: ${company.phone}`, headerX, doc.y, { width: headerTextWidth });

  doc.x = doc.page.margins.left;
  doc.y = Math.max(doc.y, headerStartY + logoSize);
  doc.moveDown(0.5);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
  doc.moveDown(0.6);

  doc.fontSize(15).fillColor('#0f172a').font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
  doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(`Receipt for Loan No: ${loanNo}   |   Installment #${seq} of ${totalInstallments}`, { align: 'center' });
  doc.moveDown(1.2);

  // ---- Amount, front and center ----
  doc.fontSize(10).fillColor('#64748b').font('Helvetica').text('Amount Received', { align: 'center' });
  doc.fontSize(26).fillColor('#0f172a').font('Helvetica-Bold').text(fmtMoney(amount), { align: 'center' });
  doc.moveDown(1.2);

  // ---- Details table ----
  const rows = [
    ['Received From', customerName],
    ['Date of Payment', fmtDate(date)],
    ['Installment No.', `${seq} of ${totalInstallments}`],
    ['Loan No.', loanNo],
    ['Balance Outstanding (after this payment)', balanceAfter !== undefined && balanceAfter !== null ? fmtMoney(balanceAfter) : '-']
  ];
  const labelW = 230;
  doc.fontSize(10);
  rows.forEach((row, i) => {
    const y = doc.y;
    if (i % 2 === 0) doc.rect(doc.page.margins.left, y - 3, pageWidth, 22).fill('#f8fafc');
    doc.fillColor('#475569').font('Helvetica-Bold').text(row[0], doc.page.margins.left + 6, y, { width: labelW });
    doc.fillColor('#0f172a').font('Helvetica').text(row[1], doc.page.margins.left + labelW + 10, y, { width: pageWidth - labelW - 16 });
    doc.y = y + 22;
  });

  doc.x = doc.page.margins.left;
  doc.moveDown(2);
  doc.fontSize(8.5).fillColor('#64748b').font('Helvetica')
    .text('This receipt acknowledges the payment amount stated above and does not itself certify the full closure of the loan. Please retain this receipt for your records.', doc.page.margins.left, doc.y, { width: pageWidth });

  // ---- Signature ----
  doc.moveDown(2.5);
  const sigY = doc.y;
  const sigX = doc.page.width - doc.page.margins.right - 200;
  doc.moveTo(sigX, sigY).lineTo(sigX + 200, sigY).strokeColor('#94a3b8').stroke();
  doc.fontSize(9).fillColor('#1e293b').font('Helvetica')
    .text(company.signatory || company.signatoryDesignation || 'Authorized Signatory', sigX, sigY + 4, { width: 200, align: 'center' })
    .text(`For ${company.name || 'VRV DHAN VAIBHAV FOUNDATION'}`, sigX, doc.y, { width: 200, align: 'center' });

  doc.x = doc.page.margins.left;
  doc.fontSize(8).fillColor('#94a3b8')
    .text(`Generated on ${fmtDate(new Date())}`, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 20, { width: pageWidth });

  doc.end();
  return doc;
}

module.exports = { generateReceiptPdf };
