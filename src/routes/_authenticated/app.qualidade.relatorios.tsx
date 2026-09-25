import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileBarChart, FileText, Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
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
import { NC_SEV_LABEL, NC_STATUS_LABEL, type NcSeveridade, type NcStatus } from "@/lib/qsms";
import { INSPECAO_TIPO_LABEL, INSPECAO_RESULTADO_LABEL } from "@/lib/producao";
import { abrirDocumentoImpressao, escapeHtml } from "@/lib/print-doc";

export const Route = createFileRoute("/_authenticated/app/qualidade/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios de Conformidade ISO 9001 | Solution Place" },
      {
        name: "description",
        content:
          "Relatórios periódicos de conformidade ISO 9001:2015 com NCs, inspeções, prazos, responsáveis e indicadores por setor.",
      },
      { property: "og:title", content: "Relatórios de Conformidade ISO 9001 — Solution Place" },
      { property: "og:description", content: "Indicadores de qualidade por setor e período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelatoriosPage,
});

type Nc = {
  id: string;
  numero: string;
  titulo: string;
  setor: string | null;
  severidade: NcSeveridade;
  status: NcStatus;
  data_abertura: string;
  data_fechamento: string | null;
  prazo: string | null;
  responsavel_id: string | null;
};
type Insp = {
  id: string;
  numero: string | null;
  tipo: keyof typeof INSPECAO_TIPO_LABEL;
  resultado: keyof typeof INSPECAO_RESULTADO_LABEL;
  data_inspecao: string;
  prazo: string | null;
  inspetor_nome: string | null;
};
type Acao = { nc_id: string; status: string; aprovacao_status: string; when_prazo: string | null };

const FECHADAS: NcStatus[] = ["resolvida", "verificada", "fechada"];
const hoje = () => new Date().toISOString().slice(0, 10);

function periodoPadrao(p: string): [string, string] {
  const d = new Date();
  const fim = hoje();
  if (p === "mes") return [new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), fim];
  if (p === "trimestre")
    return [new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString().slice(0, 10), fim];
  if (p === "semestre")
    return [new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1).toISOString().slice(0, 10), fim];
  return [new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10), fim];
}

