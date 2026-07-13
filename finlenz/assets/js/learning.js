import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

let lessons = [];
let completedIds = new Set();
let currentLesson = null;
let selectedOption = null;

export async function initLearning(){
  lessons = await fetch("data/lessons.json").then(r => r.json());
  await loadProgress();
  renderTrail();

  document.getElementById("lessonModal").addEventListener("click", (e) => {
    if (e.target.id === "lessonModal") closeModal();
  });
}

async function loadProgress(){
  const { data } = await supabase.from("learning_progress").select("lesson_id").eq("user_id", state.user.id).eq("completed", true);
  completedIds = new Set((data || []).map(r => r.lesson_id));
}

function renderTrail(){
  const fill = document.getElementById("trailProgressFill");
  const label = document.getElementById("trailProgressLabel");
  const pct = lessons.length ? Math.round((completedIds.size / lessons.length) * 100) : 0;
  fill.style.width = `${pct}%`;
  label.textContent = `${completedIds.size} de ${lessons.length} concluídas`;

  const el = document.getElementById("learningTrail");
  el.innerHTML = lessons.map((lesson, i) => {
    const done = completedIds.has(lesson.id);
    const locked = !done && i > 0 && !completedIds.has(lessons[i - 1].id);
    const cls = done ? "is-done" : locked ? "is-locked" : "";
    return `
      <button class="trail-item ${cls}" data-lesson="${lesson.id}" ${locked ? "disabled" : ""}>
        <span class="trail-item__badge">${done ? "✓" : i + 1}</span>
        <span class="trail-item__body"><b>${lesson.title}</b><small>${done ? "Concluída" : locked ? "Bloqueada" : "Toque para começar"}</small></span>
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

  box.innerHTML = `
    <span class="badge badge-income">Lição</span>
    <h3 style="margin-top:10px;">${lesson.title}</h3>
    <p class="muted" style="margin:12px 0;">${lesson.content}</p>
    <p style="font-weight:700; margin-bottom:10px;">${lesson.question}</p>
    <div id="quizOpts"></div>
    <div id="quizActions" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;"></div>`;

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
    closeBtn.className = "btn btn-outline btn-block";
    closeBtn.textContent = "Fechar";
    closeBtn.addEventListener("click", closeModal);
    actions.appendChild(closeBtn);
  } else {
    const isCorrect = selectedOption === lesson.correct;
    const msg = document.createElement("p");
    msg.className = "muted";
    msg.style.marginBottom = "4px";
    msg.textContent = isCorrect ? "Boa! Resposta certa." : "Não foi dessa vez. A resposta certa está destacada acima.";
    actions.appendChild(msg);

    if (lesson.explanation) {
      const exp = document.createElement("p");
      exp.className = "muted small";
      exp.textContent = lesson.explanation;
      actions.appendChild(exp);
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
    nextBtn.className = "btn btn-outline btn-block";
    if (isCorrect && nextLesson) {
      nextBtn.textContent = "Próxima lição »";
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
