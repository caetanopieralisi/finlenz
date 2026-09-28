import { formatBRL, formatDateShort } from "./state.js";
import { icon, categoryMeta } from "./icons.js";
import { escapeHtml } from "./ui.js";

// Categorias com cor própria (mesma ordem sempre: a cor segue a categoria).
export const CAT_COLORS = {
  "Moradia": "#5FA8A0", "Alimentação": "#D29B4E", "Transporte": "#6E93D6", "Lazer": "#A983C6",
  "Educação": "#8B8CD8", "Saúde": "#C96B7E", "Outros": "#8A8D93", "Renda": "#7DBE72",
};

export function txRowHTML(tx, { deletable = false, showDate = true } = {}){
  const meta = categoryMeta(tx.category);
  const isIn = tx.type === "income";
  return `
    <li class="tx" data-id="${tx.id}">
      <span class="tile tile--${meta.tint}">${icon(meta.icon)}</span>
      <span class="tx__body"><span class="tx__title">${escapeHtml(tx.description)}</span><span class="tx__meta">${escapeHtml(tx.category)}${showDate ? " · " + formatDateShort(tx.date) : ""}</span></span>
      <span class="tx__amount ${isIn ? "in" : "out"}">${isIn ? "+" : "−"}${formatBRL(tx.amount)}</span>
      ${deletable ? `<button class="tx__del" data-del="${tx.id}" aria-label="Excluir ${escapeHtml(tx.description)}">${icon("trash")}</button>` : ""}
    </li>`;
}

