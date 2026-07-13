import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

let lessons = [];
let completedIds = new Set();

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
  const lesson = lessons.find(l => l.id === id);
  const modal = document.getElementById("lessonModal");
  const box = document.getElementById("lessonModalBox");

  box.innerHTML = `
    <h3>${lesson.title}</h3>
    <p class="muted" style="margin:12px 0;">${lesson.content}</p>
    <p style="font-weight:700; margin-bottom:10px;">${lesson.question}</p>
    <div id="quizOpts"></div>
    <button class="btn btn-outline btn-block" id="closeLessonBtn" style="margin-top:10px;">Fechar</button>`;

  const optsEl = box.querySelector("#quizOpts");
  lesson.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "lesson-quiz-opt";
    b.textContent = opt;
    b.addEventListener("click", async () => {
      optsEl.querySelectorAll("button").forEach(o => o.disabled = true);
      if (idx === lesson.correct) {
        b.classList.add("is-correct");
        await markCompleted(lesson.id);
      } else {
        b.classList.add("is-wrong");
        optsEl.children[lesson.correct].classList.add("is-correct");
      }
    });
    optsEl.appendChild(b);
  });

  box.querySelector("#closeLessonBtn").addEventListener("click", closeModal);
  modal.hidden = false;
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
