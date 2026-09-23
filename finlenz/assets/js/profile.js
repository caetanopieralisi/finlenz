import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { toast } from "./ui.js";

function initials(name){
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("") || "?";
}

export function initProfile(){
  const name = state.profile.name || "Você";
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileEmail").textContent = state.user.email;
  document.getElementById("profileAvatar").textContent = initials(name);
  document.getElementById("profileIncome").value = state.profile.monthly_income || "";

  document.getElementById("profileSaveBtn").addEventListener("click", async () => {
    const income = parseFloat(document.getElementById("profileIncome").value) || null;
    const { error } = await supabase.from("profiles").update({ monthly_income: income }).eq("id", state.user.id);
    if (error) { toast("Não deu pra salvar.", "error"); return; }
    state.profile.monthly_income = income;
    toast("Perfil atualizado");
  });
}
