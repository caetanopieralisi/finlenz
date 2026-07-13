import { supabase } from "./supabaseClient.js";
import { APP_NAME_DEFAULT, PRIMARY_COLOR_DEFAULT, ACCENT_COLOR_DEFAULT } from "./config.js";

async function applyTheme(){
  try{
    const { data } = await supabase
      .from("app_settings")
      .select("app_name, primary_color, accent_color, logo_text")
      .eq("id", 1)
      .maybeSingle();

    const root = document.documentElement;
    root.style.setProperty("--primary", data?.primary_color || PRIMARY_COLOR_DEFAULT);
    root.style.setProperty("--accent", data?.accent_color || ACCENT_COLOR_DEFAULT);

    const name = data?.app_name || APP_NAME_DEFAULT;
    document.querySelectorAll(".brand__name").forEach(el => el.textContent = name);
    if (data?.logo_text) {
      document.querySelectorAll(".brand__mark").forEach(el => el.textContent = data.logo_text.slice(0,1).toUpperCase());
    }
  }catch(err){
    // Se o Supabase ainda não estiver configurado, o app segue com o tema padrão.
    console.warn("Tema padrão aplicado (settings indisponível):", err.message);
  }
}

applyTheme();
