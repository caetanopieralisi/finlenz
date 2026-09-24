import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { icon } from "./icons.js";
import { escapeHtml } from "./ui.js";
import { get } from "./store.js";

// Uma medalha por lição, na ordem da trilha.
const MEDALS = [
  { name: "Orçamentista", icon: "wallet", tint: "green" },
  { name: "Olho nos fixos", icon: "text", tint: "teal" },
  { name: "Escudo de emergência", icon: "shield", tint: "blue" },
  { name: "Domador de juros", icon: "trend", tint: "orange" },
  { name: "Investidor iniciante", icon: "bars", tint: "indigo" },
  { name: "Consumo consciente", icon: "lens", tint: "pink" },
  { name: "Planejador de sonhos", icon: "target", tint: "purple" },
  { name: "Hábito de ouro", icon: "award", tint: "lime" },
];
const medalFor = (i) => MEDALS[i % MEDALS.length];

let lessons = [];
let completedIds = new Set();
let currentLesson = null;
let selectedOption = null;
let justEarned = false;

export async function initLearning(){
  // lições (arquivo estático) e progresso (banco) em paralelo
  const [ls] = await Promise.all([fetch("data/lessons.json").then(r => r.json()), loadProgress()]);
  lessons = ls;
  renderTrail();

  document.getElementById("trailCertBtn")?.addEventListener("click", openCertificate);
  document.getElementById("lessonModal").addEventListener("click", (e) => {
    if (e.target.id === "lessonModal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("lessonModal").hidden) closeModal();
  });
}

async function loadProgress(){
  const data = await get("progress");
  completedIds = new Set((data || []).map(r => r.lesson_id));
}

function renderTrail(){
  const fill = document.getElementById("trailProgressFill");
  const label = document.getElementById("trailProgressLabel");
  const ring = document.getElementById("trailRing");
  const pct = lessons.length ? Math.round((completedIds.size / lessons.length) * 100) : 0;
  fill.style.width = `${pct}%`;
  ring?.style.setProperty("--p", pct);
  label.textContent = completedIds.size === lessons.length && lessons.length
    ? "Trilha completa. Mandou bem!"
    : `${completedIds.size} de ${lessons.length} lições concluídas`;

  let nextMarked = false;
  const el = document.getElementById("learningTrail");
  el.innerHTML = lessons.map((lesson, i) => {
    const done = completedIds.has(lesson.id);
    const locked = !done && i > 0 && !completedIds.has(lessons[i - 1].id);
    const isNext = !done && !locked && !nextMarked;
    if (isNext) nextMarked = true;
    const cls = done ? "is-done" : locked ? "is-locked" : isNext ? "is-next" : "";
    const status = done ? "Concluída" : locked ? "Conclua a anterior para liberar" : "Toque para começar";
    return `
      <button class="trail-item ${cls}" data-lesson="${lesson.id}" ${locked ? "disabled" : ""}>
        <span class="trail-item__badge">${done ? icon("check") : locked ? icon("lock") : i + 1}</span>
        <span class="trail-item__body"><b>${escapeHtml(lesson.title)}</b><small>${status}</small></span>
        ${locked ? "" : icon("chevronRight", "chev")}
      </button>`;
  }).join("");

  el.querySelectorAll("[data-lesson]:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => openLesson(Number(btn.dataset.lesson)));
  });

  renderMedals();
}

function renderMedals(){
  const wrap = document.getElementById("trailMedals");
  if (!wrap) return;
  const got = lessons.filter(l => completedIds.has(l.id)).length;
  document.getElementById("trailMedalsCount").textContent = `${got} de ${lessons.length}`;
  wrap.innerHTML = lessons.map((l, i) => {
    const m = medalFor(i), done = completedIds.has(l.id);
    return `<div class="medal ${done ? "is-on" : ""}" title="${done ? m.name : "Conclua a lição " + (i + 1)}">
      <span class="medal__coin tile tile--${done ? m.tint : "gray"}">${icon(done ? m.icon : "lock")}</span>
      <small>${done ? m.name : "Lição " + (i + 1)}</small>
    </div>`;
  }).join("");

  const cert = document.getElementById("trailCert");
  const complete = lessons.length && got === lessons.length;
  cert.hidden = !complete;
}

