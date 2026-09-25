import type { Database } from "@/integrations/supabase/types";

export type NcOrigem = Database["public"]["Enums"]["nc_origem"];
export type NcSeveridade = Database["public"]["Enums"]["nc_severidade"];
export type NcStatus = Database["public"]["Enums"]["nc_status"];
export type AcaoStatus = Database["public"]["Enums"]["acao_status"];
export type IncidenteTipo = Database["public"]["Enums"]["incidente_tipo"];
export type IncidenteGravidade = Database["public"]["Enums"]["incidente_gravidade"];

export const NC_ORIGEM_LABEL: Record<NcOrigem, string> = {
  auditoria_interna: "Auditoria interna",
  auditoria_externa: "Auditoria externa",
  producao: "Produção",
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  inspecao: "Inspeção",
  outro: "Outro",
};

export const NC_SEV_LABEL: Record<NcSeveridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const NC_SEV_TONE: Record<NcSeveridade, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-primary/15 text-primary border-primary/40",
  alta: "bg-warning/15 text-warning border-warning/40",
  critica: "bg-destructive/15 text-destructive border-destructive/40",
};

export const NC_STATUS_LABEL: Record<NcStatus, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  em_acao: "Em ação",
  resolvida: "Resolvida",
  verificada: "Verificada",
  fechada: "Fechada",
};

export const NC_STATUS_TONE: Record<NcStatus, string> = {
  aberta: "bg-destructive/15 text-destructive border-destructive/40",
  em_analise: "bg-warning/15 text-warning border-warning/40",
  em_acao: "bg-primary/15 text-primary border-primary/40",
  resolvida: "bg-accent/15 text-accent border-accent/40",
  verificada: "bg-success/15 text-success border-success/40",
  fechada: "bg-muted text-muted-foreground border-border",
};

export const ACAO_STATUS_LABEL: Record<AcaoStatus, string> = {
  planejada: "Planejada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  verificada: "Verificada",
  cancelada: "Cancelada",
};

export const ACAO_STATUS_TONE: Record<AcaoStatus, string> = {
  planejada: "bg-muted text-muted-foreground border-border",
  em_execucao: "bg-primary/15 text-primary border-primary/40",
  concluida: "bg-accent/15 text-accent border-accent/40",
  verificada: "bg-success/15 text-success border-success/40",
  cancelada: "bg-destructive/15 text-destructive border-destructive/40",
};

export const INC_TIPO_LABEL: Record<IncidenteTipo, string> = {
  quase_acidente: "Quase acidente",
  primeiros_socorros: "Primeiros socorros",
  com_afastamento: "Com afastamento",
  sem_afastamento: "Sem afastamento",
  ambiental: "Ambiental",
  patrimonial: "Patrimonial",
};

export const INC_GRAV_LABEL: Record<IncidenteGravidade, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
  gravissima: "Gravíssima",
};

export const INC_GRAV_TONE: Record<IncidenteGravidade, string> = {
  leve: "bg-muted text-muted-foreground border-border",
  moderada: "bg-primary/15 text-primary border-primary/40",
  grave: "bg-warning/15 text-warning border-warning/40",
  gravissima: "bg-destructive/15 text-destructive border-destructive/40",
};

export function podeGerirQualidade(roles: string[]) {
  return roles.includes("qualidade") || roles.includes("diretoria") || roles.includes("master");
}

export function podeGerirSeguranca(roles: string[]) {
  return roles.includes("seguranca") || roles.includes("diretoria") || roles.includes("master");
}

export const APROV_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Aguardando Diretoria",
  ajustes: "Ajustes solicitados",
  aprovada: "Aprovada",
};

export const APROV_TONE: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviada: "bg-primary/15 text-primary border-primary/40",
  ajustes: "bg-warning/15 text-warning border-warning/40",
  aprovada: "bg-success/15 text-success border-success/40",
  concluida: "bg-success/15 text-success border-success/40",
  reaberta: "bg-destructive/15 text-destructive border-destructive/40",
};

export const DECISAO_LABEL: Record<string, string> = {
  enviada: "Enviada para aprovação",
  aprovada: "Ação aprovada",
  ajustes: "Ajustes solicitados",
  concluida: "NC concluída",
  reaberta: "NC reaberta",
};
