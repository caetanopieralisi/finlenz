import { formatBRL } from "./state.js";

let chart;
let presets = [];

export async function initInvestments(){
  presets = await fetch("data/investment-presets.json").then(r => r.json());
  renderCards();
  document.getElementById("invCalcBtn").addEventListener("click", runSimulation);
  document.querySelectorAll('[data-goto="investments"]').forEach(el => el.addEventListener("click", () => {
    if (!chart) runSimulation();
  }));
}

function renderCards(){
  const list = document.getElementById("invCardsList");
  if (!list) return;
  list.innerHTML = presets.map(p => `
    <div class="invest-card">
      <div class="invest-card__head">
        <span class="invest-card__dot" style="background:${p.color}"></span>
        <h4>${p.name}</h4>
      </div>
      <p class="muted small">${p.detail}</p>
      <div class="invest-card__meta">
        <span class="invest-card__tag">Risco: ${p.risk}</span>
        <span class="invest-card__tag">Liquidez: ${p.liquidity}</span>
        <span class="invest-card__tag">${p.taxProfile === "isento" ? "Isento de IR" : "Tem IR na venda"}</span>
      </div>
    </div>`).join("");
}

function simulate(initial, monthly, months, rate){
  const series = [initial];
  let total = initial;
  for (let i = 1; i <= months; i++) {
    total = total * (1 + rate) + monthly;
    series.push(total);
  }
  return series;
}

// Tabela regressiva de IR sobre renda fixa (aplicada só sobre o rendimento, nunca sobre o valor investido).
function irRateRegressiva(months){
  const days = months * 30;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

function estimateTax(taxProfile, gain, months){
  if (gain <= 0) return 0;
  if (taxProfile === "isento") return 0;
  if (taxProfile === "capital-15") return gain * 0.15;
  return gain * irRateRegressiva(months); // regressiva
}

function runSimulation(){
  const initial = parseFloat(document.getElementById("invInitial").value) || 0;
  const monthly = parseFloat(document.getElementById("invMonthly").value) || 0;
  const months = parseInt(document.getElementById("invMonths").value) || 12;
  const invested = initial + monthly * months;

  const labels = Array.from({ length: months + 1 }, (_, i) => `Mês ${i}`);
  const datasets = presets.map(p => ({
    label: p.name,
    data: simulate(initial, monthly, months, p.monthlyRate),
    borderColor: p.color,
    backgroundColor: p.color,
    tension: 0.3,
    pointRadius: 0,
  }));

  const style = getComputedStyle(document.documentElement);
  const textSoft = style.getPropertyValue("--text-soft").trim() || "#8FA391";
  const border = style.getPropertyValue("--border").trim() || "#232B23";

  const ctx = document.getElementById("investChart");
  chart?.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      plugins: { legend: { position: "bottom", labels: { color: textSoft, boxWidth: 10, font: { size: 10 } } } },
      scales: {
        y: { ticks: { color: textSoft, callback: v => formatBRL(v) }, grid: { color: border } },
        x: { ticks: { color: textSoft }, grid: { color: border } },
      },
    },
  });

  // Monta resultados com bruto, IR estimado e líquido, ordenado do melhor líquido pro pior.
  const results = presets.map(p => {
    const grossFinal = simulate(initial, monthly, months, p.monthlyRate).at(-1);
    const gain = grossFinal - invested;
    const tax = estimateTax(p.taxProfile, gain, months);
    const netFinal = grossFinal - tax;
    return { ...p, grossFinal, gain, tax, netFinal };
  }).sort((a, b) => b.netFinal - a.netFinal);

  const bestId = results[0]?.id;
  const table = document.getElementById("invResultTable");
  const rows = results.map(r => `
    <tr class="${r.id === bestId ? "is-best-row" : ""}">
      <td>${r.name}${r.id === bestId ? ' <span class="badge badge-income">melhor líquido</span>' : ""}</td>
      <td>${r.risk}</td>
      <td>${formatBRL(r.gain)}</td>
      <td>${r.tax > 0 ? "-" + formatBRL(r.tax) : "isento"}</td>
      <td><strong>${formatBRL(r.netFinal)}</strong></td>
    </tr>`).join("");

  table.innerHTML = `
    <p class="muted small" style="margin-bottom:8px;">
      Total investido no período: <strong>${formatBRL(invested)}</strong>
    </p>
    <div style="overflow-x:auto;">
      <table>
        <thead><tr><th>Investimento</th><th>Risco</th><th>Rendimento bruto</th><th>IR estimado</th><th>Valor líquido final</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="muted small" style="margin-top:8px;">
      Simulação com taxas médias de referência e IR simplificado (tabela regressiva para renda fixa, 15% sobre ganho de capital
      para FIIs/ações). Apenas educativo — não é recomendação de investimento.
    </p>`;
}
