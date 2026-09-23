import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { icon, categoryMeta } from "./icons.js";
import { toast } from "./ui.js";
import { txRowHTML } from "./txrow.js";

let refreshHome = () => {};
// Import dinâmico pra evitar dependência circular com app.js
import("./app.js").then(m => { refreshHome = m.refreshHomeSummary; });

function today(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function setType(type){
  document.getElementById("txType").value = type;
  document.querySelectorAll(".segmented__opt").forEach(b => b.classList.toggle("is-active", b.dataset.type === type));
  const seg = document.querySelector("#txForm .segmented");
  if (seg) seg.dataset.active = type;
  // receita puxa a categoria "Renda"; despesa volta para a primeira
  const select = document.getElementById("txCategory");
  if (type === "income") setCategory("Renda");
  else if (select.value === "Renda") setCategory("Alimentação");
}

function setCategory(cat){
  document.getElementById("txCategory").value = cat;
  document.querySelectorAll("#txCategoryChips .chip").forEach(c => c.classList.toggle("is-active", c.dataset.cat === cat));
}

function renderChips(){
  const wrap = document.getElementById("txCategoryChips");
  const select = document.getElementById("txCategory");
  if (!wrap) return;
  wrap.innerHTML = [...select.options].map(o => {
    const meta = categoryMeta(o.value);
    return `<button type="button" class="chip" data-cat="${o.value}">${icon(meta.icon)}${o.value}</button>`;
  }).join("");
  wrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) setCategory(chip.dataset.cat);
  });
  setCategory(select.value);
}

export function initTransactions(){
  const form = document.getElementById("txForm");
  const dateInput = document.getElementById("txDate");
  dateInput.value = today();

  renderChips();
  document.querySelectorAll(".segmented__opt").forEach(btn => {
    btn.addEventListener("click", () => setType(btn.dataset.type));
  });
  setType("expense");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    const payload = {
      user_id: state.user.id,
      type: document.getElementById("txType").value,
      description: document.getElementById("txDesc").value.trim(),
      amount: parseFloat(document.getElementById("txAmount").value),
      category: document.getElementById("txCategory").value,
      date: document.getElementById("txDate").value,
    };
    if (!payload.amount || payload.amount <= 0) { toast("Informe um valor maior que zero.", "error"); return; }
    submitBtn.disabled = true;
    const { error } = await supabase.from("transactions").insert(payload);
    submitBtn.disabled = false;
    if (error) { toast("Não deu pra salvar o lançamento.", "error"); return; }
    form.reset();
    dateInput.value = today();
    setType("expense");
    setCategory("Alimentação");
    toast(payload.type === "income" ? "Receita adicionada" : "Despesa adicionada");
    renderTxList();
    refreshHome();
  });

  renderTxList();
}

function dayLabel(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const opts = { weekday: "long", day: "numeric", month: "long" };
  if (d.getFullYear() !== t.getFullYear()) opts.year = "numeric";
  const s = d.toLocaleDateString("pt-BR", opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function renderTxList(){
  const list = document.getElementById("txList");
  const { data } = await supabase
    .from("transactions").select("*")
    .eq("user_id", state.user.id)
    .order("date", { ascending: false })
    .limit(100);

  if (!data || !data.length) {
    list.innerHTML = `<li class="list list__empty">Nenhum lançamento ainda.</li>`;
    return;
  }

  // agrupa por dia
  const groups = [];
  data.forEach(tx => {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  });

  list.innerHTML = groups.map(g => {
    const net = g.items.reduce((s, t) => s + (t.type === "income" ? 1 : -1) * Number(t.amount), 0);
    return `
      <li class="day-group">
        <div class="day-group__label"><span>${dayLabel(g.date)}</span><span>${net >= 0 ? "+" : "−"}${formatBRL(Math.abs(net))}</span></div>
        <ul class="list">${g.items.map(tx => txRowHTML(tx, { deletable: true, showDate: false })).join("")}</ul>
      </li>`;
  }).join("");

  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".tx");
      row?.classList.add("is-removing");
      const { error } = await supabase.from("transactions").delete().eq("id", btn.dataset.del);
      if (error) { row?.classList.remove("is-removing"); toast("Não deu pra excluir.", "error"); return; }
      toast("Lançamento excluído");
      setTimeout(() => { renderTxList(); refreshHome(); }, 260);
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
  return { income, expense, recent: rows.slice(0, 5), rows };
}

export async function loadAllTransactions(){
  const { data } = await supabase.from("transactions").select("*").eq("user_id", state.user.id).order("date");
  return data || [];
}
