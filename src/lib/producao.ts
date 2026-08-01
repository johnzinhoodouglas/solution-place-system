import type { Database } from "@/integrations/supabase/types";

export type SetorProducao = Database["public"]["Enums"]["setor_producao"];
export type ApontamentoStatus = Database["public"]["Enums"]["apontamento_status"];
export type InspecaoTipo = Database["public"]["Enums"]["inspecao_tipo"];
export type InspecaoResultado = Database["public"]["Enums"]["inspecao_resultado"];
export type SugestaoStatus = Database["public"]["Enums"]["sugestao_status"];
export type TreinamentoTipo = Database["public"]["Enums"]["treinamento_tipo"];

export interface SubSetorDef {
  slug: SetorProducao;
  label: string;
  descricao: string;
  escopos: string[];
  /** código do procedimento ISO relacionado */
  procedimento: string;
}

export const SUB_SETORES: SubSetorDef[] = [
  {
    slug: "aco",
    label: "Aço",
    descricao: "Estrutura, teto, barras de porta e reforços em aço balístico.",
    escopos: [
      "Estrutura",
      "Churrasqueiras",
      "Teto",
      "Barras de porta",
      "Tampa traseira",
      "Capô",
      "Paralamas",
      "Corta-fogo",
    ],
    procedimento: "PO-PRO-01",
  },
  {
    slug: "manta",
    label: "Manta Aramida",
    descricao: "Aplicação de manta balística com sobreposição conforme projeto.",
    escopos: [
      "Estrutura",
      "Portas",
      "Tampa traseira",
      "Paralamas",
      "Corta-fogo",
      "Teto",
      "Colunas",
    ],
    procedimento: "PO-PRO-02",
  },
  {
    slug: "vidros",
    label: "Vidros",
    descricao: "Vidros balísticos, overlap, vigia e teto solar.",
    escopos: [
      "Parabrisa",
      "Vidros das portas",
      "Vigia",
      "Overlap",
      "Teto solar",
      "Basculantes",
    ],
    procedimento: "PO-PRO-03",
  },
  {
    slug: "montagem",
    label: "Montagem",
    descricao: "Remontagem de forrações, elétrica, bancos e acabamentos.",
    escopos: [
      "Forrações",
      "Bancos",
      "Painéis",
      "Elétrica",
      "Vedação",
      "Acabamentos",
      "Testes funcionais",
    ],
    procedimento: "PO-PRO-04",
  },
  {
    slug: "acabamento",
    label: "Acabamento",
    descricao: "Retoques finais, ajustes e vedações.",
    escopos: ["Retoques", "Ajustes de folga", "Vedação", "Revisão visual"],
    procedimento: "PO-PRO-04",
  },
  {
    slug: "limpeza_envelopamento",
    label: "Limpeza / Envelopamento",
    descricao: "Limpeza técnica, polimento e envelopamento antes da entrega.",
    escopos: [
      "Lavagem externa",
      "Limpeza interna",
      "Polimento",
      "Envelopamento",
      "Inspeção final",
    ],
    procedimento: "PO-PRO-05",
  },
];

export const SUB_SETOR_MAP = Object.fromEntries(
  SUB_SETORES.map((s) => [s.slug, s]),
) as Record<SetorProducao, SubSetorDef>;

export const APONTAMENTO_STATUS_LABEL: Record<ApontamentoStatus, string> = {
  em_execucao: "Em execução",
  concluido: "Concluído",
  pronto_limpeza: "Pronto p/ limpeza",
  reprovado: "Reprovado",
  retrabalho: "Retrabalho",
};

export const APONTAMENTO_STATUS_TONE: Record<ApontamentoStatus, string> = {
  em_execucao: "bg-primary/15 text-primary border-primary/40",
  concluido: "bg-success/15 text-success border-success/40",
  pronto_limpeza: "bg-accent/15 text-accent border-accent/40",
  reprovado: "bg-destructive/15 text-destructive border-destructive/40",
  retrabalho: "bg-warning/15 text-warning border-warning/40",
};

