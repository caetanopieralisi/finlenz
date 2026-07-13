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

export const TOOLS = [
  { id: "hourvalue", icon: "◷", title: "Valor-hora", desc: "Compra em horas de trabalho" },
  { id: "dreams", icon: "◎", title: "Custo dos sonhos", desc: "Quanto isso atrasa seu sonho" },
  { id: "forecast", icon: "↗", title: "Previsão", desc: "Seu dinheiro nos próximos meses" },
  { id: "investments", icon: "▲", title: "Investimentos", desc: "Simule onde guardar seu dinheiro" },
  { id: "learning", icon: "▣", title: "Trilha", desc: "Aprenda finanças na prática" },
  { id: "glossary", icon: "▤", title: "Glossário", desc: "Termos do mundo financeiro" },
  { id: "mentor", icon: "◈", title: "Mentoria", desc: "Tire suas dúvidas" },
];
