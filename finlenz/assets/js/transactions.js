import { supabase } from "./supabaseClient.js";
import { state, formatBRL, formatDate } from "./state.js";

let refreshHome = () => {};
// Import dinâmico pra evitar dependência circular com app.js
import("./app.js").then(m => { refreshHome = m.refreshHomeSummary; });

export function initTransactions(){
  const form = document.getElementById("txForm");
  const dateInput = document.getElementById("txDate");
  dateInput.value = new Date().toISOString().slice(0, 10);

  document.querySelectorAll(".segmented__opt").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".segmented__opt").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.getElementById("txType").value = btn.dataset.type;
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      user_id: state.user.id,
      type: document.getElementById("txType").value,
      description: document.getElementById("txDesc").value.trim(),
      amount: parseFloat(document.getElementById("txAmount").value),
      category: document.getElementById("txCategory").value,
      date: document.getElementById("txDate").value,
    };
    const { error } = await supabase.from("transactions").insert(payload);
    if (error) { alert("Não deu pra salvar o lançamento."); return; }
    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    document.getElementById("txType").value = "expense";
    document.querySelectorAll(".segmented__opt").forEach(b => b.classList.toggle("is-active", b.dataset.type === "expense"));
    renderTxList();
    refreshHome();
  });

  renderTxList();
}

async function renderTxList(){
  const list = document.getElementById("txList");
  const { data } = await supabase
    .from("transactions").select("*")
    .eq("user_id", state.user.id)
    .order("date", { ascending: false })
    .limit(100);

  if (!data || !data.length) {
    list.innerHTML = `<li class="muted">Nenhum lançamento ainda.</li>`;
    return;
  }
  list.innerHTML = data.map(tx => `
    <li class="tx-item">
      <div class="tx-item__left"><span>${tx.description}</span><small>${tx.category} · ${formatDate(tx.date)}</small></div>
      <span class="tx-item__amount ${tx.type === "income" ? "in" : "out"}">${tx.type === "income" ? "+" : "-"}${formatBRL(tx.amount)}</span>
      <button class="tx-item__del" data-del="${tx.id}" aria-label="Excluir">✕</button>
    </li>`).join("");

  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("transactions").delete().eq("id", btn.dataset.del);
      renderTxList();
      refreshHome();
    });
  });
}

export async function loadTransactionsSummary(){
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("transactions").select("*")
    .eq("user_id", state.user.id)
    .gte("date", monthStart)
    .order("date", { ascending: false });

  const rows = data || [];
  const income = rows.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expense = rows.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  return { income, expense, recent: rows.slice(0, 5) };
}

export async function loadAllTransactions(){
  const { data } = await supabase.from("transactions").select("*").eq("user_id", state.user.id).order("date");
  return data || [];
}
