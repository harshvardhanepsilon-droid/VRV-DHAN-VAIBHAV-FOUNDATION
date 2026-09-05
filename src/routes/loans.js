const express = require('express');
const router = express.Router();
const { readDB, writeDB, nextId, nextDocNumber } = require('../db');
const { buildSchedule, round2, toISODate } = require('../utils/emi');
const { generateAgreementPdf } = require('../utils/agreementPdf');

function annotateOverdue(loan) {
  const today = toISODate(new Date());
  loan.schedule.forEach((inst) => {
    if (inst.status === 'due' && inst.dueDate < today) inst.status = 'overdue';
  });
  return loan;
}

function summarize(loan) {
  const paid = loan.schedule.filter((s) => s.status === 'paid');
  const pending = loan.schedule.filter((s) => s.status !== 'paid');
  const overdue = loan.schedule.filter((s) => s.status === 'overdue');
  return {
    installmentsPaid: paid.length,
    installmentsTotal: loan.schedule.length,
    amountPaid: round2(paid.reduce((s, i) => s + i.paidAmount, 0)),
    amountPending: round2(pending.reduce((s, i) => s + i.emi, 0)),
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((s, i) => s + i.emi, 0)),
    nextDue: pending.length ? pending[0] : null
  };
}

router.get('/', (req, res) => {
  const db = readDB();
  let changed = false;
  db.loans.forEach((l) => {
    const before = JSON.stringify(l.schedule);
    annotateOverdue(l);
    if (JSON.stringify(l.schedule) !== before) changed = true;
  });
  if (changed) writeDB(db);
  const loans = db.loans.map((l) => {
    const customer = db.customers.find((c) => c.id === l.customerId);
    return { ...l, customerName: customer ? customer.name : 'Unknown', ...summarize(l) };
  }).sort((a, b) => b.id - a.id);
  res.json(loans);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  annotateOverdue(loan);
  writeDB(db);
  const customer = db.customers.find((c) => c.id === loan.customerId);
  res.json({ ...loan, customer, ...summarize(loan) });
});

router.post('/', (req, res) => {
  const db = readDB();
  const body = req.body || {};
  const customer = db.customers.find((c) => c.id === Number(body.customerId));
  if (!customer) return res.status(400).json({ error: 'Select a valid customer' });

  const principal = Number(body.principal);
  const interestRatePct = Number(body.interestRatePct);
  const tenureMonths = Number(body.tenureMonths);
  const interestType = body.interestType === 'flat' ? 'flat' : 'reducing';
  const disbursementDate = body.disbursementDate || toISODate(new Date());

  if (!principal || principal <= 0) return res.status(400).json({ error: 'Principal amount must be greater than 0' });
  if (interestRatePct === undefined || interestRatePct < 0 || Number.isNaN(interestRatePct)) return res.status(400).json({ error: 'Enter a valid annual interest rate' });
  if (!tenureMonths || tenureMonths <= 0) return res.status(400).json({ error: 'Tenure (months) must be greater than 0' });

  const { schedule, emiAmount, totalInterest, totalPayable } = buildSchedule({ principal, interestRatePct, tenureMonths, interestType, disbursementDate });

  const now = new Date().toISOString();
  const loan = {
    id: nextId(db, 'loans'),
    loanNo: nextDocNumber(db, 'loan', 'VDV/LN', disbursementDate),
    customerId: customer.id,
    purpose: body.purpose || '',
    principal: round2(principal),
    interestRatePct,
    interestType,
    tenureMonths,
    disbursementDate,
    emiAmount,
    totalInterest,
    totalPayable,
    processingFee: Number(body.processingFee) || 0,
    collateral: body.collateral || '',
    status: 'active',
    schedule,
    createdAt: now,
    updatedAt: now
  };
  db.loans.push(loan);
  writeDB(db);
  res.status(201).json(loan);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const body = req.body || {};
  if (body.status && ['active', 'closed', 'defaulted'].includes(body.status)) loan.status = body.status;
  if (body.purpose !== undefined) loan.purpose = body.purpose;
  if (body.collateral !== undefined) loan.collateral = body.collateral;
  loan.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(loan);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  const idx = db.loans.findIndex((l) => l.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Loan not found' });
  db.loans.splice(idx, 1);
  writeDB(db);
  res.status(204).end();
});

// Recalculate the schedule for an active loan (e.g. after a data-entry fix); any recorded payments are lost.
router.post('/:id/recalculate', (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const { schedule, emiAmount, totalInterest, totalPayable } = buildSchedule(loan);
  loan.schedule = schedule;
  loan.emiAmount = emiAmount;
  loan.totalInterest = totalInterest;
  loan.totalPayable = totalPayable;
  loan.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(loan);
});

router.post('/:id/installments/:seq/pay', (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const inst = loan.schedule.find((s) => s.seq === Number(req.params.seq));
  if (!inst) return res.status(404).json({ error: 'Installment not found' });
  const body = req.body || {};
  inst.status = 'paid';
  inst.paidDate = body.paidDate || toISODate(new Date());
  inst.paidAmount = body.paidAmount !== undefined ? round2(Number(body.paidAmount)) : inst.emi;
  loan.updatedAt = new Date().toISOString();
  if (loan.schedule.every((s) => s.status === 'paid')) loan.status = 'closed';
  writeDB(db);
  res.json(loan);
});

router.post('/:id/installments/:seq/unpay', (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const inst = loan.schedule.find((s) => s.seq === Number(req.params.seq));
  if (!inst) return res.status(404).json({ error: 'Installment not found' });
  inst.status = 'due';
  inst.paidDate = null;
  inst.paidAmount = 0;
  if (loan.status === 'closed') loan.status = 'active';
  annotateOverdue(loan);
  loan.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(loan);
});

router.get('/:id/agreement.pdf', async (req, res) => {
  const db = readDB();
  const loan = db.loans.find((l) => l.id === Number(req.params.id));
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const customer = db.customers.find((c) => c.id === loan.customerId);
  if (!customer) return res.status(400).json({ error: 'Loan has no linked customer' });
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Loan-Agreement-${loan.loanNo.replace(/\//g, '-')}.pdf"`);
    generateAgreementPdf({ loan, customer, company: db.config.company }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
