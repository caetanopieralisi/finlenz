import { formatBRL } from "./state.js";
import { loadAllTransactions } from "./transactions.js";

function hexToRgba(hex, alpha){
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let chart;

export async function initForecast(){
  // recalcula sempre que a tela de previsão é aberta (home, grid de ferramentas etc.)
  document.querySelectorAll('[data-goto="forecast"]').forEach(el => el.addEventListener("click", renderForecast));
  renderForecast();
}

async function renderForecast(){
  const rows = await loadAllTransactions();
  const note = document.getElementById("forecastNote");

  if (rows.length < 3) {
    note.textContent = "Registre mais lançamentos pra uma previsão mais precisa. Por enquanto, usamos uma estimativa simples.";
  } else {
    note.textContent = "Estimativa baseada na média mensal de receitas e despesas registradas.";
  }

  const monthsMap = {};
  rows.forEach(r => {
    const key = r.date.slice(0, 7);
    monthsMap[key] ??= { income: 0, expense: 0 };
    monthsMap[key][r.type] += Number(r.amount);
  });
  const monthKeys = Object.keys(monthsMap).sort();
  const monthCount = Math.max(monthKeys.length, 1);
  const totalIncome = monthKeys.reduce((s, k) => s + monthsMap[k].income, 0);
  const totalExpense = monthKeys.reduce((s, k) => s + monthsMap[k].expense, 0);
  const avgIncome = totalIncome / monthCount || 0;
  const avgExpense = totalExpense / monthCount || 0;
  const monthlyDelta = avgIncome - avgExpense;

  let balance = monthKeys.length ? (monthsMap[monthKeys.at(-1)].income - monthsMap[monthKeys.at(-1)].expense) : 0;
  const labels = [];
  const data = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    labels.push(d.toLocaleDateString("pt-BR", { month: "short" }));
    balance += i === 0 ? 0 : monthlyDelta;
    data.push(Math.round(balance));
  }

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
      datasets: [{
        label: "Saldo projetado",
        data,
        borderColor: lime,
        backgroundColor: hexToRgba(lime, 0.12),
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: lime,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: textSoft, callback: v => formatBRL(v) }, grid: { color: border } },
        x: { ticks: { color: textSoft }, grid: { color: border } },
      },
    },
  });
}
