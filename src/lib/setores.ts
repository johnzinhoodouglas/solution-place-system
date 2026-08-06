import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  ShoppingCart,
  ShoppingBag,
  Factory,
  ShieldCheck,
  DollarSign,
  HardHat,
  FileText,
  TrendingUp,
  Truck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AppRole =
  | "master"
  | "diretoria"
  | "qualidade"
  | "engenharia"
  | "vendas"
  | "compras"
  | "financeiro"
  | "producao"
  | "seguranca"
  | "fiscal"
  | "recepcao";

export const ROLE_LABEL: Record<AppRole, string> = {
  master: "Master (Manutenção)",
  diretoria: "Diretoria",
  qualidade: "Qualidade",
  engenharia: "Engenharia",
  vendas: "Vendas",
  compras: "Compras",
  financeiro: "Financeiro",
  producao: "Produção",
  seguranca: "Segurança do Trabalho",
  fiscal: "Fiscal / Estatutário",
  recepcao: "Recepção",
};

export interface SetorDef {
  slug: string;
  label: string;
  descricao: string;
  icon: LucideIcon;
  /** Papéis com acesso a este setor. master e diretoria têm acesso a tudo. */
  roles: AppRole[];
  /** Etapa anterior no fluxograma (para leitura interligada). */
  origem?: string;
  /** Próxima etapa no fluxograma. */
  destino?: string;
}

export const SETORES: SetorDef[] = [
  {
    slug: "recepcao",
    label: "Recepção de Veículos",
    descricao: "Entrada, checklist e abertura de OS.",
    icon: Truck,
    roles: ["recepcao"],
    destino: "engenharia",
  },
  {
    slug: "engenharia",
    label: "Engenharia",
    descricao: "Projeto, especificações e BOM.",
    icon: Wrench,
    roles: ["engenharia"],
    origem: "recepcao",
    destino: "compras",
  },
  {
    slug: "vendas",
    label: "Vendas",
    descricao: "Orçamentos, contratos e pipeline.",
    icon: ShoppingCart,
    roles: ["vendas"],
    destino: "financeiro",
  },
  {
    slug: "compras",
    label: "Compras",
    descricao: "Fornecedores, cotações e pedidos.",
    icon: ShoppingBag,
    roles: ["compras"],
    origem: "engenharia",
    destino: "producao",
  },
  {
    slug: "producao",
    label: "Produção",
    descricao: "Desmontagem, blindagem, montagem, acabamento e testes.",
    icon: Factory,
    roles: ["producao"],
    origem: "compras",
    destino: "qualidade",
  },
  {
    slug: "qualidade",
    label: "Qualidade (ISO 9001:2015)",
    descricao: "Inspeções, não conformidades e ações corretivas.",
    icon: ShieldCheck,
    roles: ["qualidade"],
    origem: "producao",
    destino: "entrega",
  },
  {
    slug: "seguranca",
    label: "Segurança do Trabalho",
    descricao: "EPIs, ergonomia, incidentes e DDS.",
    icon: HardHat,
    roles: ["seguranca"],
  },
  {
    slug: "financeiro",
    label: "Financeiro",
    descricao: "Contas a pagar/receber, fluxo de caixa.",
    icon: DollarSign,
    roles: ["financeiro"],
    origem: "vendas",
  },
  {
    slug: "fiscal",
    label: "Fiscal / Estatutário",
    descricao: "Notas fiscais e obrigações regulatórias.",
    icon: FileText,
    roles: ["fiscal"],
  },
  {
    slug: "melhoria",
    label: "Melhoria Contínua (PDCA)",
    descricao: "Indicadores, sugestões e planos de ação.",
    icon: TrendingUp,
    roles: ["qualidade"],
  },
  {
    slug: "entrega",
    label: "Entrega ao Cliente",
    descricao: "Checklist final e termo de entrega.",
    icon: ClipboardList,
    roles: ["qualidade", "recepcao"],
    origem: "qualidade",
  },
];

export const SETOR_MAP = Object.fromEntries(SETORES.map((s) => [s.slug, s]));

export const NAV_TOP = [{ slug: "", label: "Dashboard Geral", icon: LayoutDashboard }];

export const NAV_ADMIN = [
  { slug: "usuarios", label: "Usuários & Papéis", icon: Users },
  { slug: "sistema", label: "Sistema", icon: Settings },
];

/** Um usuário com esses papéis pode acessar um dado setor. */
export function podeAcessarSetor(userRoles: AppRole[], setor: SetorDef): boolean {
  if (userRoles.includes("master") || userRoles.includes("diretoria")) return true;
  return setor.roles.some((r) => userRoles.includes(r));
}

/** Master e diretoria podem intervir em qualquer etapa. */
export function podeIntervir(userRoles: AppRole[]): boolean {
  return userRoles.includes("master") || userRoles.includes("diretoria");
}
