import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { loadAllTransactions } from "./transactions.js";
import { icon } from "./icons.js";

function hexToRgba(hex, alpha){
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shortMonth(d){
  const m = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function monthLabel(key){
  const [y, m] = key.split("-");
  return shortMonth(new Date(Number(y), Number(m) - 1, 1));
}

let chart;
let saveTimer;

export function areaGradient(c, color){
  const { chart: ch } = c;
  const area = ch.chartArea;
  if (!area) return hexToRgba(color, 0.12);
  const g = ch.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexToRgba(color, 0.28));
  g.addColorStop(1, hexToRgba(color, 0));
  return g;
}

function compactBRL(v){
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e6) return `${sign}R$ ${(a / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (a >= 1e3) return `${sign}R$ ${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(".", ",")} mil`;
  return `${sign}R$ ${Math.round(a)}`;
}

export function chartOptions(extra = {}){
  const font = { family: getComputedStyle(document.body).fontFamily, size: 11 };
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 6, right: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(44,44,46,.96)",
        borderColor: "rgba(255,255,255,.08)", borderWidth: 1,
        titleColor: "rgba(235,235,245,.62)", bodyColor: "#F5F5F7",
        titleFont: { ...font, size: 12, weight: "600" }, bodyFont: { ...font, size: 13, weight: "600" },
        padding: 10, cornerRadius: 10, displayColors: false,
        filter: (item) => item.raw !== null,
        callbacks: { label: (item) => `${item.dataset.label}: ${formatBRL(item.raw)}` },
      },
      ...(extra.plugins || {}),
    },
    scales: {
      y: {
        border: { display: false },
        grid: { color: "rgba(255,255,255,.06)", drawTicks: false },
        ticks: { color: "rgba(235,235,245,.4)", font, padding: 8, maxTicksLimit: 5, callback: v => compactBRL(v) },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "rgba(235,235,245,.4)", font, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
      },
    },
  };
}

export async function initForecast(){
  const input = document.getElementById("fcSavings");
  input.value = state.profile.current_savings ?? 0;

  input.addEventListener("input", () => {
    renderForecast();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const value = parseFloat(input.value) || 0;
      state.profile.current_savings = value;
      await supabase.from("profiles").update({ current_savings: value }).eq("id", state.user.id);
    }, 700);
  });

  document.querySelectorAll('[data-goto="forecast"]').forEach(el => el.addEventListener("click", renderForecast));
  await renderForecast();
}

async function renderForecast(){
  const rows = await loadAllTransactions();
  const note = document.getElementById("forecastNote");
  const baseline = parseFloat(document.getElementById("fcSavings").value) || 0;

  // agrupa por mês (yyyy-mm)
  const monthMap = {};
  rows.forEach(r => {
    const key = r.date.slice(0, 7);
    monthMap[key] ??= { income: 0, expense: 0 };
    monthMap[key][r.type] += Number(r.amount);
  });
  const monthKeys = Object.keys(monthMap).sort();
  const monthCount = monthKeys.length || 1;
  const totalIncome = monthKeys.reduce((s, k) => s + monthMap[k].income, 0);
  const totalExpense = monthKeys.reduce((s, k) => s + monthMap[k].expense, 0);
  const avgIncome = totalIncome / monthCount;
  const avgExpense = totalExpense / monthCount;
  const avgNet = avgIncome - avgExpense;

  document.getElementById("fcAvgIncome").textContent = formatBRL(avgIncome);
  document.getElementById("fcAvgExpense").textContent = formatBRL(avgExpense);
  const netEl = document.getElementById("fcAvgNet");
  netEl.textContent = formatBRL(avgNet);
  netEl.className = (avgNet >= 0 ? "text-income" : "text-expense") + " num";

  note.textContent = monthKeys.length >= 2
    ? "Estimativa baseada na média mensal dos seus lançamentos registrados."
    : "Registre lançamentos em pelo menos 2 meses diferentes pra uma previsão mais precisa. Por enquanto, é só uma estimativa simples.";

  // histórico: saldo acumulado de cada mês, terminando no valor que você
  // informou como "guardado hoje" (o histórico é reconstruído pra trás a
  // partir desse ponto, mês a mês).
  const histLabels = monthKeys.map(monthLabel);
  const histNets = monthKeys.map(k => monthMap[k].income - monthMap[k].expense);
  const histCum = new Array(histNets.length);
  let running = baseline;
  for (let i = histNets.length - 1; i >= 0; i--) {
    histCum[i] = running;
    running -= histNets[i];
  }

  // projeção: 6 meses à frente, a partir do saldo atual, no ritmo médio observado
  const futureLabels = [];
  const futureCum = [];
  const today = new Date();
  let proj = baseline;
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    futureLabels.push(shortMonth(d));
    proj += avgNet;
    futureCum.push(Math.round(proj));
  }

  const labels = [...histLabels, "Hoje", ...futureLabels];
  const dataHist = [...histCum, baseline, ...new Array(futureLabels.length).fill(null)];
  const dataProj = [...new Array(histLabels.length).fill(null), baseline, ...futureCum];

  const style = getComputedStyle(document.documentElement);
  const lime = style.getPropertyValue("--primary").trim() || "#C6FF3D";

  const headline = document.getElementById("fcHeadline");
  if (headline) {
    headline.textContent = formatBRL(futureCum[futureCum.length - 1]);
    headline.style.color = avgNet >= 0 ? "" : "#FF6961";
  }

  const ctx = document.getElementById("forecastChart");
  chart?.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Histórico",
          data: dataHist,
          borderColor: lime,
          borderWidth: 2.5,
          backgroundColor: (c) => areaGradient(c, lime),
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: lime,
          pointHoverBorderColor: "#1C1C1E",
          pointHoverBorderWidth: 2,
          spanGaps: false,
        },
        {
          label: "Projeção",
          data: dataProj,
          borderColor: hexToRgba(lime, 0.7),
          borderWidth: 2,
          borderDash: [5, 5],
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: lime,
          pointHoverBorderColor: "#1C1C1E",
          pointHoverBorderWidth: 2,
          spanGaps: true,
        },
      ],
    },
    options: chartOptions(),
  });

  renderInsight(baseline, avgNet, monthKeys.length);
}

function renderInsight(baseline, avgNet, monthsWithData){
  const box = document.getElementById("forecastInsight");
  if (!box) return;

  if (monthsWithData < 2) {
    box.hidden = true;
    return;
  }
  box.hidden = false;

  if (avgNet >= 0) {
    const in6 = baseline + avgNet * 6;
    box.className = "forecast-insight is-good";
    box.innerHTML = `${icon("trend")}<span>No ritmo atual, em <strong>6 meses</strong> você deve ter aproximadamente <strong>${formatBRL(in6)}</strong> guardado.</span>`;
  } else if (baseline <= 0) {
    box.className = "forecast-insight is-bad";
    box.innerHTML = `${icon("info")}<span>Seus gastos estão maiores que suas receitas e você já está sem margem. Vale rever os maiores gastos antes do próximo mês.</span>`;
  } else {
    const monthsToZero = baseline / Math.abs(avgNet);
    box.className = "forecast-insight is-bad";
    box.innerHTML = icon("info") + (monthsToZero <= 6
      ? `<span>No ritmo atual, seu saldo deve <strong>zerar em ${Math.max(1, Math.round(monthsToZero))} ${monthsToZero < 2 ? "mês" : "meses"}</strong>. Vale ajustar os gastos antes disso acontecer.</span>`
      : `<span>Você está gastando mais do que ganha por mês, mas sua reserva atual ainda te dá fôlego por um tempo. Vale ficar de olho antes que isso vire hábito.</span>`);
  }
}
