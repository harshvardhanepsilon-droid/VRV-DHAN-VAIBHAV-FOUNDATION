const express = require('express');
const router = express.Router();
const { pool, nextDocNumber } = require('../db');
const { buildSchedule, round2, toISODate } = require('../utils/emi');
const { generateAgreementPdf } = require('../utils/agreementPdf');

function annotateOverdue(schedule) {
  const today = toISODate(new Date());
  return schedule.map((inst) => (inst.status === 'due' && inst.dueDate < today ? { ...inst, status: 'overdue' } : inst));
}

function summarize(schedule) {
  const paid = schedule.filter((s) => s.status === 'paid');
  const pending = schedule.filter((s) => s.status !== 'paid');
  const overdue = schedule.filter((s) => s.status === 'overdue');
  return {
    installmentsPaid: paid.length,
    installmentsTotal: schedule.length,
    amountPaid: round2(paid.reduce((s, i) => s + i.paidAmount, 0)),
    amountPending: round2(pending.reduce((s, i) => s + i.emi, 0)),
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((s, i) => s + i.emi, 0)),
    nextDue: pending.length ? pending[0] : null
  };
}

function toLoanDTO(row, customerName) {
  const schedule = annotateOverdue(row.schedule);
  return {
    id: row.id,
    loanNo: row.loan_no,
    customerId: row.customer_id,
    customerName,
    purpose: row.purpose,
    principal: Number(row.principal),
    interestRatePct: Number(row.interest_rate_pct),
    interestType: row.interest_type,
    tenureMonths: row.tenure_months,
    disbursementDate: row.disbursement_date,
    emiAmount: Number(row.emi_amount),
    totalInterest: Number(row.total_interest),
    totalPayable: Number(row.total_payable),
    processingFee: Number(row.processing_fee),
    collateral: row.collateral,
    status: row.status,
    schedule,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...summarize(schedule)
  };
}

