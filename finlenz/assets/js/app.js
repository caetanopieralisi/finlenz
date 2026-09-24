import { supabase } from "./supabaseClient.js";
import { state, formatBRL, TOOLS } from "./state.js";
import { icon, hydrateIcons } from "./icons.js";
import { confirmSheet, toast, escapeHtml, animateNumber } from "./ui.js";
import { txRowHTML, CAT_COLORS } from "./txrow.js";
import { preload, get } from "./store.js";

import { initTransactions, loadTransactionsSummary } from "./transactions.js";
import { initHourValue } from "./hourvalue.js";
import { initInstallments } from "./installments.js";
import { initLens } from "./lens.js";
import { renderInsights } from "./insights.js";
import { initDreams } from "./dreams.js";
import { initForecast } from "./forecast.js";
import { initInvestments } from "./investments.js";
import { initLearning } from "./learning.js";
import { initGlossary } from "./glossary.js";
import { initMentor } from "./mentor.js";
import { initProfile } from "./profile.js";
import { maybeStartTutorial, startTutorial } from "./tutorial.js";

const SCREEN_TITLES = {
  home: "Início", transactions: "Lançamentos", hourvalue: "Valor-hora", installments: "Parcelado ou à vista?",
  dreams: "Custo dos sonhos", forecast: "Previsão",
  investments: "Investimentos", learning: "Trilha",
  glossary: "Glossário", mentor: "Mentoria", tools: "Ferramentas",
  profile: "Perfil", settings: "Configurações",
};
const SCREEN_EYEBROWS = {
  transactions: "Entradas e saídas", hourvalue: "Ferramenta", installments: "Ferramenta", dreams: "Ferramenta",
  forecast: "Ferramenta", investments: "Simulador", learning: "Aprenda no seu ritmo",
  glossary: "Consulta rápida", mentor: "Assistente", tools: "Tudo em um lugar",
  profile: "Sua conta", settings: "Sua conta",
};
const ROOT_SCREENS = ["home", "transactions", "tools", "profile"];

hydrateIcons();

// ---------- Navegação (registrada primeiro e sem depender de login) ----------
const navHistory = ["home"];

function greeting(){
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function setHeader(screenId){
  const firstName = (state.profile?.name || "").split(" ")[0];
  const title = screenId === "home" && firstName ? `${greeting()}, ${firstName}` : (SCREEN_TITLES[screenId] || "");
  document.getElementById("largeTitle").textContent = title;
  document.getElementById("screenTitle").textContent = SCREEN_TITLES[screenId] || "";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("pageEyebrow").textContent = screenId === "home"
    ? today.charAt(0).toUpperCase() + today.slice(1)
    : (SCREEN_EYEBROWS[screenId] || "");
  document.title = screenId === "home" ? "Finlenz" : `${SCREEN_TITLES[screenId]} · Finlenz`;
}

function goto(screenId, pushHistory = true){
  const target = document.getElementById(`screen-${screenId}`);
  if (!target) return;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("is-active"));
  target.classList.add("is-active");
  setHeader(screenId);

  const isRoot = ROOT_SCREENS.includes(screenId);
  document.getElementById("backBtn").hidden = isRoot;
  document.getElementById("topbarLogo").hidden = !isRoot;

  const isToolScreen = !["home", "transactions", "profile", "settings"].includes(screenId);
  document.querySelectorAll(".bottom-nav__item").forEach(b => {
    b.classList.toggle("is-active", b.dataset.goto === screenId || (isToolScreen && b.dataset.goto === "tools"));
  });
  document.querySelectorAll(".sidebar__item").forEach(b => {
    b.classList.toggle("is-active", b.dataset.goto === screenId);
  });

  if (isRoot) navHistory.length = 0;
  if (pushHistory && navHistory[navHistory.length - 1] !== screenId) navHistory.push(screenId);
  window.scrollTo(0, 0);
  onScroll();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if (btn) goto(btn.dataset.goto);
});

