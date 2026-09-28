import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, ArrowLeft, Award } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TREINAMENTO_TIPO_LABEL, type TreinamentoTipo } from "@/lib/producao";

export const Route = createFileRoute("/_authenticated/app/rh/concluidos")({
  head: () => ({
    meta: [
      { title: "Treinamentos Concluídos por Colaborador | Solution Place" },
      { name: "description", content: "Histórico de treinamentos concluídos por colaborador com data, carga horária e certificado." },
      { property: "og:title", content: "Treinamentos Concluídos — Solution Place" },
      { property: "og:description", content: "Desenvolvimento de competências por setor (ISO 9001 — 7.2)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConcluidosPage,
});

type Row = {
  id: string; colaborador_nome: string; presente: boolean; certificado: boolean; nota: number | null;
  colaboradores: { setor: string | null } | null;
  treinamentos: { titulo: string; tipo: TreinamentoTipo; carga_horaria: number; data_realizada: string | null; data_prevista: string | null } | null;
};

function ConcluidosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState("todos");

  useEffect(() => {
    supabase
      .from("treinamento_participantes")
      .select("id, colaborador_nome, presente, certificado, nota, colaboradores(setor), treinamentos(titulo, tipo, carga_horaria, data_realizada, data_prevista)")
      .eq("presente", true)
      .then(({ data }) => setRows(((data as unknown as Row[]) ?? []).filter((r) => r.treinamentos?.data_realizada)));
  }, []);

  const setores = [...new Set(rows.map((r) => r.colaboradores?.setor || "Sem setor"))].sort();
  const filtradas = rows.filter(
    (r) => (setor === "todos" || (r.colaboradores?.setor || "Sem setor") === setor) &&
      r.colaborador_nome.toLowerCase().includes(busca.toLowerCase()),
  );

  const porColab = useMemo(() => {
    const m = new Map<string, { setor: string; itens: Row[]; horas: number; certs: number }>();
    for (const r of filtradas) {
      const s = m.get(r.colaborador_nome) ?? { setor: r.colaboradores?.setor || "Sem setor", itens: [], horas: 0, certs: 0 };
      s.itens.push(r);
      s.horas += Number(r.treinamentos?.carga_horaria ?? 0);
      if (r.certificado) s.certs++;
      m.set(r.colaborador_nome, s);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtradas]);

  const fmt = (d?: string | null) => (d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "—");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Treinamentos concluídos por colaborador</h1>
            <p className="text-sm text-muted-foreground">Data de realização, carga horária e certificados para acompanhar o desenvolvimento dos setores.</p>
          </div>
        </div>
        <Button variant="outline" asChild><Link to="/app/rh"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao RH</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Colaboradores treinados", porColab.length], ["Treinamentos concluídos", filtradas.length],
          ["Horas de treinamento", filtradas.reduce((s, r) => s + Number(r.treinamentos?.carga_horaria ?? 0), 0)],
          ["Certificados", filtradas.filter((r) => r.certificado).length]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar colaborador..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={setor} onValueChange={setSetor}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {porColab.length === 0 && <p className="text-sm text-muted-foreground">Nenhum treinamento concluído com presença registrada.</p>}
      {porColab.map(([nome, c]) => (
        <Card key={nome}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{nome} <span className="text-xs font-normal text-muted-foreground">· {c.setor}</span></CardTitle>
            <div className="flex gap-2 text-xs"><Badge variant="outline">{c.horas}h</Badge><Badge variant="outline"><Award className="mr-1 h-3 w-3" />{c.certs} certificado(s)</Badge></div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Treinamento</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Carga</TableHead><TableHead className="text-right">Nota</TableHead><TableHead>Certificado</TableHead></TableRow></TableHeader>
              <TableBody>
                {c.itens.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.treinamentos?.titulo}</TableCell>
                    <TableCell className="text-xs">{r.treinamentos ? TREINAMENTO_TIPO_LABEL[r.treinamentos.tipo] : ""}</TableCell>
                    <TableCell className="text-xs">{fmt(r.treinamentos?.data_realizada)}</TableCell>
                    <TableCell className="text-right text-xs">{Number(r.treinamentos?.carga_horaria ?? 0)}h</TableCell>
                    <TableCell className="text-right text-xs">{r.nota ?? "—"}</TableCell>
                    <TableCell>{r.certificado ? <Badge variant="outline" className="bg-success/15 text-success border-success/40">Emitido</Badge> : <Badge variant="outline">Pendente</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
