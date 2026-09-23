import { supabase } from "./supabaseClient.js";
import { DEMO_EMAIL, DEMO_PASSWORD, ADMIN_SECRET_CODE } from "./config.js";

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
// Em alguns WebViews a escrita da sessão pode atrasar alguns instantes
// em relação à resposta do login.
async function goToAppWhenSessionReady(){
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) { location.href = "app.html"; return; }
    await new Promise(r => setTimeout(r, 300));
  }
  console.error("[finlenz] sessão não confirmada após login.");
  location.href = "app.html";
}

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  let result;
  try {
    result = await supabase.auth.signInWithPassword({ email, password });
  } catch (err) {
    errEl.textContent = "Não foi possível entrar agora. Tente novamente.";
    return;
  }
  if (result.error) { errEl.textContent = "E-mail ou senha inválidos."; return; }
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

  let result;
  try {
    result = await supabase.auth.signUp({ email, password });
  } catch (err) {
    errEl.textContent = "Não foi possível criar a conta agora. Tente novamente.";
    return;
  }
  const { data, error } = result;
  if (error) { errEl.textContent = traduzErro(error.message); return; }

  if (data.user) {
    // O perfil base já foi criado automaticamente por uma trigger no banco;
    // aqui só complementamos com nome e renda informados no cadastro.
    await supabase.from("profiles").upsert({ id: data.user.id, name, monthly_income: income }, { onConflict: "id" });
  }
  await goToAppWhenSessionReady();
});

function traduzErro(msg){
  if (msg.includes("already registered")) return "Esse e-mail já tem uma conta.";
  if (msg.includes("Password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não foi possível criar a conta. Tente novamente.";
}

// ---------- Conta demo ----------
// O login da demo pode falhar de forma intermitente: limite de logins por IP
// do Supabase (várias pessoas na mesma rede), rede instável ou o projeto
// "acordando". Por isso: reaproveita a sessão demo se já existir, tenta de
// novo algumas vezes com espera crescente e mostra o erro na tela (sem alert,
// que trava alguns WebViews).
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let demoBusy = false;

async function signInDemoWithRetry(){
  const delays = [0, 1500, 3000, 6000];
  let last;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (!error && data.session) return { ok: true };
      last = error;
      // Credencial errada / conta inexistente: não adianta repetir.
      const st = error && error.status;
      if (st === 400 && !/rate/i.test(error.message || "")) break;
    } catch (err) {
      last = err; // erro de rede: tenta de novo
    }
    console.warn(`[finlenz] tentativa ${i + 1} de login demo falhou:`, last);
  }
  return { ok: false, error: last };
}

document.getElementById("demoBtn").addEventListener("click", async () => {
  if (demoBusy) return; // evita duplo clique disparando vários logins
  demoBusy = true;
  const btn = document.getElementById("demoBtn");
  const errEl = document.getElementById("demoError");
  if (errEl) errEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Preparando a conta demo...";

  // Já está logado como demo? Não precisa gastar outro login.
  let ready = false;
  try {
    const { data } = await supabase.auth.getSession();
    ready = data.session?.user?.email === DEMO_EMAIL;
  } catch (_e) {}

  if (!ready) {
    const result = await signInDemoWithRetry();
    if (!result.ok) {
      console.error("[finlenz] conta demo indisponível:", result.error);
      const e = result.error || {};
      let msg = "Não foi possível abrir a conta demo agora. Tente de novo em alguns segundos.";
      if (e.status === 429 || /rate/i.test(e.message || "")) {
        msg = "Muitas pessoas entraram na demo agora há pouco. Aguarde um minuto e tente de novo.";
      } else if (e.status === 400) {
        msg = "Conta demo não configurada no Supabase (veja o README).";
      }
      if (errEl) errEl.textContent = msg; else alert(msg);
      btn.disabled = false;
      btn.textContent = "» Iniciar conta demo";
      demoBusy = false;
      return;
    }
  }

  // Sempre reseta os dados da conta demo para o estado original antes de entrar.
  try {
    const { error } = await supabase.rpc("reset_demo_data");
    if (error) console.error("[finlenz] falha ao resetar dados demo:", error);
  } catch (err) {
    console.error("[finlenz] falha ao resetar dados demo:", err);
  }
  await goToAppWhenSessionReady();
});

// ---------- Acesso escondido ao painel admin ----------
// Digite o código em qualquer lugar desta tela (não precisa estar em um campo).
let buffer = "";
window.addEventListener("keydown", (e) => {
  if (e.key.length > 1) return; // ignora teclas especiais (Shift, Enter, etc.)
  buffer = (buffer + e.key).slice(-ADMIN_SECRET_CODE.length);
  if (buffer.toLowerCase() === ADMIN_SECRET_CODE.toLowerCase()) {
    location.href = "admin.html";
  }
});
