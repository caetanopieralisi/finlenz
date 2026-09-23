import { supabase } from "./supabaseClient.js";
import { state, TOOLS } from "./state.js";
import { icon } from "./icons.js";

const MASCOT_NAME = "Fin";

const T = Object.fromEntries(TOOLS.map(t => [t.id, t]));
const STEPS = [
  { welcome: true, title: "Oi, eu sou o Fin!", desc: "Vou te mostrar rapidinho como o Finlenz funciona. Bora dar uma volta pelo app?" },
  { icon: "house", tint: "lime", title: "Início", desc: "Seu saldo do mês, para onde foi o dinheiro e os últimos lançamentos, tudo na primeira tela." },
  { icon: "plusCircle", tint: "gray", title: "Lançamentos", desc: "Registre o que entra e sai, separado por categoria." },
  ...["hourvalue", "dreams", "forecast", "investments", "learning", "glossary", "mentor"].map(id => ({
    icon: T[id].icon, tint: T[id].tint, title: T[id].title,
    desc: {
      hourvalue: "Veja quantas horas de trabalho uma compra custa antes de decidir.",
      dreams: "Descubra o quanto um gasto do momento atrasa o sonho que você mais quer.",
      forecast: "Acompanhe para onde seu dinheiro caminha nos próximos meses.",
      investments: "Compare várias formas de investir simulando valores.",
      learning: "Aprenda finanças em lições curtas, no seu ritmo.",
      glossary: "Consulte termos financeiros explicados de forma simples.",
      mentor: "Tire dúvidas sobre sua vida financeira quando precisar.",
    }[id],
  })),
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

  const mascot = (size) => `
    <div class="tutorial-mascot ${size}">
      <span class="tutorial-mascot__eye tutorial-mascot__eye--l"></span>
      <span class="tutorial-mascot__eye tutorial-mascot__eye--r"></span>
      <span class="tutorial-mascot__mouth"></span>
    </div>`;

  box.innerHTML = `
    ${s.welcome
      ? `${mascot("tutorial-mascot--big")}<p class="tutorial-mascot__name">${MASCOT_NAME}</p>`
      : `<div class="tutorial-step-head">${mascot("tutorial-mascot--sm")}${MASCOT_NAME} · ${step} de ${STEPS.length - 1}</div>
         <div class="tutorial-icon"><span class="tile tile--${s.tint}">${icon(s.icon)}</span></div>`}
    <h3>${s.title}</h3>
    <p class="muted">${s.desc}</p>
    <div class="tutorial-dots">${STEPS.map((_, i) => `<span class="tutorial-dot ${i === step ? "is-active" : ""}"></span>`).join("")}</div>
    <div class="tutorial-actions">
      ${isFirstTime && !isLast ? `<button class="btn btn-outline" id="tutSkip">Pular</button>` : step > 0 ? `<button class="btn btn-outline" id="tutBack">Voltar</button>` : `<button class="btn btn-outline" id="tutSkip">Fechar</button>`}
      <button class="btn btn-primary" id="tutNext">${isLast ? "Começar" : step === 0 ? "Vamos lá" : "Próximo"}</button>
    </div>`;

  document.getElementById("tutBack")?.addEventListener("click", () => { step--; render(isFirstTime); });
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
