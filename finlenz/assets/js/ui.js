// Pequenos componentes de interface: aviso (toast) e confirmação em folha.
import { icon } from "./icons.js";

let toastTimer;
export function toast(message, kind = "ok"){
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.innerHTML = `${icon(kind === "error" ? "info" : "check")}<span></span>`;
  el.querySelector("span").textContent = message;
  el.dataset.kind = kind;
  el.classList.remove("is-visible");
  void el.offsetWidth;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
}

// Folha de confirmação no estilo iOS. Resolve true/false.
export function confirmSheet({ title, message = "", confirmText = "Confirmar", destructive = false }){
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "sheet-backdrop";
    wrap.innerHTML = `
      <div class="action-sheet" role="alertdialog" aria-modal="true">
        <div class="action-sheet__group">
          <div class="action-sheet__head"><b></b><p></p></div>
          <button class="action-sheet__btn ${destructive ? "is-destructive" : ""}" data-ok></button>
        </div>
        <button class="action-sheet__btn action-sheet__cancel" data-cancel>Cancelar</button>
      </div>`;
    wrap.querySelector("b").textContent = title;
    wrap.querySelector("p").textContent = message;
    wrap.querySelector("[data-ok]").textContent = confirmText;
    document.body.appendChild(wrap);
    const done = (v) => { wrap.classList.add("is-leaving"); setTimeout(() => wrap.remove(), 200); resolve(v); };
    wrap.addEventListener("click", (e) => { if (e.target === wrap) done(false); });
    wrap.querySelector("[data-ok]").addEventListener("click", () => done(true));
    wrap.querySelector("[data-cancel]").addEventListener("click", () => done(false));
  });
}

export function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Anima um número (R$) até o valor final.
export function animateNumber(el, to, format, duration = 650){
  const from = Number(el.dataset.value || 0);
  el.dataset.value = to;
  el.textContent = format(to); // valor final garantido, mesmo se a animação não rodar
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || from === to || document.hidden || !window.requestAnimationFrame) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = format(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