export const INSPECAO_TIPO_LABEL: Record<InspecaoTipo, string> = {
  recebimento: "Recebimento de material",
  entrada: "Entrada do veículo",
  saida: "Saída do veículo",
  processo: "Inspeção de processo",
};

export const INSPECAO_RESULTADO_LABEL: Record<InspecaoResultado, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  aprovado_condicional: "Aprovado condicional",
  reprovado: "Reprovado",
};

export const INSPECAO_RESULTADO_TONE: Record<InspecaoResultado, string> = {
  pendente: "bg-muted text-muted-foreground border-border",
  aprovado: "bg-success/15 text-success border-success/40",
  aprovado_condicional: "bg-warning/15 text-warning border-warning/40",
  reprovado: "bg-destructive/15 text-destructive border-destructive/40",
};

export const SUGESTAO_STATUS_LABEL: Record<SugestaoStatus, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  em_implantacao: "Em implantação",
  implantada: "Implantada",
  recusada: "Recusada",
  duplicada: "Duplicada",
};

export const SUGESTAO_STATUS_TONE: Record<SugestaoStatus, string> = {
  nova: "bg-primary/15 text-primary border-primary/40",
  em_analise: "bg-warning/15 text-warning border-warning/40",
  aprovada: "bg-accent/15 text-accent border-accent/40",
  em_implantacao: "bg-primary/15 text-primary border-primary/40",
  implantada: "bg-success/15 text-success border-success/40",
  recusada: "bg-destructive/15 text-destructive border-destructive/40",
  duplicada: "bg-muted text-muted-foreground border-border",
};

export const TREINAMENTO_TIPO_LABEL: Record<TreinamentoTipo, string> = {
  lideranca: "Liderança",
  gestao_pessoal: "Gestão pessoal",
  tecnico: "Técnico",
  seguranca: "Segurança",
  iso_9001: "ISO 9001:2015",
  integracao: "Integração",
};

/** Checklists padrão de inspeção (ISO 9001:2015 — 8.5.1 / 8.6). */
export const CHECKLIST_PADRAO: Record<InspecaoTipo, string[]> = {
  entrada: [
    "Lataria sem avarias não registradas",
    "Vidros originais íntegros",
    "Interior limpo e sem danos",
    "Painel: luzes de advertência",
    "Pneus e rodas",
    "Acessórios e pertences conferidos",
    "Documentação do veículo",
    "Chaves entregues (qtd.)",
  ],
  saida: [
    "Blindagem conforme nível especificado",
    "Vidros com acionamento e vedação OK",
    "Portas e travas funcionando",
    "Elétrica 100% funcional",
    "Acabamento interno sem falhas",
    "Limpeza técnica concluída",
    "Envelopamento sem bolhas (se aplicável)",
    "Termo de entrega assinado",
  ],
  recebimento: [
    "NF conferida com pedido de compra",
    "Quantidade recebida correta",
    "Embalagem íntegra",
    "Certificado / laudo do lote anexado",
    "Validade do material dentro do prazo",
    "Identificação e rastreabilidade do lote",
    "Material sem oxidação / delaminação",
  ],
  processo: [
    "Execução conforme projeto de engenharia",
    "Sobreposição (overlap) conforme especificação",
    "Sem vãos ou frestas balísticas",
    "Fixações e soldas conformes",
    "Área de trabalho organizada (5S)",
    "EPIs em uso pela equipe",
  ],
};

export function podeGerirProducao(roles: string[]) {
  return (
    roles.includes("producao") ||
    roles.includes("engenharia") ||
    roles.includes("qualidade") ||
    roles.includes("diretoria") ||
    roles.includes("master")
  );
}

export function podeGerirRh(roles: string[]) {
  return roles.includes("diretoria") || roles.includes("master") || roles.includes("qualidade");
}
