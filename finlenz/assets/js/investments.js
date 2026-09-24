import { formatBRL } from "./state.js";
import { icon } from "./icons.js";
import { chartOptions, areaGradient } from "./forecast.js";

let chart;
let presets = [];
let lastResults = [];
let selectedId = null;
let lastRun = null;

const RISK_COLOR = { "Baixo": "#30D158", "Médio": "#FFD60A", "Alto": "#FF453A" };

export async function initInvestments(){
  presets = await fetch("data/investment-presets.json").then(r => r.json());
  renderCards();
  document.getElementById("invCalcBtn").addEventListener("click", () => { selectedId = null; runSimulation(); });
  document.querySelectorAll('[data-goto="investments"]').forEach(el => el.addEventListener("click", () => {
    if (!chart) setTimeout(runSimulation, 30);
  }));
  document.getElementById("invResultTable").addEventListener("click", (e) => {
    const row = e.target.closest("[data-inv]");
    if (!row) return;
    selectedId = row.dataset.inv;
    renderChart();
    renderRanking();
  });
}

function riskColor(risk){
  const key = Object.keys(RISK_COLOR).find(k => String(risk).toLowerCase().startsWith(k.toLowerCase()));
  return RISK_COLOR[key] || "#8E8E93";
}

function renderCards(){
  const list = document.getElementById("invCardsList");
  if (!list) return;
  list.innerHTML = presets.map(p => `
    <details class="invest-card">
      <summary>
        <span class="risk-dot" style="background:${riskColor(p.risk)}" title="Risco ${p.risk}"></span>
        <b>${p.name}</b>
        ${icon("chevronRight", "chev")}
      </summary>
      <div class="invest-card__body">
        <p>${p.detail}</p>
        <div class="invest-card__meta">
          <span class="invest-card__tag">Risco ${String(p.risk).toLowerCase()}</span>
          <span class="invest-card__tag">Liquidez: ${p.liquidity}</span>
          <span class="invest-card__tag">${p.taxProfile === "isento" ? "Isento de IR" : "Tem IR na venda"}</span>
        </div>
      </div>
    </details>`).join("");
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
  lastRun = { initial, monthly, months, invested };

  // Resultados com bruto, IR estimado e líquido, do melhor líquido pro pior.
  lastResults = presets.map(p => {
    const series = simulate(initial, monthly, months, p.monthlyRate);
    const grossFinal = series[series.length - 1];
    const gain = grossFinal - invested;
    const tax = estimateTax(p.taxProfile, gain, months);
    const netFinal = grossFinal - tax;
    return { ...p, series, grossFinal, gain, tax, netFinal };
  }).sort((a, b) => b.netFinal - a.netFinal);

  if (!selectedId || !lastResults.some(r => r.id === selectedId)) selectedId = lastResults[0]?.id;
  renderChart();
  renderRanking();
}

function renderChart(){
  if (!lastRun) return;
  const { months } = lastRun;
  const style = getComputedStyle(document.documentElement);
  const lime = style.getPropertyValue("--primary").trim() || "#C6FF3D";
  const labels = Array.from({ length: months + 1 }, (_, i) => i === 0 ? "Hoje" : `Mês ${i}`);

  const selected = lastResults.find(r => r.id === selectedId) || lastResults[0];
  const baseline = lastResults.find(r => r.id === "poupanca");

  // Todos em cinza discreto; o selecionado em destaque; poupança como referência tracejada.
  const datasets = lastResults.map(r => {
    const isSel = r.id === selected.id;
    const isBase = baseline && r.id === baseline.id && !isSel;
    return {
      label: r.name,
      data: r.series.map(v => Math.round(v * 100) / 100),
      borderColor: isSel ? lime : isBase ? "rgba(235,235,245,.55)" : "rgba(235,235,245,.14)",
      borderWidth: isSel ? 2.5 : isBase ? 1.5 : 1.2,
      borderDash: isBase ? [4, 4] : [],
      backgroundColor: isSel ? (c) => areaGradient(c, lime) : "transparent",
      fill: isSel,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: isSel ? 5 : 0,
      pointHoverBackgroundColor: lime,
      pointHoverBorderColor: "#1C1C1E",
      pointHoverBorderWidth: 2,
      order: isSel ? 0 : isBase ? 1 : 2,
    };
  });

  const opts = chartOptions();
  opts.scales.x.ticks.maxTicksLimit = window.innerWidth < 600 ? 4 : 7;
  opts.plugins.tooltip.filter = (item) => item.dataset.label === selected.name || (baseline && item.dataset.label === baseline.name);

  const ctx = document.getElementById("investChart");
  chart?.destroy();
  chart = new Chart(ctx, { type: "line", data: { labels, datasets }, options: opts });

  document.getElementById("invHeadLabel").textContent = selected.id === lastResults[0].id
    ? `Melhor líquido · ${selected.name}` : selected.name;
  document.getElementById("invHeadline").textContent = formatBRL(selected.netFinal);
}

function renderRanking(){
  const table = document.getElementById("invResultTable");
  if (!lastRun) return;
  const bestId = lastResults[0]?.id;
  table.innerHTML = `
    <p class="invest-meta">Total investido no período: <strong class="num">${formatBRL(lastRun.invested)}</strong>. Toque em uma opção para vê-la no gráfico.</p>
    <div class="inv-rank" role="list">
      ${lastResults.map((r, i) => `
        <button class="inv-row ${r.id === selectedId ? "is-selected" : ""}" data-inv="${r.id}" role="listitem" aria-pressed="${r.id === selectedId}">
          <span class="inv-row__rank">${i + 1}</span>
          <span class="inv-row__name"><b>${r.name}${r.id === bestId ? ' <span class="badge badge-income">melhor</span>' : ""}</b><small>Risco ${String(r.risk).toLowerCase()} · ${r.tax > 0 ? "IR " + formatBRL(r.tax) : "isento de IR"}</small></span>
          <span class="inv-row__val"><b>${formatBRL(r.netFinal)}</b><small>+${formatBRL(r.gain)} bruto</small></span>
        </button>`).join("")}
    </div>
    <p class="invest-disclaimer">
      Simulação com taxas médias de referência e IR simplificado (tabela regressiva para renda fixa, 15% sobre ganho de capital
      para FIIs/ações). Apenas educativo, não é recomendação de investimento.
    </p>`;
}
