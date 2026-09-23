import { escapeHtml } from "./ui.js";

let terms = [];

export async function initGlossary(){
  terms = await fetch("data/glossary.json").then(r => r.json());
  terms.sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
  render(terms, "");

  document.getElementById("glossarySearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    render(terms.filter(t => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q)), q);
  });
}

function highlight(text, q){
  const safe = escapeHtml(text);
  if (!q) return safe;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function render(list, q){
  const el = document.getElementById("glossaryList");
  if (!list.length) {
    el.innerHTML = `<div class="card list__empty">Nenhum termo encontrado.</div>`;
    return;
  }
  // agrupa por letra inicial
  const groups = {};
  list.forEach(t => {
    const letter = t.term.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
    (groups[letter] ||= []).push(t);
  });
  el.innerHTML = Object.entries(groups).map(([letter, items]) => `
    <div>
      <p class="glossary-letter">${letter}</p>
      <div class="glossary-group">
        ${items.map(t => `<div class="glossary-item"><b>${highlight(t.term, q)}</b><p>${highlight(t.def, q)}</p></div>`).join("")}
      </div>
    </div>`).join("");
}
