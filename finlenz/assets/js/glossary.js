let terms = [];

export async function initGlossary(){
  terms = await fetch("data/glossary.json").then(r => r.json());
  terms.sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
  render(terms);

  document.getElementById("glossarySearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    render(terms.filter(t => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q)));
  });
}

function render(list){
  const el = document.getElementById("glossaryList");
  el.innerHTML = list.length
    ? list.map(t => `<div class="glossary-item"><b>${t.term}</b><p>${t.def}</p></div>`).join("")
    : `<p class="muted">Nenhum termo encontrado.</p>`;
}
