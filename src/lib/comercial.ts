import type { AppRole } from "./setores";

export type OrcamentoStatus = "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado" | "convertido";
export type ContratoStatus = "ativo" | "concluido" | "cancelado" | "suspenso";
export type PedidoCompraStatus = "rascunho" | "aprovado" | "enviado" | "parcial" | "recebido" | "cancelado";
export type NfTipo = "entrada" | "saida";
export type NfStatus = "emitida" | "autorizada" | "cancelada" | "denegada";
export type TituloStatus = "aberto" | "pago" | "parcial" | "vencido" | "cancelado";

export const ORC_STATUS_LABEL: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado",
  recusado: "Recusado", expirado: "Expirado", convertido: "Convertido",
};
export const ORC_STATUS_TONE: Record<OrcamentoStatus, string> = {
  rascunho: "border-muted-foreground/40 text-muted-foreground",
  enviado: "border-primary/40 text-primary",
  aprovado: "border-success/40 text-success",
  recusado: "border-destructive/40 text-destructive",
  expirado: "border-warning/40 text-warning",
  convertido: "border-success/40 text-success",
};

export const CT_STATUS_LABEL: Record<ContratoStatus, string> = {
  ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado", suspenso: "Suspenso",
};

export const PC_STATUS_LABEL: Record<PedidoCompraStatus, string> = {
  rascunho: "Rascunho", aprovado: "Aprovado", enviado: "Enviado",
  parcial: "Recebido parcial", recebido: "Recebido", cancelado: "Cancelado",
};

export const NF_TIPO_LABEL: Record<NfTipo, string> = { entrada: "Entrada", saida: "Saída" };
export const NF_STATUS_LABEL: Record<NfStatus, string> = {
  emitida: "Emitida", autorizada: "Autorizada", cancelada: "Cancelada", denegada: "Denegada",
};

export const TITULO_STATUS_LABEL: Record<TituloStatus, string> = {
  aberto: "Em aberto", pago: "Pago", parcial: "Parcial", vencido: "Vencido", cancelado: "Cancelado",
};
export const TITULO_STATUS_TONE: Record<TituloStatus, string> = {
  aberto: "border-primary/40 text-primary",
  pago: "border-success/40 text-success",
  parcial: "border-warning/40 text-warning",
  vencido: "border-destructive/40 text-destructive",
  cancelado: "border-muted-foreground/40 text-muted-foreground",
};

const has = (r: AppRole[], x: AppRole) => r.includes(x);
export const podeGerirVendas = (r: AppRole[]) => has(r,"vendas") || has(r,"diretoria") || has(r,"master");
export const podeGerirCompras = (r: AppRole[]) => has(r,"compras") || has(r,"diretoria") || has(r,"master");
export const podeGerirFinanceiro = (r: AppRole[]) => has(r,"financeiro") || has(r,"diretoria") || has(r,"master");
export const podeGerirFiscal = (r: AppRole[]) => has(r,"fiscal") || has(r,"diretoria") || has(r,"master");

export function brl(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
