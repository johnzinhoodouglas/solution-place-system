import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeIntervir, SETORES } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/metas")({
  head: () => ({
    meta: [
      { title: "Metas por Setor — KPIs dos Gestores | Solution Place" },
      { name: "description", content: "Metas mensais por setor com OS, NCs, prazos e produtividade, KPIs e gráficos de desempenho." },
      { property: "og:title", content: "Metas por Setor — Solution Place" },
      { property: "og:description", content: "Acompanhamento do desempenho dos gestores por setor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MetasPage,
});

const ETAPA_SETOR: Record<string, string> = {
  recepcao: "recepcao", engenharia: "engenharia", desmontagem: "producao", blindagem: "producao",
  montagem: "producao", acabamento: "producao", qualidade: "qualidade", entrega: "entrega",
};
type Meta = { setor: string; meta_os: number; max_ncs: number; pct_prazo: number; meta_horas: number };
type Real = { os: number; ncs: number; fechadas: number; noPrazo: number; horas: number };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function setorSlug(txt: string | null) {
  if (!txt) return null;
  const t = norm(txt);
  return SETORES.find((s) => t.includes(s.slug) || norm(s.label).includes(t))?.slug ?? null;
}

function MetasPage() {
  const { roles } = useCurrentUser();
  const gestor = podeIntervir(roles);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [real, setReal] = useState<Record<string, Real>>({});

  useEffect(() => {
    (async () => {
      const ini = `${mes}-01`;
      const d = new Date(ini + "T12:00"); d.setMonth(d.getMonth() + 1);
      const fim = d.toISOString().slice(0, 10);
      const [m, t, n, a] = await Promise.all([
        supabase.from("metas_setor").select("setor, meta_os, max_ncs, pct_prazo, meta_horas").eq("mes", ini),
        supabase.from("os_timeline").select("etapa_de").eq("evento", "avanco_etapa").gte("created_at", ini).lt("created_at", fim),
        supabase.from("nao_conformidades").select("setor, prazo, data_fechamento").gte("data_abertura", ini).lt("data_abertura", fim),
        supabase.from("producao_apontamentos").select("horas").gte("data_execucao", ini).lt("data_execucao", fim),
      ]);
      setMetas(Object.fromEntries(((m.data ?? []) as Meta[]).map((x) => [x.setor, x])));
      const r: Record<string, Real> = {};
      const get = (k: string) => (r[k] ??= { os: 0, ncs: 0, fechadas: 0, noPrazo: 0, horas: 0 });
      for (const x of t.data ?? []) { const k = x.etapa_de && ETAPA_SETOR[x.etapa_de]; if (k) get(k).os++; }
      for (const x of n.data ?? []) {
        const k = setorSlug(x.setor); if (!k) continue;
        const s = get(k); s.ncs++;
        if (x.data_fechamento) { s.fechadas++; if (!x.prazo || x.data_fechamento.slice(0, 10) <= x.prazo) s.noPrazo++; }
      }
      get("producao").horas = (a.data ?? []).reduce((s, x) => s + Number(x.horas ?? 0), 0);
      setReal(r);
    })();
  }, [mes]);

  const linhas = useMemo(() => SETORES.map((s) => {
    const m = metas[s.slug] ?? { setor: s.slug, meta_os: 0, max_ncs: 0, pct_prazo: 90, meta_horas: 0 };
    const r = real[s.slug] ?? { os: 0, ncs: 0, fechadas: 0, noPrazo: 0, horas: 0 };
    const pct = r.fechadas ? Math.round((r.noPrazo / r.fechadas) * 100) : 100;
    const checks = [m.meta_os ? r.os >= m.meta_os : true, r.ncs <= m.max_ncs || !m.max_ncs, pct >= m.pct_prazo, m.meta_horas ? r.horas >= m.meta_horas : true];
    return { s, m, r, pct, atingimento: Math.round((checks.filter(Boolean).length / 4) * 100) };
  }), [metas, real]);

  async function salvarMeta(slug: string, campo: keyof Meta, valor: number) {
    const atual = metas[slug] ?? { setor: slug, meta_os: 0, max_ncs: 0, pct_prazo: 90, meta_horas: 0 };
    const nova = { ...atual, [campo]: valor };
    setMetas({ ...metas, [slug]: nova });
    const { error } = await supabase.from("metas_setor").upsert({ ...nova, mes: `${mes}-01` }, { onConflict: "setor,mes" });
    if (error) toast.error(error.message);
  }

  const geral = linhas.length ? Math.round(linhas.reduce((s, l) => s + l.atingimento, 0) / linhas.length) : 0;
  const totalOs = linhas.reduce((s, l) => s + l.r.os, 0);
  const totalNcs = linhas.reduce((s, l) => s + l.r.ncs, 0);
  const chart = linhas.filter((l) => l.m.meta_os || l.r.os || l.r.ncs || l.m.max_ncs).map((l) => ({
    setor: l.s.label.split(" ")[0], "OS real": l.r.os, "OS meta": l.m.meta_os, "NCs": l.r.ncs, "NCs máx.": l.m.max_ncs,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Metas por setor</h1>
            <p className="text-sm text-muted-foreground">OS processadas, NCs, cumprimento de prazos e produtividade (ISO 9001 — 6.2 e 9.1).</p>
          </div>
        </div>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Atingimento geral", `${geral}%`], ["OS avançadas no mês", totalOs], ["NCs abertas no mês", totalNcs], ["Horas produtivas", real.producao?.horas ?? 0]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Real x meta por setor</CardTitle></CardHeader>
        <CardContent className="h-72">
          {chart.length === 0 ? <p className="text-sm text-muted-foreground">Defina metas ou registre movimentações para ver o gráfico.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="setor" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Legend />
                <Bar dataKey="OS real" fill="var(--primary)" />
                <Bar dataKey="OS meta" fill="var(--muted-foreground)" />
                <Bar dataKey="NCs" fill="var(--destructive)" />
                <Bar dataKey="NCs máx." fill="var(--warning)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Painel de metas {gestor && <span className="text-xs font-normal text-muted-foreground">(edite os campos de meta)</span>}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead>OS (real / meta)</TableHead>
                <TableHead>NCs (real / máx.)</TableHead>
                <TableHead>No prazo (real / meta %)</TableHead>
                <TableHead>Horas (real / meta)</TableHead>
                <TableHead>Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ s, m, r, pct, atingimento }) => {
                const campo = (k: keyof Meta) => gestor
                  ? <Input type="number" min={0} defaultValue={m[k] as number} key={mes + s.slug + k} className="h-8 w-20" onBlur={(e) => Number(e.target.value) !== m[k] && salvarMeta(s.slug, k, Number(e.target.value))} />
                  : <span>{m[k]}</span>;
                return (
                  <TableRow key={s.slug}>
                    <TableCell className="text-sm">{s.label}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><b>{r.os}</b>/{campo("meta_os")}</div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><b className={m.max_ncs && r.ncs > m.max_ncs ? "text-destructive" : ""}>{r.ncs}</b>/{campo("max_ncs")}</div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><b className={pct < m.pct_prazo ? "text-destructive" : ""}>{pct}%</b>/{campo("pct_prazo")}</div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><b>{r.horas}</b>/{campo("meta_horas")}</div></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={atingimento >= 75 ? "bg-success/15 text-success border-success/40" : atingimento >= 50 ? "bg-warning/15 text-warning border-warning/40" : "bg-destructive/15 text-destructive border-destructive/40"}>{atingimento}%</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
