export const state = {
  user: null,
  profile: null,
};

export function formatBRL(value){
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

// Rótulo curto e humano para datas: "Hoje", "Ontem", "12 de set."
export function formatDateShort(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export const TOOLS = [
  { id: "hourvalue", icon: "clock", tint: "orange", title: "Valor-hora", desc: "Compra em horas de trabalho" },
  { id: "installments", icon: "card", tint: "red", title: "Parcelado ou à vista?", desc: "Os juros escondidos na parcela" },
  { id: "dreams", icon: "target", tint: "pink", title: "Custo dos sonhos", desc: "Quanto isso atrasa seu sonho" },
  { id: "forecast", icon: "trend", tint: "green", title: "Previsão", desc: "Seu dinheiro nos próximos meses" },
  { id: "investments", icon: "bars", tint: "blue", title: "Investimentos", desc: "Simule onde guardar seu dinheiro" },
  { id: "learning", icon: "book", tint: "indigo", title: "Trilha", desc: "Aprenda finanças na prática" },
  { id: "glossary", icon: "text", tint: "teal", title: "Glossário", desc: "Termos do mundo financeiro" },
  { id: "mentor", icon: "bubble", tint: "purple", title: "Mentoria", desc: "Tire suas dúvidas" },
];
