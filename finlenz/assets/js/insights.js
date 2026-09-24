// ===========================================================
// Insights do Fin: padrões encontrados nos lançamentos da pessoa,
// calculados no próprio aparelho (sem IA, sem custo, instantâneo).
// ===========================================================
import { formatBRL } from "./state.js";
import { icon } from "./icons.js";
import { escapeHtml } from "./ui.js";
import { get } from "./store.js";
import { mainDream, monthsToGoal, monthLabelFromNow, fmtNum } from "./finance.js";

const VARIABLE = ["Alimentação", "Lazer", "Transporte", "Outros", "Saúde"];
const WEEKDAYS = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"];
const DELIVERY = /ifood|rappi|delivery|uber ?eats|z[eé] delivery|lanche/i;

function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function monthKey(s){ return s.slice(0, 7); }

export function buildInsights(txs, dreams){
  const out = [];
  const now = new Date();
  const curMonth = ymd(now).slice(0, 7);
  const expenses = txs.filter(t => t.type === "expense");
  const dream = mainDream(dreams);
  const savedPerMonth = (dreams || []).reduce((s, d) => s + (Number(d.monthly_contribution) || 0), 0);

  // 1) Categoria acima da média dos meses anteriores
  const byMonthCat = {};
  expenses.forEach(t => {
    const k = monthKey(t.date);
    (byMonthCat[k] = byMonthCat[k] || {})[t.category] = (byMonthCat[k][t.category] || 0) + Number(t.amount);
  });
  const pastMonths = Object.keys(byMonthCat).filter(k => k < curMonth).sort().slice(-3);
  if (pastMonths.length && byMonthCat[curMonth]) {
    let best = null;
    VARIABLE.forEach(cat => {
      const cur = byMonthCat[curMonth][cat] || 0;
      const avg = pastMonths.reduce((s, k) => s + ((byMonthCat[k] || {})[cat] || 0), 0) / pastMonths.length;
      if (avg > 0 && cur > avg * 1.3 && cur - avg > 40) {
        const ratio = cur / avg;
        if (!best || ratio > best.ratio) best = { cat, cur, avg, ratio };
      }
    });
    if (best) {
      out.push({
        icon: "trend", tint: "orange", weight: 3,
        title: `${best.cat} já está ${best.ratio >= 2 ? fmtNum(best.ratio) + "x" : "+" + Math.round((best.ratio - 1) * 100) + "%"} acima da sua média`,
        text: `Este mês: ${formatBRL(best.cur)}. Nos últimos meses, a média foi ${formatBRL(best.avg)}.`,
      });
    }
  }

  // 2) Dia da semana em que mais sai dinheiro (gastos variáveis, últimos 90 dias)
  const since = new Date(now); since.setDate(since.getDate() - 90);
  const recentVar = expenses.filter(t => VARIABLE.includes(t.category) && t.date >= ymd(since));
  if (recentVar.length >= 5) {
    const byDay = new Array(7).fill(0);
    recentVar.forEach(t => { byDay[new Date(t.date + "T00:00:00").getDay()] += Number(t.amount); });
    const total = byDay.reduce((a, b) => a + b, 0);
    const top = byDay.indexOf(Math.max(...byDay));
    const share = byDay[top] / total;
    const perMonth = byDay[top] / 3;
    if (share >= 0.25) {
      const cmp = savedPerMonth > 0 && perMonth / savedPerMonth >= 0.4
        ? ` Isso é ${perMonth >= savedPerMonth ? "mais do que" : "quase " + fmtNum(perMonth / savedPerMonth) + "x"} o que você guarda por mês.`
        : "";
      out.push({
        icon: "calendar", tint: "blue", weight: 2,
        title: `Às ${WEEKDAYS[top]} vai ${Math.round(share * 100)}% dos seus gastos do dia a dia`,
        text: `Em média ${formatBRL(perMonth)} por mês.${cmp}`,
      });
    }
  }

  // 3) Delivery no mês e quanto isso aproxima o sonho
  const deliveries = expenses.filter(t => monthKey(t.date) === curMonth && DELIVERY.test(t.description || ""));
  if (deliveries.length >= 1) {
    const sum = deliveries.reduce((s, t) => s + Number(t.amount), 0);
    const days = dream ? Math.round((sum / 2 / Number(dream.monthly_contribution)) * 30) : 0;
    out.push({
      icon: "food", tint: "pink", weight: 1,
      title: `${deliveries.length} pedido${deliveries.length > 1 ? "s" : ""} de delivery este mês: ${formatBRL(sum)}`,
      text: dream && days >= 1
        ? `Cortando metade, “${escapeHtml(dream.name)}” chega ${days} dia${days > 1 ? "s" : ""} antes.`
        : `Cozinhar em casa algumas vezes já faz diferença no fim do mês.`,
    });
  }

  // 4) Sonho mais perto de virar realidade
  const next = (dreams || [])
    .map(d => ({ d, m: monthsToGoal(d) }))
    .filter(x => x.m > 0 && x.m !== Infinity)
    .sort((a, b) => a.m - b.m)[0];
  if (next) {
    out.push({
      icon: "target", tint: "green", weight: 0,
      title: `“${escapeHtml(next.d.name)}” está a ${next.m} ${next.m === 1 ? "mês" : "meses"} de distância`,
      text: `No ritmo atual, fica pronto em ${monthLabelFromNow(next.m)}. Guardando um pouco mais, chega antes.`,
      goto: "dreams",
    });
  }

  if (!out.length) {
    out.push({
      icon: "bulb", tint: "indigo", weight: 0,
      title: "Registre seus gastos por alguns dias",
      text: "Com mais lançamentos, eu encontro padrões nos seus hábitos e te aviso aqui.",
      goto: "transactions",
    });
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

export async function renderInsights(){
  const el = document.getElementById("homeInsights");
  if (!el) return;
  const [txs, dreams] = await Promise.all([get("transactions"), get("dreams")]);
  const items = buildInsights(txs || [], dreams || []);
  el.innerHTML = items.map(it => `
    <li><${it.goto ? `button class="insight insight--link" data-goto="${it.goto}"` : `div class="insight"`}>
      <span class="tile tile--${it.tint}">${icon(it.icon)}</span>
      <span class="insight__body"><b>${it.title}</b><small>${it.text}</small></span>
      ${it.goto ? icon("chevronRight", "chev") : ""}
    </${it.goto ? "button" : "div"}></li>`).join("");
}
