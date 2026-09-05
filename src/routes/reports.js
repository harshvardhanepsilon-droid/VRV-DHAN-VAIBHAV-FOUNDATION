const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { toCsv } = require('../utils/csv');

function sendCsv(res, filename, rows, columns) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(rows, columns));
}

router.get('/summary', async (req, res) => {
  const { rows: loans } = await pool.query('SELECT status, principal, schedule FROM loans');
  let totalDisbursed = 0, totalOutstanding = 0, totalCollected = 0, overdueAmount = 0, activeLoans = 0, closedLoans = 0;
  loans.forEach((l) => {
    totalDisbursed += Number(l.principal);
    if (l.status === 'active') activeLoans++;
    if (l.status === 'closed') closedLoans++;
    (l.schedule || []).forEach((inst) => {
      const paid = Number(inst.paidAmount || 0);
      totalCollected += paid;
      totalOutstanding += Math.max(0, Number(inst.emi) - paid);
      if (inst.status === 'overdue') overdueAmount += Math.max(0, Number(inst.emi) - paid);
    });
  });
  const { rows: custCount } = await pool.query('SELECT COUNT(*)::int AS n FROM customers');
  res.json({
    totalCustomers: custCount[0].n,
    totalLoans: loans.length,
    activeLoans,
    closedLoans,
    totalDisbursed,
    totalOutstanding,
    totalCollected,
    overdueAmount
  });
});

router.get('/customers.csv', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, COUNT(l.id) FILTER (WHERE l.id IS NOT NULL) AS loan_count
    FROM customers c LEFT JOIN loans l ON l.customer_id = c.id
    GROUP BY c.id ORDER BY c.id
  `);
  sendCsv(res, 'customers.csv', rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, alt_phone: r.alt_phone, email: r.email,
    address: r.address, city: r.city, state: r.state, pincode: r.pincode,
    aadhaar_number: r.aadhaar_number, pan_number: r.pan_number, occupation: r.occupation,
    monthly_income: r.monthly_income, guarantor_name: r.guarantor_name, guarantor_phone: r.guarantor_phone,
    loan_count: r.loan_count, created_at: r.created_at
  })), [
    { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' },
    { key: 'alt_phone', label: 'Alternate Phone' }, { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' },
    { key: 'pincode', label: 'Pincode' }, { key: 'aadhaar_number', label: 'Aadhaar No.' },
    { key: 'pan_number', label: 'PAN No.' }, { key: 'occupation', label: 'Occupation' },
    { key: 'monthly_income', label: 'Monthly Income' }, { key: 'guarantor_name', label: 'Guarantor Name' },
    { key: 'guarantor_phone', label: 'Guarantor Phone' }, { key: 'loan_count', label: 'Loan Count' },
    { key: 'created_at', label: 'Customer Since' }
  ]);
});

router.get('/loans.csv', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.*, c.name AS customer_name, c.phone AS customer_phone
    FROM loans l JOIN customers c ON c.id = l.customer_id
    ORDER BY l.id
  `);
  sendCsv(res, 'loans.csv', rows.map((l) => {
    const paid = (l.schedule || []).reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const outstanding = Number(l.total_payable) - paid;
    return {
      loan_no: l.loan_no, customer_name: l.customer_name, customer_phone: l.customer_phone,
      principal: l.principal, interest_rate_pct: l.interest_rate_pct, interest_type: l.interest_type,
      tenure_months: l.tenure_months, disbursement_date: l.disbursement_date, emi_amount: l.emi_amount,
      total_payable: l.total_payable, amount_paid: paid.toFixed(2), amount_outstanding: outstanding.toFixed(2),
      status: l.status, purpose: l.purpose
    };
  }), [
    { key: 'loan_no', label: 'Loan No.' }, { key: 'customer_name', label: 'Customer' },
    { key: 'customer_phone', label: 'Phone' }, { key: 'principal', label: 'Principal' },
    { key: 'interest_rate_pct', label: 'Interest Rate %' }, { key: 'interest_type', label: 'Interest Type' },
    { key: 'tenure_months', label: 'Tenure (months)' }, { key: 'disbursement_date', label: 'Disbursement Date' },
    { key: 'emi_amount', label: 'EMI' }, { key: 'total_payable', label: 'Total Payable' },
    { key: 'amount_paid', label: 'Amount Paid' }, { key: 'amount_outstanding', label: 'Amount Outstanding' },
    { key: 'status', label: 'Status' }, { key: 'purpose', label: 'Purpose' }
  ]);
});

router.get('/collections.csv', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.loan_no, c.name AS customer_name, l.schedule
    FROM loans l JOIN customers c ON c.id = l.customer_id
    ORDER BY l.id
  `);
  const collections = [];
  rows.forEach((l) => {
    (l.schedule || []).forEach((inst) => {
      if (Number(inst.paidAmount || 0) > 0) {
        collections.push({
          loan_no: l.loan_no, customer_name: l.customer_name, installment_no: inst.seq,
          due_date: inst.dueDate, paid_date: inst.paidDate || '', amount_paid: Number(inst.paidAmount).toFixed(2),
          emi: Number(inst.emi).toFixed(2), status: inst.status
        });
      }
    });
  });
  collections.sort((a, b) => (a.paid_date || '').localeCompare(b.paid_date || ''));
  sendCsv(res, 'collections.csv', collections, [
    { key: 'loan_no', label: 'Loan No.' }, { key: 'customer_name', label: 'Customer' },
    { key: 'installment_no', label: 'Installment #' }, { key: 'due_date', label: 'Due Date' },
    { key: 'paid_date', label: 'Paid Date' }, { key: 'amount_paid', label: 'Amount Paid' },
    { key: 'emi', label: 'EMI' }, { key: 'status', label: 'Status' }
  ]);
});

module.exports = router;
