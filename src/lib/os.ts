import type { Database } from "@/integrations/supabase/types";

export type OsEtapa = Database["public"]["Enums"]["os_etapa"];
export type OsStatus = Database["public"]["Enums"]["os_status"];
export type OsEvento = Database["public"]["Enums"]["os_evento"];

export const ETAPAS_ORDEM: OsEtapa[] = [
  "recepcao",
  "engenharia",
  "desmontagem",
  "blindagem",
  "montagem",
  "acabamento",
  "qualidade",
  "entrega",
  "concluida",
];

export const ETAPA_LABEL: Record<OsEtapa, string> = {
  recepcao: "Recepção",
  engenharia: "Engenharia / Projeto",
  desmontagem: "Desmontagem",
  blindagem: "Blindagem",
  montagem: "Montagem",
  acabamento: "Acabamento",
  qualidade: "Qualidade / Inspeção",
  entrega: "Entrega",
  concluida: "Concluída",
};

export const STATUS_LABEL: Record<OsStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_TONE: Record<OsStatus, string> = {
  aberta: "bg-primary/15 text-primary border-primary/40",
  em_andamento: "bg-accent/15 text-accent border-accent/40",
  pausada: "bg-warning/15 text-warning border-warning/40",
  concluida: "bg-success/15 text-success border-success/40",
  cancelada: "bg-destructive/15 text-destructive border-destructive/40",
};

export const EVENTO_LABEL: Record<OsEvento, string> = {
  criacao: "OS criada",
  avanco_etapa: "Avanço de etapa",
  retorno_etapa: "Retorno de etapa",
  nota: "Nota",
  intervencao_diretoria: "Intervenção da Diretoria",
  nao_conformidade: "Não conformidade",
  anexo: "Anexo",
  pausa: "Pausa",
  retomada: "Retomada",
  conclusao: "Conclusão",
  cancelamento: "Cancelamento",
};

export function proximaEtapa(atual: OsEtapa): OsEtapa | null {
  const i = ETAPAS_ORDEM.indexOf(atual);
  if (i < 0 || i >= ETAPAS_ORDEM.length - 1) return null;
  return ETAPAS_ORDEM[i + 1];
}

export function etapaAnterior(atual: OsEtapa): OsEtapa | null {
  const i = ETAPAS_ORDEM.indexOf(atual);
  if (i <= 0) return null;
  return ETAPAS_ORDEM[i - 1];
}
