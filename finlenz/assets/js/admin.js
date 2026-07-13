import { supabase } from "./supabaseClient.js";

const loginWrap = document.getElementById("adminLoginWrap");
const deniedWrap = document.getElementById("adminDenied");
const panel = document.getElementById("adminPanel");

async function boot(){
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showLogin(); return; }

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
  if (!profile?.is_admin) { showDenied(); return; }

  showPanel();
  loadSettings();
  loadStats();
}

function showLogin(){ loginWrap.hidden = false; deniedWrap.hidden = true; panel.hidden = true; }
function showDenied(){ loginWrap.hidden = true; deniedWrap.hidden = false; panel.hidden = true; }
function showPanel(){ loginWrap.hidden = true; deniedWrap.hidden = true; panel.hidden = false; }

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errEl = document.getElementById("adminLoginError");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = "E-mail ou senha inválidos."; return; }
  boot();
});

document.getElementById("adminLogoutBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});
document.getElementById("adminExitBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "login.html";
});

async function loadSettings(){
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return;
  document.getElementById("setAppName").value = data.app_name || "";
  document.getElementById("setLogoText").value = data.logo_text || "";
  document.getElementById("setPrimary").value = data.primary_color || "#2B3A67";
  document.getElementById("setAccent").value = data.accent_color || "#FF6B4A";
  document.getElementById("setApiKey").value = data.openai_api_key || "";
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    id: 1,
    app_name: document.getElementById("setAppName").value.trim() || "finlenz",
    logo_text: document.getElementById("setLogoText").value.trim() || "F",
    primary_color: document.getElementById("setPrimary").value,
    accent_color: document.getElementById("setAccent").value,
    openai_api_key: document.getElementById("setApiKey").value.trim(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("app_settings").upsert(payload);
  const msg = document.getElementById("settingsSaved");
  msg.textContent = error ? "Erro ao salvar." : "Configurações salvas ✓";
  setTimeout(() => msg.textContent = "", 2500);
});

async function loadStats(){
  const { data, error } = await supabase.rpc("admin_stats").maybeSingle();
  document.getElementById("statUsers").textContent = error ? "—" : data?.user_count ?? "—";
  document.getElementById("statTx").textContent = error ? "—" : data?.tx_count ?? "—";
}

boot();
