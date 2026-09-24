// ===========================================================
// Cache de dados do usuário.
// Cada ida ao Supabase leva ~0,5–1 s, então buscamos tudo de uma vez,
// em paralelo, logo no início, e as telas leem daqui. Depois de salvar
// ou apagar algo, só a tabela afetada é buscada de novo.
// ===========================================================
import { supabase } from "./supabaseClient.js";

const cache = {};
let userId = null;

const QUERIES = {
  profile: () => supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  transactions: () => supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: true }),
  dreams: () => supabase.from("dreams").select("*").eq("user_id", userId).order("created_at"),
  progress: () => supabase.from("learning_progress").select("lesson_id").eq("user_id", userId).eq("completed", true),
  mentor: () => supabase.from("mentor_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: true }).limit(30),
  settings: () => supabase.from("app_settings").select("openai_api_key").eq("id", 1).maybeSingle(),
};

function run(key){
  cache[key] = Promise.resolve(QUERIES[key]())
    .then(({ data, error }) => {
      if (error) console.error(`[finlenz] falha ao carregar ${key}:`, error);
      return data ?? (key === "profile" || key === "settings" ? null : []);
    })
    .catch(err => { console.error(`[finlenz] falha ao carregar ${key}:`, err); return key === "profile" || key === "settings" ? null : []; });
  return cache[key];
}

// Dispara todas as consultas ao mesmo tempo (uma "rodada" só).
export function preload(id){
  userId = id;
  Object.keys(QUERIES).forEach(run);
}

export function get(key){
  return cache[key] || run(key);
}

// Busca de novo uma tabela (depois de inserir/apagar).
export function refresh(key){
  return run(key);
}
