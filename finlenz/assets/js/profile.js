import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

export function initProfile(){
  document.getElementById("profileName").textContent = state.profile.name || "Você";
  document.getElementById("profileEmail").textContent = state.user.email;
  document.getElementById("profileIncome").value = state.profile.monthly_income || "";

  document.getElementById("profileSaveBtn").addEventListener("click", async () => {
    const income = parseFloat(document.getElementById("profileIncome").value) || null;
    await supabase.from("profiles").update({ monthly_income: income }).eq("id", state.user.id);
    state.profile.monthly_income = income;
    alert("Perfil atualizado!");
  });
}
