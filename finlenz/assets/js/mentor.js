import { supabase } from "./supabaseClient.js";
import { state, formatBRL } from "./state.js";
import { loadAllTransactions } from "./transactions.js";

let apiKey = null;
let history = [];

const SYSTEM_PROMPT = `Você é o mentor financeiro do Finlenz, um app de educação financeira para jovens brasileiros.

Como você fala:
- Português do Brasil, direto, próximo, sem economês nem jargão desnecessário.
- Respostas curtas (3 a 5 frases), como uma conversa real de WhatsApp, não um artigo.
- Vá direto ao ponto: comece pela resposta/orientação, não pela explicação teórica.
- Quando fizer sentido, use os NÚMEROS REAIS do usuário (que aparecem no contexto abaixo) em vez de falar de forma genérica. Isso é o que diferencia uma boa mentoria de um texto de manual.

Como você orienta:
- Use os dados de receitas, despesas, categorias e sonhos financeiros do usuário para dar conselhos específicos à situação dele, não respostas genéricas de "faça um orçamento".
- Se o usuário está gastando muito em alguma categoria ou colocando um sonho em risco, aponte isso de forma direta, mas sem julgar.
- Nunca recomende produtos financeiros específicos (banco, corretora, ativo) de forma definitiva — explique o tipo de opção e sugira que ele compare antes de decidir.
- Se a pergunta for sobre algo fora de finanças pessoais, redirecione com gentileza para o que você pode ajudar.
- Você está dando orientação educativa, não é consultor financeiro certificado — deixe isso implícito no tom, sem precisar repetir esse aviso toda hora.`;

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
    { role: "assistant", content: "Oi! Sou o mentor do Finlenz. Pode perguntar qualquer coisa sobre sua vida financeira — já tenho acesso aos seus lançamentos e sonhos pra te dar uma resposta mais certeira." }
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

// ---------------------------------------------------------------
// Monta um resumo real da vida financeira do usuário (mês atual +
// últimos 3 meses por categoria + sonhos) pra dar contexto ao mentor.
// ---------------------------------------------------------------
async function buildFinancialContext(){
  const [txResult, dreamsResult] = await Promise.all([
    loadAllTransactions(),
    supabase.from("dreams").select("*").eq("user_id", state.user.id).order("created_at"),
  ]);

  const allTx = txResult || [];
  const dreams = dreamsResult.data || [];

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);

  const thisMonth = allTx.filter(t => t.date >= monthStart);
  const lastThreeMonths = allTx.filter(t => t.date >= threeMonthsAgo);

  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // Gastos por categoria nos últimos 3 meses, ordenado do maior pro menor.
  const byCategory = {};
  lastThreeMonths.filter(t => t.type === "expense").forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => `${cat}: ${formatBRL(total)}`)
    .join(", ");

  const dreamsText = dreams.length
    ? dreams.map(d => {
        const pct = d.target_amount ? Math.round((d.saved_amount / d.target_amount) * 100) : 0;
        return `"${d.name}" (${pct}% concluído, guarda ${formatBRL(d.monthly_contribution || 0)}/mês, faltam ${formatBRL(Math.max(d.target_amount - d.saved_amount, 0))})`;
      }).join("; ")
    : "nenhum sonho cadastrado ainda";

  const name = state.profile?.name || "usuário";
  const rendaFixa = state.profile?.monthly_income ? formatBRL(state.profile.monthly_income) : "não informada";

  return `Dados reais da conta de ${name} (use-os para personalizar a resposta):
- Renda mensal informada no perfil: ${rendaFixa}
- Receitas do mês atual: ${formatBRL(income)}
- Despesas do mês atual: ${formatBRL(expense)}
- Saldo do mês atual: ${formatBRL(income - expense)}
- Maiores categorias de gasto nos últimos 3 meses: ${topCategories || "sem dados suficientes"}
- Sonhos financeiros cadastrados: ${dreamsText}`;
}

async function askMentor(userText){
  try {
    const context = await buildFinancialContext();

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
        max_tokens: 350,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora, tenta de novo em instantes.";
  } catch (err) {
    return "Não consegui me conectar agora. Verifique sua internet e tente novamente.";
  }
}