function RelatoriosPage() {
  const [periodo, setPeriodo] = useState("mes");
  const [[de, ate], setIntervalo] = useState<[string, string]>(periodoPadrao("mes"));
  const [ncs, setNcs] = useState<Nc[]>([]);
  const [insp, setInsp] = useState<Insp[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const fim = ate + "T23:59:59";
      const [n, i, p] = await Promise.all([
        supabase
          .from("nao_conformidades")
          .select("id, numero, titulo, setor, severidade, status, data_abertura, data_fechamento, prazo, responsavel_id")
          .gte("data_abertura", de)
          .lte("data_abertura", fim)
          .order("data_abertura"),
        supabase
          .from("inspecoes")
          .select("id, numero, tipo, resultado, data_inspecao, prazo, inspetor_nome")
          .gte("data_inspecao", de)
          .lte("data_inspecao", fim)
          .order("data_inspecao"),
        supabase.from("profiles").select("id, nome, email"),
      ]);
      const lista = (n.data as Nc[]) ?? [];
      setNcs(lista);
      setInsp((i.data as Insp[]) ?? []);
      setNomes(Object.fromEntries(((p.data ?? []) as { id: string; nome: string | null; email: string }[]).map((x) => [x.id, x.nome ?? x.email])));
      if (lista.length) {
        const { data: a } = await supabase
          .from("acoes_corretivas")
          .select("nc_id, status, aprovacao_status, when_prazo")
          .in("nc_id", lista.map((x) => x.id));
        setAcoes((a as Acao[]) ?? []);
      } else setAcoes([]);
      setBusy(false);
    })();
  }, [de, ate]);

  const ind = useMemo(() => {
    const t = hoje();
    const abertas = ncs.filter((n) => !FECHADAS.includes(n.status));
    const vencidas = abertas.filter((n) => n.prazo && n.prazo < t);
    const fechadas = ncs.filter((n) => n.data_fechamento);
    const noPrazo = fechadas.filter((n) => !n.prazo || n.data_fechamento!.slice(0, 10) <= n.prazo);
    const tempoMedio = fechadas.length
      ? fechadas.reduce((s, n) => s + (new Date(n.data_fechamento!).getTime() - new Date(n.data_abertura).getTime()) / 864e5, 0) / fechadas.length
      : 0;
    const aprov = insp.filter((i) => i.resultado === "aprovado" || i.resultado === "aprovado_condicional").length;
    const inspPend = insp.filter((i) => i.resultado === "pendente");
    const setores = new Map<string, { total: number; abertas: number; vencidas: number; criticas: number; fechadas: number }>();
    for (const n of ncs) {
      const k = n.setor || "Não informado";
      const s = setores.get(k) ?? { total: 0, abertas: 0, vencidas: 0, criticas: 0, fechadas: 0 };
      s.total++;
      if (FECHADAS.includes(n.status)) s.fechadas++;
      else s.abertas++;
      if (!FECHADAS.includes(n.status) && n.prazo && n.prazo < t) s.vencidas++;
      if (n.severidade === "critica" || n.severidade === "alta") s.criticas++;
      setores.set(k, s);
    }
    return {
      total: ncs.length,
      abertas: abertas.length,
      vencidas: vencidas.length,
      fechadas: fechadas.length,
      pctPrazo: fechadas.length ? Math.round((noPrazo.length / fechadas.length) * 100) : 0,
      tempoMedio,
      inspTotal: insp.length,
      pctAprov: insp.length ? Math.round((aprov / insp.length) * 100) : 0,
      inspPend: inspPend.length,
      acoesAprov: acoes.filter((a) => a.aprovacao_status === "aprovada").length,
      acoesTotal: acoes.length,
      setores: [...setores.entries()].sort((a, b) => b[1].total - a[1].total),
    };
  }, [ncs, insp, acoes]);

  const fmt = (d: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00" : d).toLocaleDateString("pt-BR") : "—");

  function gerarPdf() {
    const t = hoje();
    abrirDocumentoImpressao(
      `Relatório de Conformidade ISO 9001 ${de} a ${ate}`,
      `<h1>Relatório de Conformidade — ISO 9001:2015</h1>
      <p class="sub">Período: ${fmt(de)} a ${fmt(ate)} · Cláusulas 8.6, 8.7, 9.1 e 10.2</p>
      <h2>Indicadores gerais</h2>
      <div class="grid">
        <p class="kv"><b>NCs no período:</b> ${ind.total}</p>
        <p class="kv"><b>NCs em aberto:</b> ${ind.abertas}</p>
        <p class="kv"><b>NCs vencidas:</b> ${ind.vencidas}</p>
        <p class="kv"><b>NCs encerradas:</b> ${ind.fechadas}</p>
        <p class="kv"><b>Encerradas no prazo:</b> ${ind.pctPrazo}%</p>
        <p class="kv"><b>Tempo médio de tratamento:</b> ${ind.tempoMedio.toFixed(1)} dias</p>
        <p class="kv"><b>Inspeções realizadas:</b> ${ind.inspTotal}</p>
        <p class="kv"><b>Taxa de aprovação:</b> ${ind.pctAprov}%</p>
        <p class="kv"><b>Inspeções pendentes:</b> ${ind.inspPend}</p>
        <p class="kv"><b>Ações aprovadas pela Diretoria:</b> ${ind.acoesAprov} de ${ind.acoesTotal}</p>
      </div>
      <h2>Indicadores por setor</h2>
      <table><thead><tr><th>Setor</th><th>Total</th><th>Abertas</th><th>Vencidas</th><th>Alta/Crítica</th><th>Encerradas</th></tr></thead><tbody>
      ${ind.setores.map(([k, s]) => `<tr><td>${escapeHtml(k)}</td><td>${s.total}</td><td>${s.abertas}</td><td>${s.vencidas}</td><td>${s.criticas}</td><td>${s.fechadas}</td></tr>`).join("") || '<tr><td colspan="6">Sem registros</td></tr>'}
      </tbody></table>
      <h2>Não conformidades</h2>
      <table><thead><tr><th>Nº</th><th>Título</th><th>Setor</th><th>Severidade</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Encerramento</th></tr></thead><tbody>
      ${ncs.map((n) => `<tr><td>${escapeHtml(n.numero)}</td><td>${escapeHtml(n.titulo)}</td><td>${escapeHtml(n.setor ?? "—")}</td><td>${NC_SEV_LABEL[n.severidade]}</td><td>${NC_STATUS_LABEL[n.status]}${!FECHADAS.includes(n.status) && n.prazo && n.prazo < t ? " (vencida)" : ""}</td><td>${escapeHtml(n.responsavel_id ? (nomes[n.responsavel_id] ?? "—") : "—")}</td><td>${fmt(n.prazo)}</td><td>${fmt(n.data_fechamento)}</td></tr>`).join("") || '<tr><td colspan="8">Sem registros</td></tr>'}
      </tbody></table>
      <h2>Inspeções</h2>
      <table><thead><tr><th>Nº</th><th>Tipo</th><th>Data</th><th>Inspetor</th><th>Resultado</th><th>Prazo</th></tr></thead><tbody>
      ${insp.map((i) => `<tr><td>${escapeHtml(i.numero ?? "")}</td><td>${INSPECAO_TIPO_LABEL[i.tipo]}</td><td>${fmt(i.data_inspecao)}</td><td>${escapeHtml(i.inspetor_nome ?? "—")}</td><td>${INSPECAO_RESULTADO_LABEL[i.resultado]}</td><td>${fmt(i.prazo)}</td></tr>`).join("") || '<tr><td colspan="6">Sem registros</td></tr>'}
      </tbody></table>
      <div class="assin"><div>Gestor da Qualidade</div><div>Diretoria</div></div>`,
    );
  }

  function exportarCsv() {
    const linhas = [
      ["Tipo", "Número", "Título/Tipo", "Setor", "Severidade/Resultado", "Status", "Responsável", "Data", "Prazo", "Encerramento"],
      ...ncs.map((n) => ["NC", n.numero, n.titulo, n.setor ?? "", NC_SEV_LABEL[n.severidade], NC_STATUS_LABEL[n.status], n.responsavel_id ? (nomes[n.responsavel_id] ?? "") : "", fmt(n.data_abertura), fmt(n.prazo), fmt(n.data_fechamento)]),
      ...insp.map((i) => ["Inspeção", i.numero ?? "", INSPECAO_TIPO_LABEL[i.tipo], "", INSPECAO_RESULTADO_LABEL[i.resultado], "", i.inspetor_nome ?? "", fmt(i.data_inspecao), fmt(i.prazo), ""]),
    ];
    const csv = "\uFEFF" + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `conformidade-iso9001-${de}-a-${ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    ["NCs no período", ind.total],
    ["Em aberto", ind.abertas],
    ["Vencidas", ind.vencidas],
    ["Encerradas no prazo", `${ind.pctPrazo}%`],
    ["Tempo médio", `${ind.tempoMedio.toFixed(1)} d`],
    ["Inspeções", ind.inspTotal],
    ["Aprovação inspeções", `${ind.pctAprov}%`],
    ["Inspeções pendentes", ind.inspPend],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Conformidade ISO 9001</h1>
            <p className="text-sm text-muted-foreground">
              NCs, inspeções, prazos, responsáveis e indicadores por setor (cláusulas 9.1 e 10.2).
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={gerarPdf} disabled={busy}>
            <FileText className="mr-2 h-4 w-4" /> Gerar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select
              value={periodo}
              onValueChange={(v) => {
                setPeriodo(v);
                if (v !== "personalizado") setIntervalo(periodoPadrao(v));
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês atual</SelectItem>
                <SelectItem value="trimestre">Trimestre atual</SelectItem>
                <SelectItem value="semestre">Semestre atual</SelectItem>
                <SelectItem value="ano">Ano atual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={de} onChange={(e) => { setPeriodo("personalizado"); setIntervalo([e.target.value, ate]); }} />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={ate} onChange={(e) => { setPeriodo("personalizado"); setIntervalo([de, e.target.value]); }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map(([k, v]) => (
          <Card key={k}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-2xl font-bold">{busy ? "…" : v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores por setor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Abertas</TableHead>
                <TableHead className="text-right">Vencidas</TableHead>
                <TableHead className="text-right">Alta/Crítica</TableHead>
                <TableHead className="text-right">Encerradas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ind.setores.map(([k, s]) => (
                <TableRow key={k}>
                  <TableCell>{k}</TableCell>
                  <TableCell className="text-right">{s.total}</TableCell>
                  <TableCell className="text-right">{s.abertas}</TableCell>
                  <TableCell className="text-right text-destructive">{s.vencidas}</TableCell>
                  <TableCell className="text-right">{s.criticas}</TableCell>
                  <TableCell className="text-right">{s.fechadas}</TableCell>
                </TableRow>
              ))}
              {ind.setores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhuma NC no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
