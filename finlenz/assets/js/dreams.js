import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { icon } from "./icons.js";
import { toast, escapeHtml } from "./ui.js";

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

  renderDreams();
}

async function renderDreams(){
  const { data } = await supabase.from("dreams").select("*").eq("user_id", state.user.id).order("created_at");
  dreamsCache = data || [];

  const list = document.getElementById("dreamsList");
  const picker = document.getElementById("dreamPickForCost");

  if (!dreamsCache.length) {
    list.innerHTML = `<div class="card list__empty">Nenhum sonho cadastrado ainda. Crie o primeiro logo abaixo.</div>`;
    picker.innerHTML = `<option value="">Cadastre um sonho primeiro</option>`;
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
}
