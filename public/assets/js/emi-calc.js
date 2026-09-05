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
