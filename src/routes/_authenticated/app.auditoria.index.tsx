import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeIntervir } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/auditoria/")({
  component: AuditoriaPage,
  errorComponent: ({ error }) => (
    <p className="text-sm text-destructive">{error.message}</p>
  ),
});

type Log = {
  id: string;
  tabela: string;
  registro_id: string | null;
  acao: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  autor_nome: string | null;
  created_at: string;
};

const TABELA_LABEL: Record<string, string> = {
  ordens_servico: "Ordens de serviço",
  nao_conformidades: "Não conformidades",
  inspecoes: "Inspeções",
  contas_pagar: "Contas a pagar",
  contas_receber: "Contas a receber",
  notas_fiscais: "Notas fiscais",
  sugestoes_melhoria: "Sugestões de melhoria",
  sucata_movimentos: "Recicláveis / sucata",
};

const ACAO_LABEL: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Exclusão",
};

function diff(log: Log): string {
  if (log.acao === "insert" || !log.antes) return "—";
  const antes = log.antes ?? {};
  const depois = log.depois ?? {};
  const campos = Object.keys(depois).filter(
    (k) =>
      !["updated_at", "created_at"].includes(k) &&
      JSON.stringify(antes[k]) !== JSON.stringify(depois[k]),
  );
  if (campos.length === 0) return "—";
  return campos
    .slice(0, 4)
    .map((k) => `${k}: ${String(antes[k] ?? "∅")} → ${String(depois[k] ?? "∅")}`)
    .join(" · ");
}

function AuditoriaPage() {
  const { roles, loading } = useCurrentUser();
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(true);
  const [tabela, setTabela] = useState("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, tabela, registro_id, acao, antes, depois, autor_nome, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs((data as Log[]) ?? []);
      setBusy(false);
    })();
  }, []);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (tabela === "todas" || l.tabela === tabela) &&
        (q === "" ||
          (l.autor_nome ?? "").toLowerCase().includes(q) ||
          (l.registro_id ?? "").includes(q)),
    );
  }, [logs, tabela, busca]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!podeIntervir(roles)) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O log de auditoria é exclusivo da Diretoria e do Master.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Log de auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Rastreabilidade de quem criou, alterou ou excluiu registros — evidência para
            auditorias ISO 9001:2015 (cláusula 7.5).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            Últimos eventos ({lista.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por autor ou ID"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-56"
            />
            <Select value={tabela} onValueChange={setTabela}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os módulos</SelectItem>
                {Object.keys(TABELA_LABEL).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TABELA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Alterações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {TABELA_LABEL[l.tabela] ?? l.tabela}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          l.acao === "delete"
                            ? "border-destructive/40 text-destructive"
                            : undefined
                        }
                      >
                        {ACAO_LABEL[l.acao] ?? l.acao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.autor_nome ?? "Sistema"}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {diff(l)}
                    </TableCell>
                  </TableRow>
                ))}
                {lista.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Nenhum evento registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
