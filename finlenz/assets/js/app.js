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

// ---------- Navegação (registrada primeiro e sem depender de login,
// pra garantir que os cliques sempre funcionem mesmo se algo mais
// abaixo falhar) ----------
const navHistory = ["home"];

function goto(screenId, pushHistory = true){
  const target = document.getElementById(`screen-${screenId}`);
  if (!target) return;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("is-active"));
  target.classList.add("is-active");
  document.getElementById("screenTitle").textContent = SCREEN_TITLES[screenId] || "";
  document.getElementById("backBtn").hidden = screenId === "home";

  document.querySelectorAll(".bottom-nav__item").forEach(b => {
    const isToolScreen = !["home", "transactions", "profile"].includes(screenId);
    b.classList.toggle("is-active", b.dataset.goto === screenId || (isToolScreen && b.dataset.goto === "tools"));
  });

  if (pushHistory && navHistory[navHistory.length - 1] !== screenId) navHistory.push(screenId);
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if (btn) goto(btn.dataset.goto);
});

document.getElementById("backBtn")?.addEventListener("click", () => {
  navHistory.pop();
  goto(navHistory[navHistory.length - 1] || "home", false);
});

function renderToolsGrid(containerId){
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = TOOLS.map(t => `
    <button class="tool-card" data-goto="${t.id}">
      <span class="tool-card__icon">${t.icon}</span>
      <b>${t.title}</b>
      <small>${t.desc}</small>
    </button>`).join("");
}

// roda uma função e nunca deixa um erro nela travar o resto do app
async function safe(label, fn){
  try { await fn(); }
  catch (err) { console.error(`[finlenz] falha em "${label}":`, err); }
}

export async function refreshHomeSummary(){
  await safe("resumo da home", async () => {
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
  });
}

async function logout(){
  await supabase.auth.signOut();
  location.href = "login.html";
}
document.getElementById("logoutBtn")?.addEventListener("click", logout);
document.getElementById("profileLogoutBtn")?.addEventListener("click", logout);

// ---------- Autenticação e carregamento das ferramentas ----------
(async function boot(){
  let session;
  try {
    const res = await supabase.auth.getSession();
    session = res.data.session;
  } catch (err) {
    console.error("[finlenz] falha ao checar sessão:", err);
  }

  if (!session) {
    location.href = "login.html";
    return;
  }

  state.user = session.user;
  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    state.profile = profile || { name: session.user.email.split("@")[0] };
  } catch (err) {
    console.error("[finlenz] falha ao carregar perfil:", err);
    state.profile = { name: session.user.email.split("@")[0] };
  }

  document.getElementById("authGate").hidden = true;
  document.getElementById("appShell").hidden = false;

  document.getElementById("homeName").textContent = state.profile.name || "Você";
  document.getElementById("homeDemoTag").hidden = !state.profile.is_demo;

  renderToolsGrid("homeToolsGrid");
  renderToolsGrid("toolsGridFull");
  goto("home");

  // cada ferramenta é iniciada isoladamente: se uma falhar, as outras continuam
  await safe("lançamentos", () => initTransactions());
  await safe("valor-hora", () => initHourValue());
  await safe("sonhos", () => initDreams());
  await safe("previsão", () => initForecast());
  await safe("investimentos", () => initInvestments());
  await safe("trilha", () => initLearning());
  await safe("glossário", () => initGlossary());
  await safe("mentoria", () => initMentor());
  await safe("perfil", () => initProfile());
  await refreshHomeSummary();
})();