function openLesson(id){
  currentLesson = lessons.find(l => l.id === id);
  selectedOption = null;
  renderLessonStep(false);
  document.getElementById("lessonModal").hidden = false;
}

function renderLessonStep(revealed){
  const box = document.getElementById("lessonModalBox");
  const lesson = currentLesson;

  const idx = lessons.findIndex(l => l.id === lesson.id);
  box.innerHTML = `
    <span class="badge badge-neutral">Lição ${idx + 1} de ${lessons.length}</span>
    <h3>${lesson.title}</h3>
    <p class="lesson-content">${lesson.content}</p>
    <p class="lesson-question">${lesson.question}</p>
    <div id="quizOpts"></div>
    <div id="quizActions" style="margin-top:14px; display:flex; flex-direction:column; gap:10px;"></div>`;

  const optsEl = box.querySelector("#quizOpts");
  lesson.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "lesson-quiz-opt";
    b.textContent = opt;
    if (revealed) {
      b.disabled = true;
      if (idx === lesson.correct) b.classList.add("is-correct");
      else if (idx === selectedOption) b.classList.add("is-wrong");
    } else {
      if (idx === selectedOption) b.classList.add("is-selected");
      b.addEventListener("click", () => { selectedOption = idx; renderLessonStep(false); });
    }
    optsEl.appendChild(b);
  });

  const actions = box.querySelector("#quizActions");
  if (!revealed) {
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-primary btn-block";
    confirmBtn.textContent = "Confirmar resposta";
    confirmBtn.disabled = selectedOption === null;
    confirmBtn.addEventListener("click", async () => {
      justEarned = selectedOption === lesson.correct && !completedIds.has(lesson.id);
      if (selectedOption === lesson.correct) await markCompleted(lesson.id);
      renderLessonStep(true);
    });
    actions.appendChild(confirmBtn);

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn-ghost btn-block";
    closeBtn.textContent = "Fechar";
    closeBtn.addEventListener("click", closeModal);
    actions.appendChild(closeBtn);
  } else {
    const isCorrect = selectedOption === lesson.correct;
    const msg = document.createElement("div");
    msg.className = `lesson-feedback ${isCorrect ? "is-good" : "is-bad"}`;
    msg.innerHTML = `${icon(isCorrect ? "check" : "info")}<div><b></b><span></span></div>`;
    msg.querySelector("b").textContent = isCorrect ? "Boa! Resposta certa." : "Não foi dessa vez.";
    msg.querySelector("span").textContent = lesson.explanation || (isCorrect ? "" : "A resposta certa está destacada acima.");
    actions.appendChild(msg);

    if (isCorrect && justEarned) {
      const m = medalFor(idx);
      const allDone = completedIds.size === lessons.length;
      const reward = document.createElement("div");
      reward.className = "reward";
      reward.innerHTML = `
        <div class="reward__confetti" aria-hidden="true">${"<i></i>".repeat(14)}</div>
        <span class="reward__coin tile tile--${m.tint}">${icon(m.icon)}</span>
        <div><small>${allDone ? "Trilha completa! Última medalha" : "Nova medalha desbloqueada"}</small><b>${m.name}</b></div>`;
      actions.insertBefore(reward, msg);
      justEarned = false;
    }

    if (!isCorrect) {
      const retryBtn = document.createElement("button");
      retryBtn.className = "btn btn-primary btn-block";
      retryBtn.textContent = "Tentar de novo";
      retryBtn.addEventListener("click", () => { selectedOption = null; renderLessonStep(false); });
      actions.appendChild(retryBtn);
    }

    const nextLesson = lessons[lessons.findIndex(l => l.id === lesson.id) + 1];
    const nextBtn = document.createElement("button");
    nextBtn.className = isCorrect ? "btn btn-primary btn-block" : "btn btn-outline btn-block";
    if (isCorrect && nextLesson) {
      nextBtn.textContent = "Próxima lição";
      nextBtn.addEventListener("click", () => openLesson(nextLesson.id));
    } else if (isCorrect) {
      nextBtn.textContent = "Ver meu certificado";
      nextBtn.addEventListener("click", () => { closeModal(); openCertificate(); });
    } else {
      nextBtn.textContent = "Fechar";
      nextBtn.addEventListener("click", closeModal);
    }
    actions.appendChild(nextBtn);
  }
}

