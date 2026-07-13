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

function runSimulation(){
  const initial = parseFloat(document.getElementById("invInitial").value) || 0;
  const monthly = parseFloat(document.getElementById("invMonthly").value) || 0;
  const months = parseInt(document.getElementById("invMonths").value) || 12;

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

  const table = document.getElementById("invResultTable");
  const rows = presets.map(p => {
    const final = simulate(initial, monthly, months, p.monthlyRate).at(-1);
    return `<tr><td>${p.name}</td><td>${p.risk}</td><td>${formatBRL(final)}</td></tr>`;
  }).join("");
  table.innerHTML = `<table><thead><tr><th>Investimento</th><th>Risco</th><th>Valor final</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted small" style="margin-top:8px;">Simulação com taxas médias de referência, apenas educativa. Não é recomendação de investimento.</p>`;
}
