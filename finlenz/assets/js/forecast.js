import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { loadAllTransactions } from "./transactions.js";

function hexToRgba(hex, alpha){
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function monthLabel(key){
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

let chart;
let saveTimer;

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
  netEl.className = avgNet >= 0 ? "text-income" : "text-expense";

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
    futureLabels.push(d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }));
    proj += avgNet;
    futureCum.push(Math.round(proj));
  }

  const labels = [...histLabels, "hoje", ...futureLabels];
  const dataHist = [...histCum, baseline, ...new Array(futureLabels.length).fill(null)];
  const dataProj = [...new Array(histLabels.length).fill(null), baseline, ...futureCum];

  const style = getComputedStyle(document.documentElement);
  const lime = style.getPropertyValue("--primary").trim() || "#C6FF3D";
  const textSoft = style.getPropertyValue("--text-soft").trim() || "#8FA391";
  const border = style.getPropertyValue("--border").trim() || "#232B23";

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
          backgroundColor: hexToRgba(lime, 0.12),
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          spanGaps: false,
        },
        {
          label: "Projeção",
          data: dataProj,
          borderColor: lime,
          borderDash: [6, 5],
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
          spanGaps: true,
        },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { color: textSoft, boxWidth: 10, font: { size: 10 } } } },
      scales: {
        y: { ticks: { color: textSoft, callback: v => formatBRL(v) }, grid: { color: border } },
        x: { ticks: { color: textSoft }, grid: { color: border } },
      },
    },
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
    box.innerHTML = `No ritmo atual, em <strong>6 meses</strong> você deve ter aproximadamente <strong>${formatBRL(in6)}</strong> guardado.`;
  } else if (baseline <= 0) {
    box.className = "forecast-insight is-bad";
    box.innerHTML = `Seus gastos estão maiores que suas receitas e você já está sem margem. Vale rever os maiores gastos antes do próximo mês.`;
  } else {
    const monthsToZero = baseline / Math.abs(avgNet);
    box.className = "forecast-insight is-bad";
    box.innerHTML = monthsToZero <= 6
      ? `No ritmo atual, seu saldo deve <strong>zerar em ${Math.max(1, Math.round(monthsToZero))} ${monthsToZero < 2 ? "mês" : "meses"}</strong>. Vale ajustar os gastos antes disso acontecer.`
      : `Você está gastando mais do que ganha por mês, mas sua reserva atual ainda te dá fôlego por um tempo. Vale ficar de olho antes que isso vire hábito.`;
  }
}
