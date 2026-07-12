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

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = "E-mail ou senha inválidos."; return; }
  location.href = "app.html";
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

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { errEl.textContent = traduzErro(error.message); return; }

  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      name,
      monthly_income: income,
      is_admin: false,
      is_demo: false,
    });
  }
  location.href = "app.html";
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

  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    alert("Conta demo indisponível no momento. Veja o README para configurá-la no Supabase.");
    btn.disabled = false;
    btn.textContent = "🚀 Iniciar conta demo";
    return;
  }

  // Sempre reseta os dados da conta demo para o estado original antes de entrar.
  await supabase.rpc("reset_demo_data");
  location.href = "app.html";
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
