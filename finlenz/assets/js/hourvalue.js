import { state, formatBRL } from "./state.js";

export function initHourValue(){
  const incomeInput = document.getElementById("hvIncome");
  const hoursInput = document.getElementById("hvHours");
  const priceInput = document.getElementById("hvPrice");
  const box = document.getElementById("hvResult");

  if (state.profile?.monthly_income) incomeInput.value = state.profile.monthly_income;

  function calc(){
    const income = parseFloat(incomeInput.value);
    const hoursPerWeek = parseFloat(hoursInput.value);
    const price = parseFloat(priceInput.value);

    if (!income || !hoursPerWeek || !price) {
      box.hidden = false;
      box.className = "result-box hv-result";
      box.innerHTML = `<p class="muted">Preencha renda, horas semanais e valor da compra pra ver o resultado.</p>`;
      return;
    }

    const monthlyHours = hoursPerWeek * 4.34; // média de semanas no mês
    const hourlyRate = income / monthlyHours;
    const hoursNeeded = price / hourlyRate;
    const hoursPerDay = hoursPerWeek / 5;
    const days = Math.floor(hoursNeeded / hoursPerDay);
    const remainderHours = hoursNeeded - days * hoursPerDay;

    let dayText = "";
    if (days >= 1) {
      dayText = `${days} dia${days > 1 ? "s" : ""}`;
      if (remainderHours >= 0.1) dayText += ` e ${remainderHours.toFixed(1)}h`;
      dayText += " de trabalho";
    } else {
      dayText = `${hoursNeeded.toFixed(1)} horas de trabalho`;
    }

    let tier, comment;
    if (hoursNeeded <= 2) { tier = "hv-tag--low"; comment = "Um gasto rápido de resolver, tranquilo pro seu orçamento."; }
    else if (hoursNeeded <= 10) { tier = "hv-tag--mid"; comment = "Vale parar e pensar se esse gasto cabe no seu momento."; }
    else { tier = "hv-tag--high"; comment = "São muitas horas de trabalho. Considere se realmente vale a pena agora."; }

    const barPct = Math.min(100, (hoursNeeded / hoursPerWeek) * 100);

    box.hidden = false;
    box.className = `result-box hv-result ${tier}`;
    box.innerHTML = `
      <div class="hv-result__big">${hoursNeeded.toFixed(1)}<span>h</span></div>
      <p class="hv-result__sub">≈ ${dayText}</p>
      <div class="hv-progress"><div class="hv-progress__fill" style="width:${barPct}%"></div></div>
      <p class="hv-progress__label">${barPct.toFixed(0)}% da sua semana de trabalho</p>
      <div class="hv-result__stats">
        <div><small>Sua hora vale</small><b>${formatBRL(hourlyRate)}</b></div>
        <div><small>Valor da compra</small><b>${formatBRL(price)}</b></div>
      </div>
      <p class="hv-result__comment">${comment}</p>`;
  }

  [incomeInput, hoursInput, priceInput].forEach(input => {
    input.addEventListener("input", calc);
  });
  document.getElementById("hvCalcBtn").addEventListener("click", calc);
}
