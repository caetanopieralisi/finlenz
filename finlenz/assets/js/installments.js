// ===========================================================
// Parcelado ou à vista? Mostra os juros escondidos no parcelamento,
// quanto a mais você paga (em R$ e em horas) e o que compensa.
// ===========================================================
import { state, formatBRL } from "./state.js";
import { icon } from "./icons.js";
import {
  REF_MONTHLY_RATE, impliedMonthlyRate, annualRate, investAndPay,
  workHours, fmtPct, fmtNum,
} from "./finance.js";

const $ = (id) => document.getElementById(id);

export function initInstallments(){
  const inputs = ["instPrice", "instCount", "instPmt", "instTotal"].map($);
  const firstNow = $("instFirstNow");
  let lastEdited = "pmt"; // qual campo manda: valor da parcela ou total

  $("instPmt").addEventListener("input", () => { lastEdited = "pmt"; syncTotals(); calc(); });
  $("instTotal").addEventListener("input", () => { lastEdited = "total"; syncTotals(); calc(); });
  $("instCount").addEventListener("input", () => { syncTotals(); calc(); });
  $("instPrice").addEventListener("input", calc);
  firstNow.addEventListener("change", calc);

  // Atalhos: "sem juros" preenche parcela = preço / n
  $("instNoInterest").addEventListener("click", () => {
    const price = parseFloat($("instPrice").value), n = parseInt($("instCount").value);
    if (!price || !n) return;
    $("instPmt").value = (price / n).toFixed(2); lastEdited = "pmt"; syncTotals(); calc();
  });

  function syncTotals(){
    const n = parseInt($("instCount").value);
    if (!n) return;
    if (lastEdited === "pmt") {
      const p = parseFloat($("instPmt").value);
      $("instTotal").value = p ? (p * n).toFixed(2) : "";
    } else {
      const t = parseFloat($("instTotal").value);
      $("instPmt").value = t ? (t / n).toFixed(2) : "";
    }
  }

  // outras telas (Lente de compra) podem abrir esta já com o preço
  window.addEventListener("finlenz:installments", (e) => {
    $("instPrice").value = e.detail.price.toFixed(2);
    calc();
  });

  inputs.forEach(i => i && i.addEventListener("focus", () => i.select && i.select()));
  calc();
}

async function calc(){
  const box = $("instResult");
  const price = parseFloat($("instPrice").value);
  const n = parseInt($("instCount").value);
  const pmt = parseFloat($("instPmt").value);
  const firstNow = $("instFirstNow").checked;

  if (!price || !n || n < 2 || !pmt) {
    box.innerHTML = `<p class="muted">Preencha o preço à vista, o número de parcelas e o valor de cada parcela.</p>`;
    return;
  }

  const total = pmt * n;
  const extra = total - price;
  const rate = impliedMonthlyRate(price, pmt, n, firstNow);
  const yearly = annualRate(rate);
  const income = Number(state.profile && state.profile.monthly_income) || 0;
  const hours = extra > 0 && income ? workHours(extra, income) : null;
  const leftover = investAndPay(price, pmt, n, firstNow);

  let tone, headline, verdict;
  if (rate > REF_MONTHLY_RATE + 0.0005) {
    tone = "bad";
    headline = `${fmtPct(rate, 2)} <span>ao mês</span>`;
    verdict = `Se puder, <b>pague à vista</b>. Esses juros equivalem a <b>${fmtPct(yearly, 0)} ao ano</b>, bem mais do que o dinheiro renderia guardado (cerca de ${fmtPct(REF_MONTHLY_RATE)} ao mês).`;
  } else if (rate > 0.0005) {
    tone = "mid";
    headline = `${fmtPct(rate, 2)} <span>ao mês</span>`;
    verdict = `Quase empate: os juros são parecidos com o que o dinheiro renderia guardado. Decida pelo que pesa menos no seu mês.`;
  } else {
    tone = "good";
    headline = rate < -0.0005 ? `Desconto <span>no parcelado</span>` : `Sem juros`;
    verdict = leftover > 0.5
      ? `<b>Parcelar compensa</b>, desde que você deixe o valor à vista rendendo e pague as parcelas com ele: sobram cerca de <b>${formatBRL(leftover)}</b> no fim.`
      : `Parcelar sem juros não custa nada a mais. Só vale se as parcelas couberem no seu mês.`;
  }

  const monthShare = income ? pmt / income : null;
  const maxBar = Math.max(price, total);

  box.innerHTML = `
    <div class="inst-head inst-head--${tone}">
      <small>${rate > 0.0005 ? "Juros escondidos no parcelado" : "Resultado"}</small>
      <b>${headline}</b>
    </div>
    <div class="inst-bars">
      <div class="inst-bar">
        <span class="inst-bar__label">À vista</span>
        <span class="inst-bar__track"><i style="width:${(price / maxBar) * 100}%"></i></span>
        <b>${formatBRL(price)}</b>
      </div>
      <div class="inst-bar inst-bar--alt">
        <span class="inst-bar__label">${n}x ${formatBRL(pmt)}</span>
        <span class="inst-bar__track"><i style="width:${(total / maxBar) * 100}%"></i></span>
        <b>${formatBRL(total)}</b>
      </div>
    </div>
    <div class="hv-result__stats">
      <div><small>${extra >= 0 ? "Você paga a mais" : "Você economiza"}</small><b>${formatBRL(Math.abs(extra))}</b></div>
      <div><small>${hours ? "Em horas de trabalho" : "Parcela no seu mês"}</small><b>${hours ? `${fmtNum(hours.hours)} h` : monthShare ? fmtPct(monthShare, 0) + " da renda" : "—"}</b></div>
    </div>
    <p class="inst-verdict">${icon(tone === "bad" ? "info" : "check")}<span>${verdict}</span></p>
    ${monthShare && monthShare > 0.3 ? `<p class="inst-warn">${icon("info")}<span>Cada parcela leva ${fmtPct(monthShare, 0)} da sua renda por ${n} meses. Cuidado para não comprometer o mês.</span></p>` : ""}
    <p class="muted small">Referência de rendimento: CDB a 110% do CDI (~${fmtPct(REF_MONTHLY_RATE)} ao mês), a mesma do simulador de investimentos. Cálculo educativo.</p>`;
}
