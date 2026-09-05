// Mirrors src/utils/emi.js on the server, used only for the instant preview before submit.
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function previewEmi(principal, annualRatePct, tenureMonths, interestType) {
  if (!principal || !tenureMonths || annualRatePct === undefined || annualRatePct === null || Number.isNaN(annualRatePct)) return null;

  if (interestType === 'flat') {
    const totalInterest = round2(principal * (annualRatePct / 100) * (tenureMonths / 12));
    const totalPayable = round2(principal + totalInterest);
    const emi = round2(totalPayable / tenureMonths);
    return { emi, totalInterest, totalPayable };
  }

  const r = annualRatePct / 12 / 100;
  const emi = r === 0
    ? round2(principal / tenureMonths)
    : round2((principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1));
  const totalPayable = round2(emi * tenureMonths);
  const totalInterest = round2(totalPayable - principal);
  return { emi, totalInterest, totalPayable };
}

function addMonthsClient(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

// Month-by-month amortization table for the calculator's optional full
// breakdown — same math as src/utils/emi.js's buildSchedule, just without
// the status/paidAmount bookkeeping fields that only make sense for a real,
// persisted loan.
function previewSchedule(principal, annualRatePct, tenureMonths, interestType, startDate) {
  const anchorDate = addMonthsClient(startDate || new Date(), 1);
  const schedule = [];

  if (interestType === 'flat') {
    const totalInterest = round2(principal * (annualRatePct / 100) * (tenureMonths / 12));
    const basePrincipal = Math.floor((principal / tenureMonths) * 100) / 100;
    const baseInterest = Math.floor((totalInterest / tenureMonths) * 100) / 100;
    let balance = principal;
    for (let i = 1; i <= tenureMonths; i++) {
      const isLast = i === tenureMonths;
      const principalComponent = isLast ? round2(balance) : basePrincipal;
      const interestComponent = isLast ? round2(totalInterest - baseInterest * (tenureMonths - 1)) : baseInterest;
      balance = round2(balance - principalComponent);
      schedule.push({ seq: i, dueDate: addMonthsClient(anchorDate, i - 1), emi: round2(principalComponent + interestComponent), principal: principalComponent, interest: interestComponent, balance: Math.max(0, balance) });
    }
    return schedule;
  }

  const r = annualRatePct / 12 / 100;
  const emiAmount = r === 0 ? round2(principal / tenureMonths) : round2((principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1));
  let balance = principal;
  for (let i = 1; i <= tenureMonths; i++) {
    const isLast = i === tenureMonths;
    const interestComponent = round2(balance * r);
    let principalComponent = round2(emiAmount - interestComponent);
    let emi = emiAmount;
    if (isLast) { principalComponent = round2(balance); emi = round2(principalComponent + interestComponent); }
    balance = round2(balance - principalComponent);
    schedule.push({ seq: i, dueDate: addMonthsClient(anchorDate, i - 1), emi, principal: principalComponent, interest: interestComponent, balance: Math.max(0, balance) });
  }
  return schedule;
}
