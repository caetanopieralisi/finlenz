import { state, formatBRL } from "./state.js";

export function initHourValue(){
  const incomeInput = document.getElementById("hvIncome");
  if (state.profile?.monthly_income) incomeInput.value = state.profile.monthly_income;

  document.getElementById("hvCalcBtn").addEventListener("click", () => {
    const income = parseFloat(incomeInput.value);
    const hoursPerWeek = parseFloat(document.getElementById("hvHours").value);
    const price = parseFloat(document.getElementById("hvPrice").value);
    const box = document.getElementById("hvResult");

    if (!income || !hoursPerWeek || !price) {
      box.hidden = false;
      box.innerHTML = "Preencha renda, horas semanais e valor da compra.";
      return;
    }

    const monthlyHours = hoursPerWeek * 4.34; // média de semanas no mês
    const hourlyRate = income / monthlyHours;
    const hoursNeeded = price / hourlyRate;

    let comment;
    if (hoursNeeded <= 2) comment = "Um gasto rápido de resolver — tranquilo pro seu orçamento.";
    else if (hoursNeeded <= 10) comment = "Vale parar e pensar se esse gasto cabe no seu momento.";
    else comment = "São muitas horas de trabalho — considere se realmente vale a pena agora.";

    box.hidden = false;
    box.innerHTML = `
      Sua hora de trabalho vale <strong>${formatBRL(hourlyRate)}</strong>.<br>
      Essa compra de ${formatBRL(price)} equivale a <strong>${hoursNeeded.toFixed(1)} horas</strong> do seu trabalho.<br>
      <span class="muted">${comment}</span>`;
  });
}
