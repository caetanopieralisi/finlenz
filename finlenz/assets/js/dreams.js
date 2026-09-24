import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { icon } from "./icons.js";
import { toast, escapeHtml } from "./ui.js";
import { get, refresh } from "./store.js";
import { monthsToGoal, monthLabelFromNow } from "./finance.js";

let dreamsCache = [];

function etaText(d){
  const missing = Math.max(0, Number(d.target_amount) - Number(d.saved_amount));
  if (missing <= 0) return "Meta alcançada";
  if (!Number(d.monthly_contribution)) return "Defina quanto guardar por mês";
  const months = Math.ceil(missing / Number(d.monthly_contribution));
  const when = new Date(); when.setMonth(when.getMonth() + months);
  const label = when.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  return `${months} ${months === 1 ? "mês" : "meses"} · previsão ${label}`;
}

export function initDreams(){
  document.getElementById("dreamAddBtn").addEventListener("click", async () => {
    const payload = {
      user_id: state.user.id,
      name: document.getElementById("dreamName").value.trim(),
      target_amount: parseFloat(document.getElementById("dreamTarget").value),
      saved_amount: parseFloat(document.getElementById("dreamSaved").value) || 0,
      monthly_contribution: parseFloat(document.getElementById("dreamMonthly").value) || 0,
    };
    if (!payload.name || !payload.target_amount) { toast("Preencha nome e valor do sonho.", "error"); return; }

    const { error } = await supabase.from("dreams").insert(payload);
    if (error) { toast("Não deu pra salvar o sonho.", "error"); return; }
    refresh("dreams");

    document.getElementById("dreamName").value = "";
    document.getElementById("dreamTarget").value = "";
    document.getElementById("dreamSaved").value = "0";
    document.getElementById("dreamMonthly").value = "";
    toast("Sonho salvo");
    renderDreams();
  });

  document.getElementById("dreamCostBtn").addEventListener("click", () => {
    const id = document.getElementById("dreamPickForCost").value;
    const price = parseFloat(document.getElementById("dreamCostPrice").value);
    const box = document.getElementById("dreamCostResult");
    const dream = dreamsCache.find(d => String(d.id) === id);

    if (!dream || !price) {
      box.hidden = false;
      box.innerHTML = "Escolha um sonho e informe o valor da compra.";
      return;
    }
    if (!dream.monthly_contribution) {
      box.hidden = false;
      box.innerHTML = "Cadastre quanto você guarda por mês nesse sonho pra calcular o atraso.";
      return;
    }

    const delayMonths = price / dream.monthly_contribution;
    const delayDays = Math.round(delayMonths * 30);
    const name = escapeHtml(dream.name);
    box.hidden = false;
    box.innerHTML = delayDays < 1
      ? `Esse gasto praticamente não atrasa <strong>${name}</strong>.`
      : `<div class="hv-result__big" style="font-size:44px;color:${delayDays > 30 ? "#FF6961" : "var(--warning)"}">+${delayDays}<span>dias</span></div>
         <p class="hv-result__sub" style="margin-bottom:0">Gastar ${formatBRL(price)} agora atrasa <strong>${name}</strong> em cerca de ${delayMonths.toFixed(1).replace(".", ",")} ${delayMonths >= 2 ? "meses" : "mês"} de economia.</p>`;
  });

  initWhatIf();
  renderDreams();
}

// ---------- E se eu guardasse mais? ----------
function initWhatIf(){
  const pick = document.getElementById("wiDream");
  const range = document.getElementById("wiRange");
  pick.addEventListener("change", () => resetWhatIf());
  range.addEventListener("input", renderWhatIf);
  document.getElementById("wiChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const d = currentDream(); if (!d) return;
    const v = Number(d.monthly_contribution || 0) + Number(b.dataset.add);
    if (v > Number(range.max)) range.max = String(Math.ceil(v / 50) * 50);
    range.value = String(v);
    renderWhatIf();
  });
  document.getElementById("wiApply").addEventListener("click", async () => {
    const d = currentDream(); if (!d) return;
    const v = Number(range.value);
    const btn = document.getElementById("wiApply");
    btn.disabled = true;
    const { error } = await supabase.from("dreams").update({ monthly_contribution: v }).eq("id", d.id);
    btn.disabled = false;
    if (error) { toast("Não deu pra salvar.", "error"); return; }
    refresh("dreams");
    toast(`Agora você guarda ${formatBRL(v)}/mês para ${d.name}`);
    await renderDreams();
    resetWhatIf();
  });
}

