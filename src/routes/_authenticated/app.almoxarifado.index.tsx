import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Warehouse, Plus, ArrowDownUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { brl, podeGerirCompras } from "@/lib/comercial";

export const Route = createFileRoute("/_authenticated/app/almoxarifado/")({
  head: () => ({
    meta: [
      { title: "Almoxarifado — Solution Place" },
      { name: "description", content: "Estoque de insumos com reposição automática via Compras." },
    ],
  }),
  component: AlmoxPage,
});

type Insumo = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  unidade: string;
  estoque: number;
  estoque_minimo: number;
  qtd_reposicao: number;
  custo_unitario: number;
  fornecedor_id: string | null;
  localizacao: string | null;
};
type Forn = { id: string; nome: string };

const vazio = {
  codigo: "",
  nome: "",
  categoria: "",
  unidade: "un",
  estoque: "0",
  estoque_minimo: "0",
  qtd_reposicao: "0",
  custo_unitario: "0",
  fornecedor_id: "",
  localizacao: "",
};

function AlmoxPage() {
  const { roles, profile } = useCurrentUser();
  const pode = podeGerirCompras(roles);
  const podeMov = pode || roles.includes("producao");
  const [itens, setItens] = useState<Insumo[]>([]);
  const [forns, setForns] = useState<Forn[]>([]);
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<Insumo | null>(null);
  const [openNovo, setOpenNovo] = useState(false);
  const [mov, setMov] = useState<Insumo | null>(null);

  async function load() {
    const [{ data: i }, { data: f }] = await Promise.all([
      supabase.from("insumos").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("id, nome").order("nome"),
    ]);
    setItens((i as Insumo[]) ?? []);
    setForns((f as Forn[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const baixo = (x: Insumo) => x.estoque_minimo > 0 && x.estoque <= x.estoque_minimo;
  const semMin = itens.filter((x) => x.estoque_minimo <= 0).length;
  const filtrados = itens.filter((x) =>
    `${x.nome} ${x.codigo ?? ""} ${x.categoria ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const valorTotal = itens.reduce((s, x) => s + x.estoque * x.custo_unitario, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Warehouse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Almoxarifado</h1>
            <p className="text-sm text-muted-foreground">
              Estoque de insumos. Abaixo do mínimo, um pedido de compra é gerado automaticamente.
            </p>
          </div>
        </div>
        {pode && (
          <Dialog open={openNovo} onOpenChange={setOpenNovo}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo insumo
              </Button>
            </DialogTrigger>
            <InsumoForm
              forns={forns}
              onSaved={() => {
                setOpenNovo(false);
                load();
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Insumos" value={String(itens.length)} />
        <Kpi label="Abaixo do mínimo" value={String(itens.filter(baixo).length)} alert />
        <Kpi label="Sem mínimo definido" value={String(semMin)} />
        <Kpi label="Valor em estoque" value={brl(valorTotal)} />
      </div>

      {semMin > 0 && (
        <p className="flex items-center gap-2 text-xs text-warning">
          <AlertTriangle className="h-4 w-4" />
          {semMin} insumo(s) sem estoque mínimo definido — a reposição automática só funciona após
          definir o mínimo.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Estoque</CardTitle>
          <Input
            className="max-w-xs"
            placeholder="Buscar…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-mono text-xs">{x.codigo ?? "—"}</TableCell>
                  <TableCell>
                    <p className="font-medium">{x.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {x.categoria ?? ""} {x.localizacao ? `· ${x.localizacao}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    {x.estoque} {x.unidade}
                  </TableCell>
                  <TableCell>{x.estoque_minimo > 0 ? x.estoque_minimo : "Não definido"}</TableCell>
                  <TableCell className="text-xs">
                    {forns.find((f) => f.id === x.fornecedor_id)?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    {baixo(x) ? (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Repor
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-success/40 text-success">
                        OK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {podeMov && (
                      <Button size="sm" variant="outline" onClick={() => setMov(x)}>
                        <ArrowDownUp className="mr-1 h-3 w-3" />
                        Movimentar
                      </Button>
                    )}
                    {pode && (
                      <Button size="sm" variant="ghost" onClick={() => setEdit(x)}>
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum insumo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <InsumoForm
            forns={forns}
            atual={edit}
            onSaved={() => {
              setEdit(null);
              load();
            }}
          />
        )}
      </Dialog>
      <Dialog open={!!mov} onOpenChange={(o) => !o && setMov(null)}>
        {mov && (
          <MovForm
            insumo={mov}
            nome={profile?.nome ?? ""}
            onSaved={() => {
              setMov(null);
              load();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InsumoForm({
  forns,
  atual,
  onSaved,
}: {
  forns: Forn[];
  atual?: Insumo;
  onSaved: () => void;
}) {
  const [f, setF] = useState(
    atual
      ? {
          codigo: atual.codigo ?? "",
          nome: atual.nome,
          categoria: atual.categoria ?? "",
          unidade: atual.unidade,
          estoque: String(atual.estoque),
          estoque_minimo: String(atual.estoque_minimo),
          qtd_reposicao: String(atual.qtd_reposicao),
          custo_unitario: String(atual.custo_unitario),
          fornecedor_id: atual.fornecedor_id ?? "",
          localizacao: atual.localizacao ?? "",
        }
      : vazio,
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      codigo: f.codigo || null,
      nome: f.nome,
      categoria: f.categoria || null,
      unidade: f.unidade || "un",
      estoque_minimo: Number(f.estoque_minimo) || 0,
      qtd_reposicao: Number(f.qtd_reposicao) || 0,
      custo_unitario: Number(f.custo_unitario) || 0,
      fornecedor_id: f.fornecedor_id || null,
      localizacao: f.localizacao || null,
    };
    const { error } = atual
      ? await supabase.from("insumos").update(payload).eq("id", atual.id)
      : await supabase.from("insumos").insert({ ...payload, estoque: Number(f.estoque) || 0 });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(atual ? "Insumo atualizado" : "Insumo cadastrado");
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{atual ? "Editar insumo" : "Novo insumo"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div>
            <Label>Código</Label>
            <Input value={f.codigo} onChange={set("codigo")} />
          </div>
          <div>
            <Label>Nome *</Label>
            <Input required value={f.nome} onChange={set("nome")} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Categoria</Label>
            <Input value={f.categoria} onChange={set("categoria")} placeholder="Aço, Manta…" />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={f.unidade} onChange={set("unidade")} placeholder="un, kg, m²" />
          </div>
          <div>
            <Label>Localização</Label>
            <Input value={f.localizacao} onChange={set("localizacao")} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Estoque inicial</Label>
            <Input
              type="number"
              step="any"
              disabled={!!atual}
              value={f.estoque}
              onChange={set("estoque")}
            />
          </div>
          <div>
            <Label>Estoque mínimo</Label>
            <Input type="number" step="any" value={f.estoque_minimo} onChange={set("estoque_minimo")} />
          </div>
          <div>
            <Label>Qtd. a repor</Label>
            <Input type="number" step="any" value={f.qtd_reposicao} onChange={set("qtd_reposicao")} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Deixe o mínimo em 0 enquanto não estiver definido. Qtd. a repor em 0 = completa até o
          dobro do mínimo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Custo unitário (R$)</Label>
            <Input type="number" step="0.01" value={f.custo_unitario} onChange={set("custo_unitario")} />
          </div>
          <div>
            <Label>Fornecedor preferencial</Label>
            <Select value={f.fornecedor_id} onValueChange={(v) => setF({ ...f, fornecedor_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {forns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function MovForm({ insumo, nome, onSaved }: { insumo: Insumo; nome: string; onSaved: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("saida");
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = Number(qtd);
    if (!(q >= 0) || (tipo !== "ajuste" && q <= 0)) return toast.error("Quantidade inválida");
    if (tipo === "saida" && q > insumo.estoque) return toast.error("Saída maior que o estoque");
    setSaving(true);
    const { error } = await supabase.from("movimentos_estoque").insert({
      insumo_id: insumo.id,
      tipo,
      quantidade: q,
      responsavel_nome: nome || null,
      observacoes: obs || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    const novo = tipo === "entrada" ? insumo.estoque + q : tipo === "saida" ? insumo.estoque - q : q;
    if (insumo.estoque_minimo > 0 && novo <= insumo.estoque_minimo)
      toast.warning("Estoque abaixo do mínimo — pedido de compra gerado para Compras");
    else toast.success("Movimento registrado");
    onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Movimentar: {insumo.nome}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Estoque atual: {insumo.estoque} {insumo.unidade}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída (consumo)</SelectItem>
                <SelectItem value="entrada">Entrada (recebimento)</SelectItem>
                <SelectItem value="ajuste">Ajuste (inventário)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{tipo === "ajuste" ? "Novo saldo" : "Quantidade"}</Label>
            <Input type="number" step="any" required value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Observações</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="OS, setor…" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
