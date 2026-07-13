import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { loadTransactionsSummary } from "./transactions.js";

let apiKey = null;
let history = [];

const SYSTEM_PROMPT = `Você é o mentor financeiro do Finlenz, um app de educação financeira para jovens.
Responda em português do Brasil, de forma direta, acolhedora e prática, sem jargões difíceis.
Ajude com dúvidas sobre orçamento, gastos, sonhos financeiros e investimentos simples.
Nunca recomende produtos financeiros específicos de forma definitiva. Sempre lembre que é uma orientação educativa.
Respostas curtas (até 5 frases), como uma conversa real.`;

export async function initMentor(){
  const { data } = await supabase.from("app_settings").select("openai_api_key").eq("id", 1).maybeSingle();
  apiKey = data?.openai_api_key || null;

  const note = document.getElementById("mentorNote");
  note.textContent = apiKey ? "" : "A mentoria ainda não foi configurada pelo administrador do app.";

  await loadHistory();
  renderMessages();

  document.getElementById("mentorForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!apiKey) return;
    const input = document.getElementById("mentorInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    await pushMessage("user", text);
    renderMessages();
    await pushMessage("assistant", "…", true);
    renderMessages();

    const reply = await askMentor(text);
    history.pop(); // remove "…"
    await pushMessage("assistant", reply);
    renderMessages();
  });
}

async function loadHistory(){
  const { data } = await supabase
    .from("mentor_messages").select("role, content")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: true })
    .limit(30);
  history = data && data.length ? data : [
    { role: "assistant", content: "Oi! Sou o mentor do Finlenz. Pode perguntar qualquer coisa sobre sua vida financeira." }
  ];
}

async function pushMessage(role, content, skipSave = false){
  history.push({ role, content });
  if (!skipSave) {
    await supabase.from("mentor_messages").insert({ user_id: state.user.id, role, content });
  }
}

function renderMessages(){
  const el = document.getElementById("mentorMessages");
  el.innerHTML = history.map(m => `<div class="mentor-msg ${m.role === "user" ? "user" : "assistant"}">${escapeHtml(m.content)}</div>`).join("");
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function askMentor(userText){
  try {
    const { income, expense } = await loadTransactionsSummary();
    const context = `Contexto do usuário: receitas do mês R$${income.toFixed(2)}, despesas do mês R$${expense.toFixed(2)}.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: context },
          ...history.filter(m => m.content !== "…").slice(-8),
          { role: "user", content: userText },
        ],
        max_tokens: 300,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora, tenta de novo em instantes.";
  } catch (err) {
    return "Não consegui me conectar agora. Verifique sua internet e tente novamente.";
  }
}
