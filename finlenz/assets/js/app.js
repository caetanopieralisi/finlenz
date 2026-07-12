import { supabase } from "./supabaseClient.js";
import { state, formatBRL, formatDate, TOOLS } from "./state.js";

import { initTransactions, loadTransactionsSummary } from "./transactions.js";
import { initHourValue } from "./hourvalue.js";
import { initDreams } from "./dreams.js";
import { initForecast } from "./forecast.js";
import { initInvestments } from "./investments.js";
import { initLearning } from "./learning.js";
import { initGlossary } from "./glossary.js";
import { initMentor } from "./mentor.js";
import { initProfile } from "./profile.js";

const SCREEN_TITLES = {
  home: "Início", transactions: "Lançamentos", hourvalue: "Valor-hora",
  dreams: "Custo dos sonhos", forecast: "Previsão financeira",
  investments: "Investimentos", learning: "Trilha de aprendizado",
  glossary: "Glossário", mentor: "Mentoria", tools: "Ferramentas", profile: "Perfil",
};
const BOTTOM_TABS = ["home", "transactions", "tools", "profile"];

// ---------- Auth gate ----------
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  location.href = "login.html";
} else {
  state.user = session.user;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  state.profile = profile || { name: session.user.email.split("@")[0] };
  boot();
}

function boot(){
  document.getElementById("authGate").hidden = true;
  document.getElementById("appShell").hidden = false;

  document.getElementById("homeName").textContent = state.profile.name || "Você";
  document.getElementById("homeDemoTag").hidden = !state.profile.is_demo;

  renderToolsGrid("homeToolsGrid");
  renderToolsGrid("toolsGridFull");

  setupNav();
  initTransactions();
  initHourValue();
  initDreams();
  initForecast();
  initInvestments();
  initLearning();
  initGlossary();
  initMentor();
  initProfile();

  refreshHomeSummary();
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("profileLogoutBtn").addEventListener("click", logout);
}

async function logout(){
  await supabase.auth.signOut();
  location.href = "login.html";
}

function renderToolsGrid(containerId){
  const el = document.getElementById(containerId);
  el.innerHTML = TOOLS.map(t => `
    <button class="tool-card" data-goto="${t.id}">
      <span class="tool-card__icon">${t.icon}</span>
      <b>${t.title}</b>
      <small>${t.desc}</small>
    </button>`).join("");
}

// ---------- Navegação entre telas ----------
const history = ["home"];

function goto(screenId, pushHistory = true){
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("is-active"));
  document.getElementById(`screen-${screenId}`).classList.add("is-active");
  document.getElementById("screenTitle").textContent = SCREEN_TITLES[screenId] || "";
  document.getElementById("backBtn").hidden = screenId === "home";

  document.querySelectorAll(".bottom-nav__item").forEach(b => {
    b.classList.toggle("is-active", b.dataset.goto === screenId || (screenId !== "home" && screenId !== "transactions" && screenId !== "profile" && b.dataset.goto === "tools"));
  });

  if (pushHistory && history[history.length - 1] !== screenId) history.push(screenId);
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if (btn) goto(btn.dataset.goto);
});

document.getElementById("backBtn").addEventListener("click", () => {
  history.pop();
  goto(history[history.length - 1] || "home", false);
});

function setupNav(){
  goto("home");
}

// ---------- Resumo da home ----------
export async function refreshHomeSummary(){
  const { income, expense, recent } = await loadTransactionsSummary();
  document.getElementById("sumIncome").textContent = formatBRL(income);
  document.getElementById("sumExpense").textContent = formatBRL(expense);
  document.getElementById("sumBalance").textContent = formatBRL(income - expense);

  const list = document.getElementById("homeRecent");
  if (!recent.length) {
    list.innerHTML = `<li class="muted">Nenhum lançamento ainda. Toque em "Lançar" pra começar.</li>`;
    return;
  }
  list.innerHTML = recent.map(tx => `
    <li class="tx-item">
      <div class="tx-item__left"><span>${tx.description}</span><small>${tx.category} · ${formatDate(tx.date)}</small></div>
      <span class="tx-item__amount ${tx.type === "income" ? "in" : "out"}">${tx.type === "income" ? "+" : "-"}${formatBRL(tx.amount)}</span>
    </li>`).join("");
}

window.__finlenzGoto = goto; // usado por outros módulos (ex: link "Ver todos")
