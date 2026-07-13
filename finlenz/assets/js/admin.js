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

let pendingLogoDataUrl = undefined; // undefined = não alterado, null = removido, string = novo

async function loadSettings(){
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return;
  document.getElementById("setAppName").value = data.app_name || "";
  document.getElementById("setLogoText").value = data.logo_text || "";
  document.getElementById("setPrimary").value = data.primary_color || "#C6FF3D";
  document.getElementById("setAccent").value = data.accent_color || "#C6FF3D";
  document.getElementById("setApiKey").value = data.openai_api_key || "";
  renderLogoPreview(data.logo_url || null);
}

function renderLogoPreview(url){
  const wrap = document.getElementById("logoPreviewWrap");
  if (!url) { wrap.innerHTML = `<span class="muted small">Nenhuma imagem enviada ainda.</span>`; return; }
  wrap.innerHTML = `
    <img src="${url}" alt="logo atual" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid var(--border);">
    <button type="button" id="removeLogoBtn" class="btn btn-outline btn-sm" style="margin-left:10px;">Remover imagem</button>`;
  document.getElementById("removeLogoBtn").addEventListener("click", () => {
    pendingLogoDataUrl = null;
    renderLogoPreview(null);
  });
}

document.getElementById("setLogoFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024) {
    alert("Escolha uma imagem menor (até 800KB) para não pesar o carregamento do app.");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingLogoDataUrl = reader.result;
    renderLogoPreview(pendingLogoDataUrl);
  };
  reader.readAsDataURL(file);
});

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
  if (pendingLogoDataUrl !== undefined) payload.logo_url = pendingLogoDataUrl; // null remove, string atualiza

  const { error } = await supabase.from("app_settings").upsert(payload);
  const msg = document.getElementById("settingsSaved");
  if (error) {
    console.error("[finlenz admin] erro ao salvar settings:", error);
    const hint = /column|schema cache/i.test(error.message) ? " Rode o supabase/schema.sql novamente no seu projeto." : "";
    msg.style.color = "var(--expense)";
    msg.textContent = `Erro ao salvar: ${error.message}.${hint}`;
  } else {
    msg.style.color = "var(--income)";
    msg.textContent = "Configurações salvas ✓";
    pendingLogoDataUrl = undefined;
  }
  setTimeout(() => msg.textContent = "", 6000);
});

async function loadStats(){
  const { data, error } = await supabase.rpc("admin_stats").maybeSingle();
  document.getElementById("statUsers").textContent = error ? "-" : data?.user_count ?? "-";
  document.getElementById("statTx").textContent = error ? "-" : data?.tx_count ?? "-";
}

boot();