document.getElementById("backBtn")?.addEventListener("click", () => {
  navHistory.pop();
  goto(navHistory[navHistory.length - 1] || "home", false);
});

// Barra superior ganha fundo translúcido e título pequeno ao rolar
const topbar = document.getElementById("topbar");
function onScroll(){ topbar?.classList.toggle("is-scrolled", window.scrollY > 44); }
window.addEventListener("scroll", onScroll, { passive: true });

function renderToolsGrid(containerId){
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = TOOLS.map(t => `
    <button class="tool-card" data-goto="${t.id}">
      <span class="tile tile--${t.tint}">${icon(t.icon)}</span>
      <span><b>${t.title}</b><small>${t.desc}</small></span>
    </button>`).join("");
}

function renderToolsList(containerId){
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<ul class="list">${TOOLS.map(t => `
    <li><button class="row-btn" data-goto="${t.id}">
      <span class="tile tile--${t.tint}">${icon(t.icon)}</span>
      <span class="row-btn__text">${t.title}<small>${t.desc}</small></span>
      ${icon("chevronRight", "chev")}
    </button></li>`).join("")}</ul>`;
}

function renderSidebarTools(){
  const el = document.getElementById("sidebarTools");
  if (!el) return;
  el.innerHTML = TOOLS.map(t => `<button class="sidebar__item" data-goto="${t.id}">${icon(t.icon)}${t.title}</button>`).join("");
}

// roda uma função e nunca deixa um erro nela travar o resto do app
async function safe(label, fn){
  try { await fn(); }
  catch (err) { console.error(`[finlenz] falha em "${label}":`, err); }
}

function renderCategories(rows){
  const el = document.getElementById("homeCats");
  if (!el) return;
  const byCat = {};
  rows.filter(r => r.type === "expense").forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount); });
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    el.innerHTML = `<p class="cats__empty">Nenhuma despesa neste mês ainda.</p>`;
    return;
  }
  // até 5 categorias; o resto vira "Outros"
  let shown = entries.slice(0, 5);
  const rest = entries.slice(5).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) {
    const i = shown.findIndex(([c]) => c === "Outros");
    if (i >= 0) shown[i] = ["Outros", shown[i][1] + rest]; else shown.push(["Outros", rest]);
  }
  const total = shown.reduce((s, [, v]) => s + v, 0);
  el.innerHTML = `
    <div class="cats__bar" role="img" aria-label="Distribuição de gastos por categoria">
      ${shown.map(([c, v]) => `<span class="cats__seg" title="${escapeHtml(c)}: ${formatBRL(v)}" style="flex-grow:${v};background:${CAT_COLORS[c] || CAT_COLORS.Outros}"></span>`).join("")}
    </div>
    <div class="cats__legend">
      ${shown.map(([c, v]) => `
        <div class="cats__item">
          <span class="cats__dot" style="background:${CAT_COLORS[c] || CAT_COLORS.Outros}"></span>
          <span class="cats__name">${escapeHtml(c)}</span>
          <span class="cats__val">${Math.round((v / total) * 100)}%</span>
        </div>`).join("")}
    </div>`;
}

export async function refreshHomeSummary(){
  safe("insights", () => renderInsights());
  await safe("resumo da home", async () => {
    const { income, expense, recent, rows } = await loadTransactionsSummary();
    const balance = income - expense;
    animateNumber(document.getElementById("sumIncome"), income, formatBRL);
    animateNumber(document.getElementById("sumExpense"), expense, formatBRL);
    animateNumber(document.getElementById("sumBalance"), balance, formatBRL);

    const month = new Date().toLocaleDateString("pt-BR", { month: "long" });
    document.getElementById("balanceLabel").textContent = `Saldo de ${month}`;
    const hint = document.getElementById("balanceHint");
    if (income > 0) {
      const pct = Math.round((balance / income) * 100);
      hint.textContent = balance >= 0
        ? `Você guardou ${pct}% do que entrou este mês.`
        : `Você gastou ${formatBRL(-balance)} a mais do que entrou.`;
    } else {
      hint.textContent = expense > 0 ? "Registre suas receitas para ver o saldo real." : "Comece registrando o que entra e o que sai.";
    }

    renderCategories(rows || []);

    const list = document.getElementById("homeRecent");
    if (!recent.length) {
      list.innerHTML = `<li class="list__empty">Nenhum lançamento ainda. Toque em “Lançar” para começar.</li>`;
      return;
    }
    list.innerHTML = recent.map(tx => txRowHTML(tx)).join("");
  });
}

async function logout(){
  await supabase.auth.signOut();
  location.href = "login.html";
}
document.getElementById("drawerLogoutBtn")?.addEventListener("click", logout);
document.getElementById("settingsLogoutBtn")?.addEventListener("click", logout);

// ---------- Menu ----------
const drawer = document.getElementById("drawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");

function openDrawer(){ drawer.hidden = false; drawerBackdrop.hidden = false; }
function closeDrawer(){ drawer.hidden = true; drawerBackdrop.hidden = true; }

document.getElementById("menuBtn")?.addEventListener("click", () => drawer.hidden ? openDrawer() : closeDrawer());
document.getElementById("drawerCloseBtn")?.addEventListener("click", closeDrawer);
drawerBackdrop?.addEventListener("click", closeDrawer);
drawer?.addEventListener("click", (e) => {
  if (e.target.closest("[data-goto]")) closeDrawer();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });

document.getElementById("drawerTutorialBtn")?.addEventListener("click", () => {
  closeDrawer();
  startTutorial(false);
});
document.getElementById("settingsTutorialBtn")?.addEventListener("click", () => startTutorial(false));

document.getElementById("settingsClearBtn")?.addEventListener("click", async () => {
  const ok = await confirmSheet({
    title: "Apagar todos os seus dados?",
    message: "Lançamentos, sonhos e progresso da trilha serão apagados. Isso não pode ser desfeito.",
    confirmText: "Apagar tudo",
    destructive: true,
  });
  if (!ok) return;
  await safe("limpar dados", async () => {
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", state.user.id),
      supabase.from("dreams").delete().eq("user_id", state.user.id),
      supabase.from("learning_progress").delete().eq("user_id", state.user.id),
    ]);
    toast("Seus dados foram apagados.");
    setTimeout(() => location.reload(), 900);
  });
});

function initials(name){
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("") || "?";
}

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
  // Todas as consultas saem juntas, numa rodada só (cada ida ao banco leva ~0,5–1 s).
  preload(state.user.id);

  const profile = await get("profile");
  state.profile = profile || { name: (session.user.email || "").split("@")[0] };

  document.getElementById("authGate").hidden = true;
  document.getElementById("appShell").hidden = false;

  const name = state.profile.name || "Você";
  document.getElementById("homeName").textContent = name;
  document.getElementById("homeDemoTag").hidden = !state.profile.is_demo;
  document.getElementById("sidebarName").textContent = name;
  document.getElementById("sidebarEmail").textContent = state.user.email || "";
  document.getElementById("sidebarAvatar").textContent = initials(name);

  renderToolsGrid("homeToolsGrid");
  renderToolsList("toolsGridFull");
  renderSidebarTools();
  hydrateIcons();
  goto("home");

  // Início primeiro; o tutorial não espera o resto carregar.
  const home = Promise.all([refreshHomeSummary(), safe("insights", () => renderInsights())]).then(() => maybeStartTutorial());

  // Ferramentas em paralelo: se uma falhar, as outras continuam.
  await Promise.all([
    home,
    safe("lançamentos", () => initTransactions()),
    safe("valor-hora", () => initHourValue()),
    safe("parcelamento", () => initInstallments()),
    safe("lente", () => initLens()),
    safe("sonhos", () => initDreams()),
    safe("previsão", () => initForecast()),
    safe("investimentos", () => initInvestments()),
    safe("trilha", () => initLearning()),
    safe("glossário", () => initGlossary()),
    safe("mentoria", () => initMentor()),
    safe("perfil", () => initProfile()),
  ]);
})();
