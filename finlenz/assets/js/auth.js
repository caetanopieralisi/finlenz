import { supabase } from "./supabaseClient.js";
import { DEMO_EMAIL, DEMO_PASSWORD, ADMIN_SECRET_CODE } from "./config.js";

// ---------- Debug visível na tela (WebView do App Inventor não mostra alert()) ----------
function log(msg){
  const box = document.getElementById("debugBox");
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  box.textContent += `[${time}] ${msg}\n`;
  box.scrollTop = box.scrollHeight;
}
log("login.html carregado. localStorage disponível: " + (function(){
  try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); return "sim"; }
  catch(e){ return "NÃO (" + e.message + ")"; }
})());
log("cookies disponíveis: " + (navigator.cookieEnabled ? "sim" : "NÃO"));

// ---------- Tabs ----------
const tabs = document.querySelectorAll(".auth-tab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

function setTab(tab){
  tabs.forEach(t => t.classList.toggle("is-active", t.dataset.tab === tab));
  loginForm.hidden = tab !== "login";
  signupForm.hidden = tab !== "signup";
}
tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));

const params = new URLSearchParams(location.search);
if (params.get("mode") === "signup") setTab("signup");

// Espera a sessão realmente aparecer via getSession() antes de navegar.
async function goToAppWhenSessionReady(){
  for (let i = 0; i < 10; i++) {
    log(`checando sessão (tentativa ${i + 1})...`);
    const { data, error } = await supabase.auth.getSession();
    if (error) log("erro em getSession: " + error.message);
    if (data.session) { log("sessão confirmada, indo para app.html"); location.href = "app.html"; return; }
    await new Promise(r => setTimeout(r, 300));
  }
  log("FALHA: sessão nunca ficou disponível via getSession(). Provável bloqueio de localStorage neste WebView.");
}

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  log("login: enviando signInWithPassword...");
  let result;
  try {
    result = await supabase.auth.signInWithPassword({ email, password });
  } catch (err) {
    log("login: EXCEÇÃO -> " + err.message);
    return;
  }
  if (result.error) { log("login: erro retornado -> " + result.error.message); errEl.textContent = "E-mail ou senha inválidos."; return; }
  log("login: sucesso, session presente? " + !!result.data.session);
  await goToAppWhenSessionReady();
});

// ---------- Signup ----------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const income = parseFloat(document.getElementById("signupIncome").value) || null;
  const errEl = document.getElementById("signupError");
  errEl.textContent = "";

  log("signup: enviando signUp...");
  let result;
  try {
    result = await supabase.auth.signUp({ email, password });
  } catch (err) {
    log("signup: EXCEÇÃO -> " + err.message);
    return;
  }
  const { data, error } = result;
  if (error) { log("signup: erro retornado -> " + error.message); errEl.textContent = traduzErro(error.message); return; }
  log("signup: sucesso, session presente? " + !!data.session);

  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, name, monthly_income: income }, { onConflict: "id" });
    log("signup: perfil salvo.");
  }
  await goToAppWhenSessionReady();
});

function traduzErro(msg){
  if (msg.includes("already registered")) return "Esse e-mail já tem uma conta.";
  if (msg.includes("Password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não foi possível criar a conta. Tente novamente.";
}

// ---------- Conta demo ----------
document.getElementById("demoBtn").addEventListener("click", async () => {
  const btn = document.getElementById("demoBtn");
  btn.disabled = true;
  btn.textContent = "Preparando a conta demo...";

  log("demo: enviando signInWithPassword...");
  let result;
  try {
    result = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
  } catch (err) {
    log("demo: EXCEÇÃO -> " + err.message);
    btn.disabled = false;
    btn.textContent = "» Iniciar conta demo";
    return;
  }

  if (result.error) {
    log("demo: erro retornado -> " + result.error.message);
    btn.disabled = false;
    btn.textContent = "» Iniciar conta demo";
    return;
  }
  log("demo: sucesso, session presente? " + !!result.data.session);

  try {
    await supabase.rpc("reset_demo_data");
    log("demo: reset_demo_data ok.");
  } catch (err) {
    log("demo: falha ao resetar dados -> " + err.message);
  }
  await goToAppWhenSessionReady();
});

// ---------- Acesso escondido ao painel admin ----------
let buffer = "";
window.addEventListener("keydown", (e) => {
  if (e.key.length > 1) return;
  buffer = (buffer + e.key).slice(-ADMIN_SECRET_CODE.length);
  if (buffer.toLowerCase() === ADMIN_SECRET_CODE.toLowerCase()) {
    location.href = "admin.html";
  }
});
