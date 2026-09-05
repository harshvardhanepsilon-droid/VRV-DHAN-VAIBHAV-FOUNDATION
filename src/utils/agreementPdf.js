const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return words[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + words[n % 10] : '');
}

function threeDigits(n) {
  if (n < 100) return twoDigits(n);
  return words[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
}

// Converts a rupee amount into Indian numbering words (Crore/Lakh/Thousand) for the agreement's amount-in-words line.
function numberToIndianWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  let out = '';
  if (crore) out += threeDigits(crore) + ' Crore ';
  if (lakh) out += threeDigits(lakh) + ' Lakh ';
  if (thousand) out += threeDigits(thousand) + ' Thousand ';
  if (rest) out += threeDigits(rest);
  return out.trim();
}

function generateAgreementPdf({ loan, customer, company }) {
  const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ---- Letterhead ----
  let headerX = doc.page.margins.left;
  if (company.logoBuffer) {
    try { doc.image(company.logoBuffer, headerX, doc.y, { width: 48, height: 48 }); headerX += 58; } catch (e) { /* ignore bad image */ }
  }
  doc.fontSize(17).fillColor('#0f172a').font('Helvetica-Bold')
    .text(company.name || 'VRV DHAN VAIBHAV FOUNDATION', headerX, doc.y, { width: pageWidth - (headerX - doc.page.margins.left) });
  // Skip address/contact lines entirely when blank instead of drawing an
  // empty line — an unfilled Settings page shouldn't leave a gap above the
  // divider that makes the logo look mis-aligned with the letterhead text.
  const addressLine = [company.address, [company.city, company.state, company.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' | ');
  const contactLine = [company.phone ? `Ph: ${company.phone}` : '', company.email || '', company.regNo ? `Reg No: ${company.regNo}` : ''].filter(Boolean).join('   |   ');
  doc.fontSize(9).fillColor('#475569').font('Helvetica');
  if (addressLine) doc.text(addressLine);
  if (contactLine) doc.text(contactLine);
  // A logo shifts headerX right of the margin; reset before the rest of the
  // document so that drift doesn't narrow every unrelated block below.
  doc.x = doc.page.margins.left;
  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
  doc.moveDown(0.8);

  doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('LOAN AGREEMENT', { align: 'center' });
  doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(`Loan No: ${loan.loanNo}    |    Agreement Date: ${fmtDate(loan.disbursementDate)}`, { align: 'center' });
  doc.moveDown(0.9);

  // ---- Parties ----
  doc.fontSize(10).fillColor('#1e293b').font('Helvetica');
  const introY = doc.y;
  const photoSize = { width: 72, height: 86 };
  const photoBottom = introY + photoSize.height + 8;
  const narrowWidth = pageWidth - photoSize.width - 14;
  // Every opening line stays narrowed until it has actually cleared the
  // photo's bottom edge — a fixed line count broke as soon as any line
  // (lender address, borrower name/address) ran long enough to wrap twice.
  const widthFor = () => (customer.photoBuffer && doc.y < photoBottom ? narrowWidth : pageWidth);

  doc.text(
    `This Loan Agreement ("Agreement") is made and executed on ${fmtDate(loan.disbursementDate)}, between:`,
    doc.page.margins.left, doc.y, { width: widthFor() }
  );
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;
  doc.font('Helvetica-Bold').text(`${company.name || 'VRV DHAN VAIBHAV FOUNDATION'}`, doc.page.margins.left, doc.y, { continued: true, width: widthFor() }).font('Helvetica')
    .text(`, having its office at ${[company.address, company.city, company.state, company.pincode].filter(Boolean).join(', ') || 'the address on record'} (hereinafter referred to as the "LENDER"),`, { width: widthFor() });
  doc.moveDown(0.3);
  doc.x = doc.page.margins.left;
  doc.text('AND', doc.page.margins.left, doc.y, { width: widthFor() });
  doc.moveDown(0.3);
  doc.x = doc.page.margins.left;
  doc.font('Helvetica-Bold').text(`${customer.name}`, doc.page.margins.left, doc.y, { continued: true, width: widthFor() }).font('Helvetica')
    .text(`, S/o D/o W/o ${customer.fatherOrSpouseName || '__________'}, residing at ${[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '__________'} (hereinafter referred to as the "BORROWER").`, { width: widthFor() });
  doc.moveDown(0.3);
  doc.x = doc.page.margins.left;
  doc.text('The Lender and the Borrower shall collectively be referred to as the "Parties" and each individually as a "Party".', doc.page.margins.left, doc.y, { width: widthFor() });

  // Ensure the body text below always starts clear of the photo, even if
  // the paragraphs above were short enough to finish above photoBottom.
  if (customer.photoBuffer && doc.y < photoBottom) doc.y = photoBottom;

  // Borrower photo, top-right of the parties block, with a thin frame so it
  // reads as an attached ID photo rather than a stray image dropped on the page.
  if (customer.photoBuffer) {
    const photoX = doc.page.width - doc.page.margins.right - photoSize.width;
    try {
      // `cover` (not `fit`) crops to fill the passport-photo-shaped frame
      // completely — `fit` preserves the source aspect ratio and letterboxes,
      // which left visible blank space down one side of most portrait photos.
      doc.save();
      doc.rect(photoX, introY, photoSize.width, photoSize.height).clip();
      doc.image(customer.photoBuffer, photoX, introY, { cover: [photoSize.width, photoSize.height], align: 'center', valign: 'center' });
      doc.restore();
      doc.rect(photoX, introY, photoSize.width, photoSize.height).lineWidth(1).strokeColor('#cbd5e1').stroke();
    } catch (e) { /* ignore bad image */ }
  }

  doc.moveDown(0.9);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.moveDown(0.6);

  // ---- Borrower / Loan detail table ----
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('1. Borrower & Loan Details');
  doc.moveDown(0.3);

  const detailRows = [
    ['Borrower Name', customer.name, 'Father/Spouse Name', customer.fatherOrSpouseName || '-'],
    ['Phone', customer.phone || '-', 'Alternate Phone', customer.altPhone || '-'],
    ['Aadhaar No.', customer.aadhaarNumber || '-', 'PAN No.', customer.panNumber || '-'],
    ['Occupation', customer.occupation || '-', 'Monthly Income', customer.monthlyIncome ? fmtMoney(customer.monthlyIncome) : '-'],
    ['Loan Amount (Principal)', fmtMoney(loan.principal), 'Interest Rate (p.a.)', `${loan.interestRatePct}%`],
    ['Interest Type', loan.interestType === 'flat' ? 'Flat Rate' : 'Reducing Balance', 'Tenure', `${loan.tenureMonths} months`],
    ['Disbursement Date', fmtDate(loan.disbursementDate), 'Monthly EMI', fmtMoney(loan.emiAmount)],
    ['Total Interest Payable', fmtMoney(loan.totalInterest), 'Total Repayable Amount', fmtMoney(loan.totalPayable)],
    ['Processing Fee', fmtMoney(loan.processingFee || 0), 'Purpose of Loan', loan.purpose || '-'],
    ['Collateral / Security', loan.collateral || 'Unsecured / None', 'Guarantor', customer.guarantorName || '-']
  ];

  const col1W = 155, col2W = pageWidth / 2 - col1W, col3W = 155, col4W = pageWidth / 2 - col3W;
  doc.fontSize(9);
  detailRows.forEach((row, i) => {
    const y = doc.y;
    if (i % 2 === 0) doc.rect(doc.page.margins.left, y - 2, pageWidth, 16).fill('#f8fafc').fillColor('#1e293b');
    doc.fillColor('#475569').font('Helvetica-Bold').text(row[0], doc.page.margins.left + 4, y, { width: col1W, continued: false });
    doc.fillColor('#0f172a').font('Helvetica').text(row[1], doc.page.margins.left + col1W, y, { width: col2W });
    doc.fillColor('#475569').font('Helvetica-Bold').text(row[2], doc.page.margins.left + col1W + col2W + 8, y, { width: col3W });
    doc.fillColor('#0f172a').font('Helvetica').text(row[3], doc.page.margins.left + col1W + col2W + col3W + 8, y, { width: col4W - 8 });
    doc.y = y + 16;
  });

  // The per-cell writes above leave doc.x parked at the last column's x —
  // reset it to the margin so the flowed text below wraps at full page width
  // instead of a narrow leftover column.
  doc.x = doc.page.margins.left;
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b')
    .text(`Amount in Words: Rupees ${numberToIndianWords(loan.principal)} Only.`, doc.page.margins.left, doc.y, { width: pageWidth });

  // ---- Terms & Conditions ----
  doc.x = doc.page.margins.left;
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('2. Terms & Conditions');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9.3).fillColor('#1e293b');
  const terms = [
    `Repayment: The Borrower agrees to repay the loan in ${loan.tenureMonths} equal monthly installments (EMI) of ${fmtMoney(loan.emiAmount)} each, as per the repayment schedule attached as Annexure A, starting one month from the date of disbursement.`,
    `Mode of Payment: EMI shall be paid on or before the due date each month, through cash, bank transfer, or any other mode acceptable to the Lender.`,
    `Late Payment / Penalty: In the event of delay in payment of any EMI beyond the due date, a penal interest of ${company.penaltyPct || 2}% per month on the overdue amount shall be levied until the date of actual payment.`,
    `Prepayment: The Borrower may prepay the outstanding loan amount in part or in full at any time during the tenure, subject to prior written intimation to the Lender. Prepayment charges, if any, shall be as mutually agreed at the time of prepayment.`,
    `Default: If the Borrower defaults in payment of three (3) or more consecutive EMIs, the Lender shall have the right to declare the entire outstanding loan amount, along with accrued interest and penalties, as immediately due and payable, and may initiate recovery proceedings and/or invoke any security/collateral furnished.`,
    `Security/Guarantor: Where a guarantor or collateral has been furnished, the guarantor shall be jointly and severally liable for repayment of the outstanding dues in the event of default by the Borrower.`,
    `Use of Loan: The loan amount shall be utilized by the Borrower solely for the purpose stated in this Agreement and for no other purpose.`,
    `Documentation: The Borrower confirms that all KYC documents, photographs, and information furnished to the Lender are true, correct, and complete to the best of their knowledge.`,
    `Governing Law & Jurisdiction: This Agreement shall be governed by the laws of India. Any disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the courts at ${company.jurisdiction || company.city || '__________'}.`,
    `Entire Agreement: This Agreement, along with its Annexure, constitutes the entire understanding between the Parties and supersedes all prior discussions or agreements, oral or written, relating to the subject matter herein.`
  ];
  terms.forEach((t, i) => {
    doc.x = doc.page.margins.left;
    doc.font('Helvetica-Bold').text(`${i + 1}. `, doc.page.margins.left, doc.y, { continued: true, width: pageWidth }).font('Helvetica').text(t, { width: pageWidth });
    doc.x = doc.page.margins.left;
    doc.moveDown(0.35);
  });

  // ---- Signatures ----
  doc.moveDown(0.6);
  if (doc.y > doc.page.height - 150) doc.addPage();
  doc.x = doc.page.margins.left;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('3. Signatures');
  doc.moveDown(1.1);
  const sigY = doc.y;
  const sigColW = pageWidth / 2 - 10;
  doc.moveTo(doc.page.margins.left, sigY).lineTo(doc.page.margins.left + sigColW, sigY).strokeColor('#94a3b8').stroke();
  doc.moveTo(doc.page.margins.left + pageWidth - sigColW, sigY).lineTo(doc.page.width - doc.page.margins.right, sigY).strokeColor('#94a3b8').stroke();
  // Only print the designation as its own line when it actually differs from
  // the name line — with no signatory name on file, both used to fall back
  // to "Authorized Signatory" and print the same line twice.
  const signatoryName = company.signatory || '';
  const signatoryDesignation = company.signatoryDesignation || 'Authorized Signatory';
  const lenderLines = [
    signatoryName || signatoryDesignation,
    ...(signatoryName ? [signatoryDesignation] : []),
    `For ${company.name}`,
    '(LENDER)'
  ];
  doc.fontSize(9).font('Helvetica').fillColor('#1e293b')
    .text(lenderLines.join('\n'), doc.page.margins.left, sigY + 4, { width: sigColW });
  doc.text(`${customer.name}\n(BORROWER)`, doc.page.margins.left + pageWidth - sigColW, sigY + 4, { width: sigColW });

  if (customer.guarantorName) {
    doc.moveDown(1.3);
    const gY = doc.y;
    doc.moveTo(doc.page.margins.left, gY).lineTo(doc.page.margins.left + sigColW, gY).strokeColor('#94a3b8').stroke();
    doc.fontSize(9).text(`${customer.guarantorName}\n(GUARANTOR)`, doc.page.margins.left, gY + 4, { width: sigColW });
  }

  // ---- Annexure A: Repayment Schedule ----
  // Only start a fresh page if the schedule genuinely wouldn't fit below the
  // signatures — otherwise it flowed onto its own near-empty page even when
  // there was plenty of room left after a short signature block.
  doc.x = doc.page.margins.left;
  doc.moveDown(1.4);
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
  } else {
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.8);
  }
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Annexure A: Repayment Schedule', { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Loan No: ${loan.loanNo}   |   Borrower: ${customer.name}`, { align: 'center' });
  doc.moveDown(0.8);

  const cols = [
    { label: '#', width: 28, key: 'seq' },
    { label: 'Due Date', width: 78, key: 'dueDate' },
    { label: 'EMI', width: 78, key: 'emi' },
    { label: 'Principal', width: 78, key: 'principal' },
    { label: 'Interest', width: 78, key: 'interest' },
    { label: 'Balance', width: 78, key: 'balance' },
    { label: 'Status', width: 82, key: 'status' }
  ];
  const tableX = doc.page.margins.left;

  function drawHeader() {
    const y = doc.y;
    doc.rect(tableX, y, pageWidth, 18).fill('#0f172a');
    let x = tableX;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
    cols.forEach((c) => { doc.text(c.label, x + 4, y + 5, { width: c.width - 6 }); x += c.width; });
    doc.y = y + 18;
  }

  drawHeader();
  doc.font('Helvetica').fontSize(8.5);
  loan.schedule.forEach((inst, i) => {
    if (doc.y > doc.page.height - 60) { doc.addPage(); drawHeader(); doc.font('Helvetica').fontSize(8.5); }
    const y = doc.y;
    if (i % 2 === 0) doc.rect(tableX, y, pageWidth, 16).fill('#f8fafc');
    let x = tableX;
    const values = {
      seq: String(inst.seq),
      dueDate: fmtDate(inst.dueDate),
      emi: fmtMoney(inst.emi),
      principal: fmtMoney(inst.principal),
      interest: fmtMoney(inst.interest),
      balance: fmtMoney(inst.balance),
      status: inst.status.charAt(0).toUpperCase() + inst.status.slice(1)
    };
    cols.forEach((c) => {
      const color = c.key === 'status'
        ? (inst.status === 'paid' ? '#059669' : inst.status === 'overdue' ? '#dc2626' : '#334155')
        : '#1e293b';
      doc.fillColor(color).text(values[c.key], x + 4, y + 4, { width: c.width - 6 });
      x += c.width;
    });
    doc.y = y + 16;
  });

  doc.x = doc.page.margins.left;
  doc.moveDown(1);
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
    .text('This is a system-generated repayment schedule forming part of the Loan Agreement referenced above.', doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' });

  // ---- Footer page numbers ----
  // Writing inside the bottom margin normally trips PDFKit's auto-page-break
  // (it thinks the content overflows and silently inserts a blank page), so
  // the margin is zeroed for the duration of this loop.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(8).fillColor('#94a3b8')
      .text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 30, { width: pageWidth, align: 'center' });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return doc;
}

module.exports = { generateAgreementPdf, numberToIndianWords };
