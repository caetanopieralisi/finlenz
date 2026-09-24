// ===========================================================
// Lente de compra (tela Início): digite um preço e veja, de uma vez,
// quanto ele custa em horas, no seu sonho e no seu mês.
// ===========================================================
import { state, formatBRL } from "./state.js";
import { icon } from "./icons.js";
import { escapeHtml } from "./ui.js";
import { get } from "./store.js";
import { loadTransactionsSummary } from "./transactions.js";
import { workHours, hoursLabel, dreamDelayDays, mainDream, fmtNum, fmtPct } from "./finance.js";

const $ = (id) => document.getElementById(id);

export function initLens(){
  const input = $("lensPrice");
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  $("lensForm").addEventListener("submit", (e) => { e.preventDefault(); input.blur(); render(); });

  // atalhos para as ferramentas detalhadas, já com o valor preenchido
  $("lensResult").addEventListener("click", (e) => {
    const price = parseFloat(input.value);
    const btn = e.target.closest("[data-lens]");
    if (!btn || !price) return;
    if (btn.dataset.lens === "installments") {
      window.dispatchEvent(new CustomEvent("finlenz:installments", { detail: { price } }));
    }
    if (btn.dataset.lens === "hourvalue") {
      const p = $("hvPrice"); p.value = price; p.dispatchEvent(new Event("input"));
    }
    if (btn.dataset.lens === "dreams") {
      $("dreamCostPrice").value = price; setTimeout(() => $("dreamCostBtn").click(), 50);
    }
  });
}

async function render(){
  const box = $("lensResult");
  const price = parseFloat($("lensPrice").value);
  if (!price || price <= 0) { box.hidden = true; box.innerHTML = ""; return; }

  const [dreams, summary] = await Promise.all([get("dreams"), loadTransactionsSummary()]);
  const income = Number(state.profile && state.profile.monthly_income) || summary.income || 0;
  const h = workHours(price, income);
  const dream = mainDream(dreams);
  const delay = dream ? dreamDelayDays(price, dream) : null;
  const left = summary.income - summary.expense;

  const hoursTile = h
    ? `<b class="${h.hours > 10 ? "is-bad" : h.hours > 2 ? "is-mid" : "is-ok"}">${fmtNum(h.hours)} h</b><small>${hoursLabel(h)}</small>`
    : `<b>—</b><small>Informe sua renda no Perfil</small>`;
  const dreamTile = dream && delay !== null
    ? `<b class="${delay > 30 ? "is-bad" : delay > 7 ? "is-mid" : "is-ok"}">+${delay} dias</b><small>no sonho “${escapeHtml(dream.name)}”</small>`
    : `<b>—</b><small>Cadastre um sonho com aporte mensal</small>`;
  const monthTile = left > 0
    ? `<b class="${price > left ? "is-bad" : price > left * 0.5 ? "is-mid" : "is-ok"}">${fmtPct(price / left, 0)}</b><small>do que sobrou este mês (${formatBRL(left)})</small>`
    : `<b class="is-bad">Mês no vermelho</b><small>Você já gastou mais do que entrou</small>`;

  let verdict;
  if ((h && h.hours > 10) || (delay && delay > 30) || price > left) verdict = "Pense duas vezes: é uma compra pesada para o seu momento.";
  else if ((h && h.hours > 2) || (delay && delay > 7)) verdict = "Cabe, mas vale perguntar: eu quero mais isso ou o meu sonho?";
  else verdict = "Compra leve para o seu orçamento.";

  box.hidden = false;
  box.innerHTML = `
    <div class="lens-tiles">
      <div class="lens-tile">${icon("clock")}${hoursTile}</div>
      <div class="lens-tile">${icon("target")}${dreamTile}</div>
      <div class="lens-tile">${icon("wallet")}${monthTile}</div>
    </div>
    <p class="lens-verdict">${verdict}</p>
    <div class="lens-actions">
      <button type="button" class="chip" data-lens="installments" data-goto="installments">${icon("card")}E se parcelar?</button>
      <button type="button" class="chip" data-lens="dreams" data-goto="dreams">${icon("target")}Ver no sonho</button>
      <button type="button" class="chip" data-lens="hourvalue" data-goto="hourvalue">${icon("clock")}Detalhar horas</button>
    </div>`;
}
