// Conjunto de ícones em SVG (traço arredondado, estilo SF Symbols).
// Uso: icon("house") devolve a string <svg>. Tamanho vem do CSS (1em).
const P = {
  house: '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v10.5h13V9"/><path d="M10 19.5v-5h4v5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  trend: '<path d="M4 17l5-5 3.5 3.5L20 8"/><path d="M15 8h5v5"/>',
  bars: '<path d="M5 20V13M10 20V8M15 20v-5M20 20V5"/>',
  book: '<path d="M4 5.5c2.5-1 5.5-1 8 .8 2.5-1.8 5.5-1.8 8-.8v13c-2.5-1-5.5-1-8 .8-2.5-1.8-5.5-1.8-8-.8z"/><path d="M12 6.3v13.5"/>',
  text: '<path d="M6 4.5h9l3 3v12H6z"/><path d="M9 11h6M9 14.5h6M9 8h3"/>',
  bubble: '<path d="M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4.5 19.5l1.2-3.6C4.6 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"/><circle cx="12" cy="12" r="7"/>',
  logout: '<path d="M14 4.5H6.5v15H14"/><path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5"/>',
  chevronLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  chevronRight: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  menu: '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
  trash: '<path d="M5 7h14M10 4h4M7 7l.8 12.5h8.4L17 7"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5"/><circle cx="12" cy="16.6" r=".6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".6" fill="currentColor"/>',
  arrowUp: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
  arrowDown: '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 9.5h17M15.5 14h2"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 20.5l5-2.5 5 2.5-1.5-7"/>',
  shield: '<path d="M12 3.5 5 6.5v5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9v-5z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z"/>',
  lens: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M8 9a3 3 0 0 1 3-2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  flame: '<path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.5-2.6-5.4-3.8-8.7-.3 2.2-1.5 3.6-2.7 4.2C11.7 8 10 5.8 9.6 3.5 7.6 6 6 9.1 6 12.2 6 17.5 8.4 21 12 21z"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  // categorias
  food: '<path d="M7 3.5v7M5 3.5v4.5a2 2 0 0 0 4 0V3.5M7 10.5v10"/><path d="M16.5 20.5v-17c-2 1-3 3.5-3 6.5 0 1.7.9 2.5 3 2.5"/>',
  bus: '<rect x="5" y="4" width="14" height="13" rx="2.5"/><path d="M5 11h14M8 17v2.5M16 17v2.5"/><circle cx="8.5" cy="14" r=".7" fill="currentColor"/><circle cx="15.5" cy="14" r=".7" fill="currentColor"/>',
  fun: '<path d="M7 9h10a3.5 3.5 0 0 1 3.4 4.3l-.8 3.3a2 2 0 0 1-3.4.9L14.5 15.5h-5l-1.7 2a2 2 0 0 1-3.4-.9l-.8-3.3A3.5 3.5 0 0 1 7 9z"/><path d="M8 11.5v2.5M6.8 12.8h2.4"/>',
  cap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.5 1.3 3.5 2 5.5 2s4-.7 5.5-2v-4"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10a4 4 0 0 1 7.5-2 4 4 0 0 1 7.5 2c0 5.6-7.5 10-7.5 10z"/>',
  cash: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  dots: '<circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="12" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><circle cx="15.5" cy="12" r=".6" fill="currentColor"/>',
};

export function icon(name, cls = ""){
  const d = P[name] || P.dots;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

// Categoria -> ícone e tom
export const CATEGORY_META = {
  "Alimentação": { icon: "food", tint: "orange" },
  "Transporte": { icon: "bus", tint: "blue" },
  "Lazer": { icon: "fun", tint: "purple" },
  "Moradia": { icon: "house", tint: "teal" },
  "Educação": { icon: "cap", tint: "indigo" },
  "Saúde": { icon: "heart", tint: "pink" },
  "Renda": { icon: "cash", tint: "green" },
  "Outros": { icon: "dots", tint: "gray" },
};
export function categoryMeta(cat){ return CATEGORY_META[cat] || CATEGORY_META["Outros"]; }

// Substitui <i data-icon="nome"></i> por SVG em todo o documento.
export function hydrateIcons(root = document){
  root.querySelectorAll("[data-icon]").forEach(el => {
    if (el.dataset.hydrated) return;
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.hydrated = "1";
  });
}
