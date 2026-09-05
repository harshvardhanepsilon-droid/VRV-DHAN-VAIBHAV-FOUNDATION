function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp to the last day of the target month so e.g. Jan 31 + 1 month lands
  // on Feb 28/29 instead of rolling into March.
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Standard reducing-balance EMI formula.
function reducingBalanceEmi(principal, annualRatePct, tenureMonths) {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return round2(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return round2((principal * r * factor) / (factor - 1));
}

function buildSchedule(loan) {
  const { principal, interestRatePct, tenureMonths, interestType, disbursementDate } = loan;
  const schedule = [];
  const startDate = new Date(disbursementDate);

  if (interestType === 'flat') {
    const totalInterest = round2(principal * (interestRatePct / 100) * (tenureMonths / 12));
    const totalPayable = round2(principal + totalInterest);
    const basePrincipal = Math.floor((principal / tenureMonths) * 100) / 100;
    const baseInterest = Math.floor((totalInterest / tenureMonths) * 100) / 100;
    let balance = principal;
    for (let i = 1; i <= tenureMonths; i++) {
      const isLast = i === tenureMonths;
      const principalComponent = isLast ? round2(balance) : basePrincipal;
      const interestComponent = isLast ? round2(totalInterest - baseInterest * (tenureMonths - 1)) : baseInterest;
      balance = round2(balance - principalComponent);
      schedule.push({
        seq: i,
        dueDate: toISODate(addMonths(startDate, i)),
        emi: round2(principalComponent + interestComponent),
        principal: principalComponent,
        interest: interestComponent,
        balance: Math.max(0, balance),
        status: 'due',
        paidDate: null,
        paidAmount: 0
      });
    }
    return { schedule, emiAmount: schedule[0] ? schedule[0].emi : 0, totalInterest, totalPayable };
  }

  // Reducing balance (default)
  const r = interestRatePct / 12 / 100;
  const emiAmount = reducingBalanceEmi(principal, interestRatePct, tenureMonths);
  let balance = principal;
  let totalInterest = 0;
  for (let i = 1; i <= tenureMonths; i++) {
    const isLast = i === tenureMonths;
    const interestComponent = round2(balance * r);
    let principalComponent = round2(emiAmount - interestComponent);
    let emi = emiAmount;
    if (isLast) {
      // Absorb rounding drift into the final installment so the balance lands exactly on zero.
      principalComponent = round2(balance);
      emi = round2(principalComponent + interestComponent);
    }
    balance = round2(balance - principalComponent);
    totalInterest = round2(totalInterest + interestComponent);
    schedule.push({
      seq: i,
      dueDate: toISODate(addMonths(startDate, i)),
      emi,
      principal: principalComponent,
      interest: interestComponent,
      balance: Math.max(0, balance),
      status: 'due',
      paidDate: null,
      paidAmount: 0
    });
  }
  const totalPayable = round2(principal + totalInterest);
  return { schedule, emiAmount, totalInterest, totalPayable };
}

module.exports = { round2, addMonths, toISODate, reducingBalanceEmi, buildSchedule };