function currentDream(){
  const id = document.getElementById("wiDream").value;
  return dreamsCache.find(d => String(d.id) === id);
}

function resetWhatIf(){
  const d = currentDream();
  const range = document.getElementById("wiRange");
  if (!d) return;
  const cur = Number(d.monthly_contribution) || 0;
  const missing = Math.max(0, Number(d.target_amount) - Number(d.saved_amount));
  range.min = "0";
  range.max = String(Math.max(500, Math.ceil(Math.min(missing, Math.max(cur * 3, 300)) / 50) * 50));
  range.step = "10";
  range.value = String(cur);
  renderWhatIf();
}

function renderWhatIf(){
  const d = currentDream();
  const out = document.getElementById("wiResult");
  const range = document.getElementById("wiRange");
  if (!d) { out.innerHTML = ""; return; }
  const v = Number(range.value);
  const cur = Number(d.monthly_contribution) || 0;
  const pct = ((v - Number(range.min)) / (Number(range.max) - Number(range.min))) * 100;
  range.style.setProperty("--fill", pct + "%");
  document.getElementById("wiValue").textContent = formatBRL(v);

  const now = monthsToGoal(d, cur);
  const next = monthsToGoal(d, v);
  let line;
  if (next === 0) line = `<b>Meta já alcançada!</b>`;
  else if (next === Infinity) line = `Sem guardar nada por mês, esse sonho não sai do lugar.`;
  else {
    const diff = now === Infinity ? null : now - next;
    line = `<b>${escapeHtml(d.name)}</b> fica pronto em <b>${next} ${next === 1 ? "mês" : "meses"}</b> (${monthLabelFromNow(next)})` +
      (diff > 0 ? `, <span class="wi-good">${diff} ${diff === 1 ? "mês" : "meses"} antes</span>.` :
       diff < 0 ? `, <span class="wi-bad">${-diff} ${diff === -1 ? "mês" : "meses"} depois</span>.` : ".");
  }
  out.innerHTML = `<p>${line}</p>`;
  document.getElementById("wiApply").hidden = v === cur || next === 0;
}

async function renderDreams(){
  dreamsCache = await get("dreams");

  const list = document.getElementById("dreamsList");
  const picker = document.getElementById("dreamPickForCost");

  if (!dreamsCache.length) {
    list.innerHTML = `<div class="card list__empty">Nenhum sonho cadastrado ainda. Crie o primeiro logo abaixo.</div>`;
    picker.innerHTML = `<option value="">Cadastre um sonho primeiro</option>`;
    document.getElementById("wiCard").hidden = true;
    return;
  }

  list.innerHTML = dreamsCache.map(d => {
    const pct = Math.min(100, Math.round((d.saved_amount / d.target_amount) * 100)) || 0;
    return `
      <div class="dream-item">
        <div class="dream-item__ring">
          <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" class="ring__track"/><circle cx="22" cy="22" r="18" class="ring__fill" pathLength="100" style="--p:${pct}"/></svg>
          <span>${pct}%</span>
        </div>
        <div class="dream-item__body">
          <div class="dream-item__head">${escapeHtml(d.name)}</div>
          <small>${formatBRL(d.saved_amount)} de ${formatBRL(d.target_amount)}</small>
          <small class="dream-item__eta">${icon("clock")}${etaText(d)}</small>
        </div>
      </div>`;
  }).join("");

  picker.innerHTML = dreamsCache.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");

  const wi = document.getElementById("wiDream");
  const keep = wi.value;
  const open = dreamsCache.filter(d => Number(d.saved_amount) < Number(d.target_amount));
  wi.innerHTML = open.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
  document.getElementById("wiCard").hidden = !open.length;
  if (keep && open.some(d => String(d.id) === keep)) wi.value = keep;
  resetWhatIf();
}