async function persistOverdueFlips(client, loanId, schedule) {
  const flipped = annotateOverdue(schedule);
  if (JSON.stringify(flipped) !== JSON.stringify(schedule)) {
    await client.query('UPDATE loans SET schedule = $1 WHERE id = $2', [JSON.stringify(flipped), loanId]);
  }
  return flipped;
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.*, c.name AS customer_name FROM loans l
    JOIN customers c ON c.id = l.customer_id
    ORDER BY l.id DESC
  `);
  const loans = [];
  for (const row of rows) {
    row.schedule = await persistOverdueFlips(pool, row.id, row.schedule);
    loans.push(toLoanDTO(row, row.customer_name));
  }
  res.json(loans);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const loanRow = rows[0];
  loanRow.schedule = await persistOverdueFlips(pool, loanRow.id, loanRow.schedule);
  const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [loanRow.customer_id]);
  const customer = custRows[0] ? {
    id: custRows[0].id,
    name: custRows[0].name,
    fatherOrSpouseName: custRows[0].father_or_spouse_name,
    phone: custRows[0].phone,
    photoPath: custRows[0].photo_data ? `/api/customers/${custRows[0].id}/photo` : ''
  } : null;
  res.json({ ...toLoanDTO(loanRow, customer ? customer.name : 'Unknown'), customer });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const { rows: custRows } = await pool.query('SELECT id FROM customers WHERE id = $1', [body.customerId]);
  if (!custRows.length) return res.status(400).json({ error: 'Select a valid customer' });

  const principal = Number(body.principal);
  const interestRatePct = Number(body.interestRatePct);
  const tenureMonths = Number(body.tenureMonths);
  const interestType = body.interestType === 'flat' ? 'flat' : 'reducing';
  const disbursementDate = body.disbursementDate || toISODate(new Date());

  if (!principal || principal <= 0) return res.status(400).json({ error: 'Principal amount must be greater than 0' });
  if (interestRatePct === undefined || interestRatePct < 0 || Number.isNaN(interestRatePct)) return res.status(400).json({ error: 'Enter a valid annual interest rate' });
  if (!tenureMonths || tenureMonths <= 0) return res.status(400).json({ error: 'Tenure (months) must be greater than 0' });

  const { schedule, emiAmount, totalInterest, totalPayable } = buildSchedule({ principal, interestRatePct, tenureMonths, interestType, disbursementDate });
  const loanNo = await nextDocNumber(pool, 'loan', 'VDV/LN', disbursementDate);

  const { rows } = await pool.query(
    `INSERT INTO loans (
      loan_no, customer_id, purpose, principal, interest_rate_pct, interest_type, tenure_months,
      disbursement_date, emi_amount, total_interest, total_payable, processing_fee, collateral, status, schedule
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14)
    RETURNING *`,
    [
      loanNo, body.customerId, body.purpose || '', round2(principal), interestRatePct, interestType, tenureMonths,
      disbursementDate, emiAmount, totalInterest, totalPayable, Number(body.processingFee) || 0, body.collateral || '',
      JSON.stringify(schedule)
    ]
  );
  const { rows: custName } = await pool.query('SELECT name FROM customers WHERE id = $1', [body.customerId]);
  res.status(201).json(toLoanDTO(rows[0], custName[0].name));
});

router.put('/:id', async (req, res) => {
  const body = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  if (body.status && ['active', 'closed', 'defaulted'].includes(body.status)) { fields.push(`status=$${i++}`); values.push(body.status); }
  if (body.purpose !== undefined) { fields.push(`purpose=$${i++}`); values.push(body.purpose); }
  if (body.collateral !== undefined) { fields.push(`collateral=$${i++}`); values.push(body.collateral); }
  fields.push('updated_at=now()');
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE loans SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const { rows: custName } = await pool.query('SELECT name FROM customers WHERE id = $1', [rows[0].customer_id]);
  res.json(toLoanDTO(rows[0], custName[0] ? custName[0].name : 'Unknown'));
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM loans WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Loan not found' });
  res.status(204).end();
});

router.post('/:id/recalculate', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const loan = rows[0];
  const { schedule, emiAmount, totalInterest, totalPayable } = buildSchedule({
    principal: Number(loan.principal), interestRatePct: Number(loan.interest_rate_pct),
    tenureMonths: loan.tenure_months, interestType: loan.interest_type, disbursementDate: loan.disbursement_date
  });
  const { rows: updated } = await pool.query(
    `UPDATE loans SET schedule=$1, emi_amount=$2, total_interest=$3, total_payable=$4, updated_at=now() WHERE id=$5 RETURNING *`,
    [JSON.stringify(schedule), emiAmount, totalInterest, totalPayable, req.params.id]
  );
  const { rows: custName } = await pool.query('SELECT name FROM customers WHERE id = $1', [updated[0].customer_id]);
  res.json(toLoanDTO(updated[0], custName[0].name));
});

router.post('/:id/installments/:seq/pay', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const loan = rows[0];
  const body = req.body || {};
  const seq = Number(req.params.seq);
  const schedule = loan.schedule.map((inst) => inst.seq === seq
    ? { ...inst, status: 'paid', paidDate: body.paidDate || toISODate(new Date()), paidAmount: body.paidAmount !== undefined ? round2(Number(body.paidAmount)) : inst.emi }
    : inst);
  const allPaid = schedule.every((s) => s.status === 'paid');
  const { rows: updated } = await pool.query(
    'UPDATE loans SET schedule=$1, status=$2, updated_at=now() WHERE id=$3 RETURNING *',
    [JSON.stringify(schedule), allPaid ? 'closed' : loan.status, req.params.id]
  );
  const { rows: custName } = await pool.query('SELECT name FROM customers WHERE id = $1', [updated[0].customer_id]);
  res.json(toLoanDTO(updated[0], custName[0].name));
});

router.post('/:id/installments/:seq/unpay', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const loan = rows[0];
  const seq = Number(req.params.seq);
  const schedule = annotateOverdue(loan.schedule.map((inst) => inst.seq === seq
    ? { ...inst, status: 'due', paidDate: null, paidAmount: 0 }
    : inst));
  const { rows: updated } = await pool.query(
    'UPDATE loans SET schedule=$1, status=$2, updated_at=now() WHERE id=$3 RETURNING *',
    [JSON.stringify(schedule), loan.status === 'closed' ? 'active' : loan.status, req.params.id]
  );
  const { rows: custName } = await pool.query('SELECT name FROM customers WHERE id = $1', [updated[0].customer_id]);
  res.json(toLoanDTO(updated[0], custName[0].name));
});

router.get('/:id/agreement.pdf', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
  const loanRow = rows[0];
  const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [loanRow.customer_id]);
  if (!custRows.length) return res.status(400).json({ error: 'Loan has no linked customer' });
  const c = custRows[0];
  const customer = {
    name: c.name, fatherOrSpouseName: c.father_or_spouse_name, phone: c.phone, altPhone: c.alt_phone,
    address: c.address, city: c.city, state: c.state, pincode: c.pincode,
    aadhaarNumber: c.aadhaar_number, panNumber: c.pan_number, occupation: c.occupation, monthlyIncome: c.monthly_income,
    guarantorName: c.guarantor_name, photoBuffer: c.photo_data || null
  };
  const { rows: configRows } = await pool.query('SELECT company, logo_data FROM config WHERE id = 1');
  const company = { ...configRows[0].company, logoBuffer: configRows[0].logo_data || null };

  const loan = {
    loanNo: loanRow.loan_no, principal: Number(loanRow.principal), interestRatePct: Number(loanRow.interest_rate_pct),
    interestType: loanRow.interest_type, tenureMonths: loanRow.tenure_months, disbursementDate: loanRow.disbursement_date,
    emiAmount: Number(loanRow.emi_amount), totalInterest: Number(loanRow.total_interest), totalPayable: Number(loanRow.total_payable),
    processingFee: Number(loanRow.processing_fee), purpose: loanRow.purpose, collateral: loanRow.collateral,
    schedule: loanRow.schedule
  };

  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Loan-Agreement-${loan.loanNo.replace(/\//g, '-')}.pdf"`);
    generateAgreementPdf({ loan, customer, company }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
