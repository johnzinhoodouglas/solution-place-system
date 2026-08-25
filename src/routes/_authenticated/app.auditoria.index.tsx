import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Download, FilterX, ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeIntervir } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/auditoria/")({
  component: AuditoriaPage,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
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

const POR_PAGINA = 25;

function camposAlterados(log: Log): string[] {
  if (log.acao === "insert" || !log.antes) return [];
  const antes = log.antes ?? {};
  const depois = log.depois ?? {};
  return Object.keys(depois).filter(
    (k) =>
      !["updated_at", "created_at"].includes(k) &&
      JSON.stringify(antes[k]) !== JSON.stringify(depois[k]),
  );
}

function diff(log: Log): string {
  const campos = camposAlterados(log);
  if (campos.length === 0) return "—";
  return campos
    .slice(0, 4)
    .map((k) => `${k}: ${String(log.antes?.[k] ?? "∅")} → ${String(log.depois?.[k] ?? "∅")}`)
    .join(" · ");
}

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function AuditoriaPage() {
  const { roles, loading } = useCurrentUser();
  const autorizado = podeIntervir(roles);

  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [pagina, setPagina] = useState(0);

  const [tabela, setTabela] = useState("todas");
  const [acao, setAcao] = useState("todas");
  const [autor, setAutor] = useState("");
  const [osBusca, setOsBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const [oss, setOss] = useState<{ id: string; numero: string }[]>([]);
  const [autores, setAutores] = useState<string[]>([]);

  useEffect(() => {
    if (!autorizado) return;
    (async () => {
      const [o, a] = await Promise.all([
        supabase.from("ordens_servico").select("id, numero").order("numero"),
        supabase.from("audit_log").select("autor_nome").limit(1000),
      ]);
      setOss((o.data as { id: string; numero: string }[]) ?? []);
      const nomes = new Set<string>();
      ((a.data as { autor_nome: string | null }[]) ?? []).forEach((r) => {
        if (r.autor_nome) nomes.add(r.autor_nome);
      });
      setAutores([...nomes].sort());
    })();
  }, [autorizado]);

  const idsOs = useMemo(() => {
    const q = osBusca.trim().toLowerCase();
    if (!q) return null;
    return oss.filter((o) => o.numero.toLowerCase().includes(q)).map((o) => o.id);
  }, [osBusca, oss]);

  const montarQuery = useCallback(
    (comContagem: boolean) => {
      let q = supabase
        .from("audit_log")
        .select(
          "id, tabela, registro_id, acao, antes, depois, autor_nome, created_at",
          comContagem ? { count: "exact" } : undefined,
        )
        .order("created_at", { ascending: false });

      if (tabela !== "todas") q = q.eq("tabela", tabela);
      if (acao !== "todas") q = q.eq("acao", acao);
      if (autor.trim()) q = q.ilike("autor_nome", `%${autor.trim()}%`);
      if (de) q = q.gte("created_at", new Date(`${de}T00:00:00`).toISOString());
      if (ate) q = q.lte("created_at", new Date(`${ate}T23:59:59`).toISOString());
      if (idsOs) q = q.in("registro_id", idsOs.length > 0 ? idsOs : ["00000000-0000-0000-0000-000000000000"]);
      return q;
    },
    [tabela, acao, autor, de, ate, idsOs],
  );

  useEffect(() => {
    if (!autorizado) return;
    let ativo = true;
    setBusy(true);
    (async () => {
      const { data, count, error } = await montarQuery(true).range(
        pagina * POR_PAGINA,
        pagina * POR_PAGINA + POR_PAGINA - 1,
      );
      if (!ativo) return;
      if (error) toast.error(error.message);
      setLogs((data as Log[]) ?? []);
      setTotal(count ?? 0);
      setBusy(false);
    })();
    return () => {
      ativo = false;
    };
  }, [autorizado, montarQuery, pagina]);

  useEffect(() => {
    setPagina(0);
  }, [tabela, acao, autor, osBusca, de, ate]);

  function limpar() {
    setTabela("todas");
    setAcao("todas");
    setAutor("");
    setOsBusca("");
    setDe("");
    setAte("");
  }

  async function exportar() {
    const { data, error } = await montarQuery(false).limit(5000);
    if (error) {
      toast.error(`Falha ao exportar: ${error.message}`);
      return;
    }
    const linhas = (data as Log[]) ?? [];
    if (linhas.length === 0) {
      toast.error("Nenhum evento para exportar com os filtros atuais.");
      return;
    }
    const cabecalho = ["Quando", "Módulo", "Ação", "Autor", "Registro", "Alterações"];
    const csv = [
      cabecalho.join(";"),
      ...linhas.map((l) =>
        [
          new Date(l.created_at).toLocaleString("pt-BR"),
          TABELA_LABEL[l.tabela] ?? l.tabela,
          ACAO_LABEL[l.acao] ?? l.acao,
          l.autor_nome ?? "Sistema",
          l.registro_id ?? "",
          diff(l),
        ]
          .map((c) => csvCell(String(c)))
          .join(";"),
      ),
    ].join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${linhas.length} evento(s) exportado(s).`);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!autorizado) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O log de auditoria é exclusivo da Diretoria e do Master.
        </p>
      </div>
    );
  }

  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Log de auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Rastreabilidade de quem criou, alterou ou excluiu registros — evidência para auditorias
            ISO 9001:2015 (cláusula 7.5).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros avançados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Módulo</Label>
            <Select value={tabela} onValueChange={setTabela}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {Object.keys(TABELA_LABEL).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TABELA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de evento</Label>
            <Select value={acao} onValueChange={setAcao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {Object.keys(ACAO_LABEL).map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACAO_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Usuário</Label>
            <Input
              list="autores-auditoria"
              placeholder="Nome do autor"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
            />
            <datalist id="autores-auditoria">
              {autores.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ordem de serviço</Label>
            <Input
              placeholder="Ex.: OS-000012"
              value={osBusca}
              onChange={(e) => setOsBusca(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex gap-2 md:col-span-3 lg:col-span-6">
            <Button variant="outline" size="sm" onClick={limpar}>
              <FilterX className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
            <Button variant="outline" size="sm" onClick={exportar}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{total} evento(s) encontrado(s)</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagina === 0 || busy}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Página {total === 0 ? 0 : pagina + 1} de {total === 0 ? 0 : ultimaPagina + 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagina >= ultimaPagina || busy}
              onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{TABELA_LABEL[l.tabela] ?? l.tabela}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          l.acao === "delete" ? "border-destructive/40 text-destructive" : undefined
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
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Nenhum evento encontrado com os filtros atuais.
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
