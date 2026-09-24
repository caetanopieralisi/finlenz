// ===========================================================
// Cálculos financeiros compartilhados pelas ferramentas.
// ===========================================================

// Rendimento de referência para "deixar o dinheiro guardado":
// CDB 110% do CDI, a mesma taxa média usada no simulador de investimentos.
export const REF_MONTHLY_RATE = 0.009;
export const WEEKS_PER_MONTH = 4.34;

export function fmtNum(n, d = 1){
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtPct(rate, d = 1){ return `${fmtNum(rate * 100, d)}%`; }

// Quantas horas de trabalho uma compra custa.
export function workHours(price, monthlyIncome, hoursPerWeek = 40){
  if (!price || !monthlyIncome || !hoursPerWeek) return null;
  const hourly = monthlyIncome / (hoursPerWeek * WEEKS_PER_MONTH);
  const hours = price / hourly;
  const hoursPerDay = hoursPerWeek / 5;
  return { hours, hourly, days: hours / hoursPerDay, weekPct: hours / hoursPerWeek };
}

export function hoursLabel(h){
  if (h.hours < 1) return `${Math.round(h.hours * 60)} min de trabalho`;
  if (h.days >= 1) {
    const d = Math.floor(h.days);
    const rest = h.hours - d * (h.hours / h.days);
    return `${d} dia${d > 1 ? "s" : ""}${rest >= 0.5 ? ` e ${fmtNum(rest)}h` : ""} de trabalho`;
  }
  return `${fmtNum(h.hours)} horas de trabalho`;
}

// Atraso (em dias) que uma compra causa em um sonho.
export function dreamDelayDays(price, dream){
  const m = Number(dream && dream.monthly_contribution);
  if (!m || !price) return null;
  return Math.round((price / m) * 30);
}

export function monthsToGoal(dream, monthly){
  const missing = Math.max(0, Number(dream.target_amount) - Number(dream.saved_amount));
  if (missing <= 0) return 0;
  const m = monthly === undefined ? Number(dream.monthly_contribution) : Number(monthly);
  if (!m) return Infinity;
  return Math.ceil(missing / m);
}

export function monthLabelFromNow(months){
  const d = new Date(); d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").replace(" de ", " de ");
}

// Sonho "principal": o primeiro com aporte mensal definido e ainda não concluído.
export function mainDream(dreams){
  return (dreams || []).find(d => Number(d.monthly_contribution) > 0 && Number(d.saved_amount) < Number(d.target_amount)) || null;
}

// Valor presente de n parcelas de pmt a uma taxa i.
// firstNow = primeira parcela paga no ato da compra.
function presentValue(pmt, n, i, firstNow){
  if (i === 0) return pmt * n;
  const annuity = (k) => pmt * (1 - Math.pow(1 + i, -k)) / i;
  return firstNow ? pmt + annuity(n - 1) : annuity(n);
}

// Taxa de juros mensal "escondida" no parcelamento (busca binária).
export function impliedMonthlyRate(cashPrice, pmt, n, firstNow = false){
  const total = pmt * n;
  if (Math.abs(total - cashPrice) < 0.01) return 0;
  let lo = -0.5, hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const pv = presentValue(pmt, n, mid, firstNow);
    if (pv > cashPrice) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function annualRate(monthly){ return Math.pow(1 + monthly, 12) - 1; }

// Se você deixasse o valor à vista rendendo e pagasse as parcelas com ele,
// quanto sobraria (ou faltaria) no fim.
export function investAndPay(cashPrice, pmt, n, firstNow = false, rate = REF_MONTHLY_RATE){
  let bal = cashPrice;
  if (firstNow) bal -= pmt;
  const rest = firstNow ? n - 1 : n;
  for (let k = 0; k < rest; k++) { bal = bal * (1 + rate) - pmt; }
  return bal;
}