function closeModal(){
  document.getElementById("lessonModal").hidden = true;
  renderTrail();
}

async function markCompleted(lessonId){
  completedIds.add(lessonId);
  await supabase.from("learning_progress").upsert(
    { user_id: state.user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" }
  );
}

// ---------- Certificado ----------
function certName(){ return (state.profile && state.profile.name) || "Estudante Finlenz"; }

export function openCertificate(){
  const box = document.getElementById("lessonModalBox");
  const date = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  box.innerHTML = `
    <div class="cert">
      <img src="assets/img/logo.png" alt="" class="cert__logo">
      <small class="cert__kicker">Certificado de conclusão</small>
      <b class="cert__name">${escapeHtml(certName())}</b>
      <p class="cert__text">concluiu as ${lessons.length} lições da Trilha de Educação Financeira do Finlenz.</p>
      <div class="cert__medals">${lessons.map((_, i) => `<span class="tile tile--${medalFor(i).tint}">${icon(medalFor(i).icon)}</span>`).join("")}</div>
      <small class="cert__date">${date}</small>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
      <button class="btn btn-primary btn-block" id="certDownload">${icon("download")}Baixar certificado</button>
      <button class="btn btn-ghost btn-block" id="certClose">Fechar</button>
    </div>`;
  document.getElementById("lessonModal").hidden = false;
  document.getElementById("certClose").addEventListener("click", closeModal);
  document.getElementById("certDownload").addEventListener("click", () => downloadCertificate(date));
}

function downloadCertificate(date){
  const W = 1600, H = 1000, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(W * 0.8, 0, 50, W * 0.8, 0, W);
  grad.addColorStop(0, "#26330a"); grad.addColorStop(0.5, "#101110"); grad.addColorStop(1, "#000");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(198,255,61,.5)"; g.lineWidth = 4; g.strokeRect(40, 40, W - 80, H - 80);
  g.textAlign = "center";
  const font = (w, s) => `${w} ${s}px -apple-system, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif`;
  g.fillStyle = "#C6FF3D"; g.font = font(600, 34); g.fillText("CERTIFICADO DE CONCLUSÃO", W / 2, 250);
  g.fillStyle = "#F5F5F7"; g.font = font(700, 92); g.fillText(certName(), W / 2, 400);
  g.fillStyle = "rgba(235,235,245,.7)"; g.font = font(400, 38);
  g.fillText(`concluiu as ${lessons.length} lições da Trilha de Educação Financeira`, W / 2, 490);
  g.fillText("do Finlenz · Tecnologia e educação financeira", W / 2, 545);
  const colors = { green: "#30D158", teal: "#40C8E0", blue: "#0A84FF", orange: "#FF9F0A", indigo: "#5E5CE6", pink: "#FF375F", purple: "#BF5AF2", lime: "#C6FF3D" };
  lessons.forEach((_, i) => {
    const x = W / 2 + (i - (lessons.length - 1) / 2) * 90;
    g.fillStyle = colors[medalFor(i).tint] || "#8E8E93";
    g.beginPath(); g.arc(x, 680, 30, 0, Math.PI * 2); g.fill();
  });
  g.fillStyle = "rgba(235,235,245,.55)"; g.font = font(400, 30); g.fillText(date, W / 2, 830);
  const done = () => {
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "certificado-finlenz.png";
    document.body.appendChild(a); a.click(); a.remove();
  };
  const logo = new Image();
  logo.onload = () => { g.drawImage(logo, W / 2 - 55, 90, 110, 105); done(); };
  logo.onerror = done;
  logo.src = "assets/img/logo.png";
}
