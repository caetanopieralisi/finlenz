import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { icon } from "./icons.js";
import { escapeHtml } from "./ui.js";
import { get } from "./store.js";

let lessons = [];
let completedIds = new Set();
let currentLesson = null;
let selectedOption = null;

export async function initLearning(){
  // lições (arquivo estático) e progresso (banco) em paralelo
  const [ls] = await Promise.all([fetch("data/lessons.json").then(r => r.json()), loadProgress()]);
  lessons = ls;
  renderTrail();

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
      nextBtn.textContent = "Concluir trilha";
      nextBtn.addEventListener("click", closeModal);
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
