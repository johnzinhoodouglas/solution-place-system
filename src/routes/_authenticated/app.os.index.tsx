import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETAPA_LABEL, STATUS_LABEL, STATUS_TONE, type OsEtapa, type OsStatus } from "@/lib/os";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/app/os/")({
  component: OsListPage,
});

type OsRow = {
  id: string;
  numero: string;
  etapa_atual: OsEtapa;
  status: OsStatus;
  data_entrada: string;
  data_prevista_entrega: string | null;
  nivel_blindagem: string | null;
  veiculo: { placa: string; marca: string; modelo: string; cliente_nome: string } | null;
};

function OsListPage() {
  const { roles } = useCurrentUser();
  const podeCriar =
    roles.includes("master") ||
    roles.includes("diretoria") ||
    roles.includes("recepcao") ||
    roles.includes("vendas");

  const [rows, setRows] = useState<OsRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero, etapa_atual, status, data_entrada, data_prevista_entrega, nivel_blindagem, veiculo:veiculos(placa, marca, modelo, cliente_nome)",
        )
        .order("created_at", { ascending: false });
      if (!error) setRows((data as OsRow[]) ?? []);
      setBusy(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.numero.toLowerCase().includes(s) ||
      r.veiculo?.placa.toLowerCase().includes(s) ||
      r.veiculo?.cliente_nome.toLowerCase().includes(s) ||
      r.veiculo?.modelo.toLowerCase().includes(s)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
            <p className="text-sm text-muted-foreground">
              Todos os veículos em processo — da entrada até a entrega.
            </p>
          </div>
        </div>
        {podeCriar && (
          <Button asChild>
            <Link to="/app/os/nova">
              <Plus className="mr-2 h-4 w-4" /> Nova OS
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Lista</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, placa, cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Etapa atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-mono font-semibold">
                      <Link to="/app/os/$id" params={{ id: r.id }} className="hover:text-primary">
                        {r.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.veiculo ? (
                        <div>
                          <div className="font-medium">
                            {r.veiculo.marca} {r.veiculo.modelo}
                          </div>
                          <div className="text-xs text-muted-foreground">{r.veiculo.placa}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.veiculo?.cliente_nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {ETAPA_LABEL[r.etapa_atual]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_TONE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.data_entrada).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Nenhuma OS encontrada.
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
