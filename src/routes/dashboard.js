const express = require('express');
const router = express.Router();
const { readDB } = require('../db');
const { round2, toISODate } = require('../utils/emi');

router.get('/', (req, res) => {
  const db = readDB();
  const today = toISODate(new Date());

  db.loans.forEach((l) => {
    l.schedule.forEach((s) => { if (s.status === 'due' && s.dueDate < today) s.status = 'overdue'; });
  });

  const activeLoans = db.loans.filter((l) => l.status === 'active');
  const closedLoans = db.loans.filter((l) => l.status === 'closed');
  const defaultedLoans = db.loans.filter((l) => l.status === 'defaulted');

  const totalDisbursed = round2(db.loans.reduce((s, l) => s + l.principal, 0));
  const totalCollected = round2(db.loans.reduce((s, l) => s + l.schedule.reduce((s2, i) => s2 + (i.status === 'paid' ? i.paidAmount : 0), 0), 0));
  const totalOutstanding = round2(db.loans.reduce((s, l) => s + l.schedule.reduce((s2, i) => s2 + (i.status !== 'paid' ? i.emi : 0), 0), 0));

  const overdueInstallments = [];
  const upcomingInstallments = [];
  const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysISO = toISODate(in7Days);

  db.loans.forEach((l) => {
    const customer = db.customers.find((c) => c.id === l.customerId);
    l.schedule.forEach((s) => {
      if (s.status === 'overdue') {
        overdueInstallments.push({ loanId: l.id, loanNo: l.loanNo, customerName: customer ? customer.name : 'Unknown', ...s });
      } else if (s.status === 'due' && s.dueDate <= in7DaysISO) {
        upcomingInstallments.push({ loanId: l.id, loanNo: l.loanNo, customerName: customer ? customer.name : 'Unknown', ...s });
      }
    });
  });

  overdueInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcomingInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const recentLoans = [...db.loans]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((l) => {
      const customer = db.customers.find((c) => c.id === l.customerId);
      return { id: l.id, loanNo: l.loanNo, customerName: customer ? customer.name : 'Unknown', principal: l.principal, status: l.status, disbursementDate: l.disbursementDate, emiAmount: l.emiAmount };
    });

  res.json({
    totalCustomers: db.customers.length,
    totalLoans: db.loans.length,
    activeLoanCount: activeLoans.length,
    closedLoanCount: closedLoans.length,
    defaultedLoanCount: defaultedLoans.length,
    totalDisbursed,
    totalCollected,
    totalOutstanding,
    overdueCount: overdueInstallments.length,
    overdueAmount: round2(overdueInstallments.reduce((s, i) => s + i.emi, 0)),
    overdueInstallments: overdueInstallments.slice(0, 20),
    upcomingInstallments: upcomingInstallments.slice(0, 20),
    recentLoans
  });
});

module.exports = router;
