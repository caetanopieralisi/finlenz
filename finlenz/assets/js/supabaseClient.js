import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------------------------------------------------------------
// Alguns WebViews (ex.: WebViewer do App Inventor) rodam com o
// Web Storage (localStorage/sessionStorage) desativado, então
// window.localStorage vem null. Sem isso, o supabase-js não
// consegue lembrar a sessão de uma página HTML pra outra.
// Aqui criamos um storage alternativo baseado em cookies, que
// costuma continuar funcionando mesmo nesses WebViews.
// ---------------------------------------------------------------
function hasWorkingLocalStorage(){
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    return true;
  } catch (_e) {
    return false;
  }
}

const cookieStorage = {
  getItem(key){
    const m = document.cookie.match(new RegExp("(?:^|; )" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  },
  setItem(key, value){
    // max-age de 1 ano; sessão do supabase é renovada automaticamente antes de expirar.
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
  },
  removeItem(key){
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

const authOptions = {
  // WebView do App Inventor tem suporte quebrado à Web Locks API
  // (navigator.locks), o que trava o supabase-js para sempre no login.
  lock: async (_name, _acquireTimeout, fn) => fn(),
};

if (!hasWorkingLocalStorage()) {
  authOptions.storage = cookieStorage;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: authOptions,
});
