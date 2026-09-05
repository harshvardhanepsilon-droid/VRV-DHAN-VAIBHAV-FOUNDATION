const PDFDocument = require('pdfkit');
const { numberToIndianWords } = require('./agreementPdf');

function fmtMoney(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Issued once a loan's schedule shows every installment paid — certifies
// the borrower owes nothing further against this specific loan.
function generateNocPdf({ company, customer, loan, closureDate, totalPaid }) {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ---- Letterhead ----
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

  doc.fontSize(15).fillColor('#0f172a').font('Helvetica-Bold').text('NO OBJECTION CERTIFICATE', { align: 'center' });
  doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(`Loan No: ${loan.loanNo}   |   Certificate Date: ${fmtDate(new Date())}`, { align: 'center' });
  doc.moveDown(1.2);

  // ---- Body ----
  doc.fontSize(10.5).fillColor('#1e293b').font('Helvetica');
  doc.text('TO WHOMSOEVER IT MAY CONCERN', doc.page.margins.left, doc.y, { width: pageWidth });
  doc.moveDown(0.8);

  const addr = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '__________';
  doc.font('Helvetica').fontSize(10.5).text(
    `This is to certify that `, doc.page.margins.left, doc.y, { continued: true, width: pageWidth }
  ).font('Helvetica-Bold').text(customer.name, { continued: true })
   .font('Helvetica').text(`, S/o D/o W/o ${customer.fatherOrSpouseName || '__________'}, residing at ${addr}, had availed a loan of `, { continued: true })
   .font('Helvetica-Bold').text(fmtMoney(loan.principal), { continued: true })
   .font('Helvetica').text(` (Loan No: ${loan.loanNo}) from ${company.name || 'VRV DHAN VAIBHAV FOUNDATION'} on ${fmtDate(loan.disbursementDate)}.`, { width: pageWidth });
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;

  doc.font('Helvetica').text(
    `The said loan, together with all interest and other charges payable thereon, has been `, doc.page.margins.left, doc.y, { continued: true, width: pageWidth }
  ).font('Helvetica-Bold').text('fully repaid', { continued: true })
   .font('Helvetica').text(` by the borrower as on ${fmtDate(closureDate)}. As on the date of this certificate, there is `, { continued: true })
   .font('Helvetica-Bold').text('no outstanding amount', { continued: true })
   .font('Helvetica').text(` payable by the borrower against the above-referenced loan, and ${company.name || 'VRV DHAN VAIBHAV FOUNDATION'} has `, { continued: true })
   .font('Helvetica-Bold').text('no objection', { continued: true })
   .font('Helvetica').text(' in this regard.', { width: pageWidth });
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;

  doc.text('This certificate is issued at the request of the borrower for their records and future reference, and does not constitute any further obligation on the part of the Lender.', doc.page.margins.left, doc.y, { width: pageWidth });

  doc.moveDown(1);
  doc.x = doc.page.margins.left;

  // ---- Loan summary table ----
  const rows = [
    ['Borrower Name', customer.name, 'Loan No.', loan.loanNo],
    ['Principal Amount', fmtMoney(loan.principal), 'Total Amount Repaid', fmtMoney(totalPaid)],
    ['Disbursement Date', fmtDate(loan.disbursementDate), 'Closure Date', fmtDate(closureDate)]
  ];
  const col1W = 140, col2W = pageWidth / 2 - col1W, col3W = 140, col4W = pageWidth / 2 - col3W;
  const rowH = 22;
  doc.fontSize(9.5);
  rows.forEach((row, i) => {
    const y = doc.y;
    if (i % 2 === 0) doc.rect(doc.page.margins.left, y - 2, pageWidth, rowH).fill('#f8fafc').fillColor('#1e293b');
    doc.fillColor('#475569').font('Helvetica-Bold').text(row[0], doc.page.margins.left + 4, y, { width: col1W });
    doc.fillColor('#0f172a').font('Helvetica').text(row[1], doc.page.margins.left + col1W, y, { width: col2W });
    doc.fillColor('#475569').font('Helvetica-Bold').text(row[2], doc.page.margins.left + col1W + col2W + 8, y, { width: col3W });
    doc.fillColor('#0f172a').font('Helvetica').text(row[3], doc.page.margins.left + col1W + col2W + col3W + 8, y, { width: col4W - 8 });
    doc.y = y + rowH;
  });

  doc.x = doc.page.margins.left;
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b')
    .text(`Amount in Words: Rupees ${numberToIndianWords(loan.principal)} Only.`, doc.page.margins.left, doc.y, { width: pageWidth });

  // ---- Signature ----
  doc.moveDown(2);
  doc.x = doc.page.margins.left;
  doc.font('Helvetica').fontSize(9).fillColor('#1e293b')
    .text(`Signed at: ${company.jurisdiction || company.city || '__________'}          Date: ${fmtDate(new Date())}`, doc.page.margins.left, doc.y, { width: pageWidth });
  doc.moveDown(1.6);

  const sigX = doc.page.width - doc.page.margins.right - 220;
  const sigY = doc.y;
  doc.moveTo(sigX, sigY).lineTo(sigX + 220, sigY).strokeColor('#94a3b8').stroke();
  const signatoryName = company.signatory || '';
  const signatoryDesignation = company.signatoryDesignation || 'Authorized Signatory';
  const sigLines = [signatoryName || signatoryDesignation, ...(signatoryName ? [signatoryDesignation] : []), `For ${company.name || 'VRV DHAN VAIBHAV FOUNDATION'}`];
  doc.fontSize(9).font('Helvetica').text(sigLines.join('\n'), sigX, sigY + 4, { width: 220, align: 'center' });

  doc.x = doc.page.margins.left;
  doc.fontSize(8).fillColor('#94a3b8')
    .text('This is a system-generated certificate.', doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 20, { width: pageWidth });

  doc.end();
  return doc;
}

module.exports = { generateNocPdf };
