const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { round2, toISODate } = require('../utils/emi');

router.get('/', async (req, res) => {
  const today = toISODate(new Date());

  const { rows: customerCountRows } = await pool.query('SELECT COUNT(*) FROM customers');
  const totalCustomers = Number(customerCountRows[0].count);

  const { rows: loanRows } = await pool.query(`
    SELECT l.id, l.loan_no, l.customer_id, l.principal, l.emi_amount, l.status, l.disbursement_date,
           l.schedule, l.created_at, c.name AS customer_name
    FROM loans l JOIN customers c ON c.id = l.customer_id
    ORDER BY l.id DESC
  `);

  let changed = false;
  const flippedRows = loanRows.map((row) => {
    const flipped = row.schedule.map((s) => ((s.status === 'due' || s.status === 'partial') && s.dueDate < today ? { ...s, status: 'overdue' } : s));
    if (JSON.stringify(flipped) !== JSON.stringify(row.schedule)) changed = true;
    return { ...row, schedule: flipped };
  });
  if (changed) {
    await Promise.all(flippedRows.map((row) => pool.query('UPDATE loans SET schedule = $1 WHERE id = $2', [JSON.stringify(row.schedule), row.id])));
  }

  const activeLoans = flippedRows.filter((l) => l.status === 'active');
  const closedLoans = flippedRows.filter((l) => l.status === 'closed');
  const defaultedLoans = flippedRows.filter((l) => l.status === 'defaulted');

  const totalDisbursed = round2(flippedRows.reduce((s, l) => s + Number(l.principal), 0));
  const totalCollected = round2(flippedRows.reduce((s, l) => s + l.schedule.reduce((s2, i) => s2 + Number(i.paidAmount || 0), 0), 0));
  const totalOutstanding = round2(flippedRows.reduce((s, l) => s + l.schedule.reduce((s2, i) => s2 + (i.status !== 'paid' ? Math.max(0, i.emi - (i.paidAmount || 0)) : 0), 0), 0));

  const overdueInstallments = [];
  const upcomingInstallments = [];
  const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysISO = toISODate(in7Days);

  flippedRows.forEach((l) => {
    l.schedule.forEach((s) => {
      if (s.status === 'overdue') {
        const remaining = round2(Math.max(0, s.emi - (s.paidAmount || 0)));
        overdueInstallments.push({ loanId: l.id, loanNo: l.loan_no, customerName: l.customer_name, ...s, remaining });
      } else if (s.status === 'due' && s.dueDate <= in7DaysISO) {
        upcomingInstallments.push({ loanId: l.id, loanNo: l.loan_no, customerName: l.customer_name, ...s });
      }
    });
  });

  overdueInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcomingInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const recentLoans = [...flippedRows]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)
    .map((l) => ({ id: l.id, loanNo: l.loan_no, customerName: l.customer_name, principal: Number(l.principal), status: l.status, disbursementDate: l.disbursement_date, emiAmount: Number(l.emi_amount) }));

  res.json({
    totalCustomers,
    totalLoans: flippedRows.length,
    activeLoanCount: activeLoans.length,
    closedLoanCount: closedLoans.length,
    defaultedLoanCount: defaultedLoans.length,
    totalDisbursed,
    totalCollected,
    totalOutstanding,
    overdueCount: overdueInstallments.length,
    overdueAmount: round2(overdueInstallments.reduce((s, i) => s + i.remaining, 0)),
    overdueInstallments: overdueInstallments.slice(0, 20),
    upcomingInstallments: upcomingInstallments.slice(0, 20),
    recentLoans
  });
});

module.exports = router;
