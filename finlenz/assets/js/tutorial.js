import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

const STEPS = [
  { icon: "🏠", title: "Início", desc: "Seu saldo do mês e os últimos lançamentos, tudo na primeira tela." },
  { icon: "💸", title: "Lançamentos", desc: "Registre o que entra e sai, separado por categoria." },
  { icon: "⏱️", title: "Valor-hora", desc: "Veja quantas horas de trabalho uma compra custa antes de decidir." },
  { icon: "🎯", title: "Custo dos sonhos", desc: "Descubra o quanto um gasto do momento atrasa o sonho que você mais quer." },
  { icon: "📈", title: "Previsão", desc: "Acompanhe pra onde seu dinheiro caminha nos próximos meses." },
  { icon: "🏦", title: "Investimentos", desc: "Compare Poupança, CDB, Tesouro e Renda Variável simulando valores." },
  { icon: "🧩", title: "Trilha", desc: "Aprenda finanças em lições curtas, no seu ritmo." },
  { icon: "📖", title: "Glossário", desc: "Consulte termos financeiros explicados de forma simples." },
  { icon: "🧭", title: "Mentoria", desc: "Tire dúvidas sobre sua vida financeira quando precisar." },
];

let step = 0;

export function maybeStartTutorial(){
  if (!state.profile.onboarding_done) startTutorial(true);
}

export function startTutorial(isFirstTime = false){
  step = 0;
  document.getElementById("tutorialOverlay").hidden = false;
  render(isFirstTime);
}

function render(isFirstTime){
  const box = document.getElementById("tutorialBox");
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  box.innerHTML = `
    <div class="tutorial-icon">${s.icon}</div>
    <h3>${s.title}</h3>
    <p class="muted">${s.desc}</p>
    <div class="tutorial-dots">${STEPS.map((_, i) => `<span class="tutorial-dot ${i === step ? "is-active" : ""}"></span>`).join("")}</div>
    <div class="tutorial-actions">
      ${isFirstTime ? `<button class="btn btn-outline btn-sm" id="tutSkip">Pular</button>` : `<span></span>`}
      <button class="btn btn-primary" id="tutNext">${isLast ? "Começar" : "Próximo"}</button>
    </div>`;

  document.getElementById("tutNext").addEventListener("click", () => {
    if (isLast) finish();
    else { step++; render(isFirstTime); }
  });
  document.getElementById("tutSkip")?.addEventListener("click", finish);
}

async function finish(){
  document.getElementById("tutorialOverlay").hidden = true;
  if (!state.profile.onboarding_done) {
    state.profile.onboarding_done = true;
    await supabase.from("profiles").update({ onboarding_done: true }).eq("id", state.user.id);
  }
}
