import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";

let dreamsCache = [];

export function initDreams(){
  document.getElementById("dreamAddBtn").addEventListener("click", async () => {
    const payload = {
      user_id: state.user.id,
      name: document.getElementById("dreamName").value.trim(),
      target_amount: parseFloat(document.getElementById("dreamTarget").value),
      saved_amount: parseFloat(document.getElementById("dreamSaved").value) || 0,
      monthly_contribution: parseFloat(document.getElementById("dreamMonthly").value) || 0,
    };
    if (!payload.name || !payload.target_amount) { alert("Preencha nome e valor do sonho."); return; }

    const { error } = await supabase.from("dreams").insert(payload);
    if (error) { alert("Não deu pra salvar o sonho."); return; }

    document.getElementById("dreamName").value = "";
    document.getElementById("dreamTarget").value = "";
    document.getElementById("dreamSaved").value = "0";
    document.getElementById("dreamMonthly").value = "";
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
    box.hidden = false;
    box.innerHTML = delayDays < 1
      ? `Esse gasto praticamente não atrasa <strong>${dream.name}</strong>!`
      : `Gastar ${formatBRL(price)} agora vai atrasar <strong>${dream.name}</strong> em aproximadamente
         <strong>${delayDays} dias</strong> (${delayMonths.toFixed(1)} meses de economia).`;
  });

  renderDreams();
}

async function renderDreams(){
  const { data } = await supabase.from("dreams").select("*").eq("user_id", state.user.id).order("created_at");
  dreamsCache = data || [];

  const list = document.getElementById("dreamsList");
  const picker = document.getElementById("dreamPickForCost");

  if (!dreamsCache.length) {
    list.innerHTML = `<p class="muted">Nenhum sonho cadastrado ainda.</p>`;
    picker.innerHTML = `<option value="">Cadastre um sonho primeiro</option>`;
    return;
  }

  list.innerHTML = dreamsCache.map(d => {
    const pct = Math.min(100, Math.round((d.saved_amount / d.target_amount) * 100));
    return `
      <div class="dream-item">
        <div class="dream-item__head"><span>${d.name}</span><span>${pct}%</span></div>
        <div class="dream-bar"><div class="dream-bar__fill" style="width:${pct}%"></div></div>
        <small>${formatBRL(d.saved_amount)} de ${formatBRL(d.target_amount)}</small>
      </div>`;
  }).join("");

  picker.innerHTML = dreamsCache.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
}
