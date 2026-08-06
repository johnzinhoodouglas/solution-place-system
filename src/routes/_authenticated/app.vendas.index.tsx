import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  brl,
  ORC_STATUS_LABEL,
  ORC_STATUS_TONE,
  CT_STATUS_LABEL,
  podeGerirVendas,
  type OrcamentoStatus,
  type ContratoStatus,
} from "@/lib/comercial";

export const Route = createFileRoute("/_authenticated/app/vendas/")({ component: VendasPage });

type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
};
type Orc = {
  id: string;
  numero: string;
  cliente_id: string | null;
  descricao: string | null;
  valor_total: number;
  status: OrcamentoStatus;
  validade: string | null;
  created_at: string;
};
type Contrato = {
  id: string;
  numero: string;
  cliente_id: string | null;
  objeto: string;
  valor: number;
  status: ContratoStatus;
  data_inicio: string | null;
};

function VendasPage() {
  const { roles, user } = useCurrentUser();
  const pode = podeGerirVendas(roles);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orcs, setOrcs] = useState<Orc[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [busy, setBusy] = useState(true);
  const [openCli, setOpenCli] = useState(false);
  const [openOrc, setOpenOrc] = useState(false);
  const [openCt, setOpenCt] = useState(false);

  async function load() {
    setBusy(true);
    const [{ data: c }, { data: o }, { data: t }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase
        .from("orcamentos")
        .select("id, numero, cliente_id, descricao, valor_total, status, validade, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("contratos")
        .select("id, numero, cliente_id, objeto, valor, status, data_inicio")
        .order("created_at", { ascending: false }),
    ]);
    setClientes((c as Cliente[]) ?? []);
    setOrcs((o as Orc[]) ?? []);
    setContratos((t as Contrato[]) ?? []);
    setBusy(false);
  }
  useEffect(() => {
    load();
  }, []);

  const nomeCli = (id: string | null) => clientes.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Clientes, orçamentos e contratos comerciais.
          </p>
        </div>
      </div>

      <Tabs defaultValue="orcamentos">
        <TabsList>
          <TabsTrigger value="orcamentos">Orçamentos ({orcs.length})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
          <TabsTrigger value="clientes">Clientes ({clientes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamentos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Orçamentos</CardTitle>
              {pode && (
                <Dialog open={openOrc} onOpenChange={setOpenOrc}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <OrcForm
                    clientes={clientes}
                    userId={user?.id ?? null}
                    onSaved={() => {
                      setOpenOrc(false);
                      load();
                    }}
                  />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {busy ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orcs.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono">{o.numero}</TableCell>
                        <TableCell>{nomeCli(o.cliente_id)}</TableCell>
                        <TableCell className="max-w-xs truncate">{o.descricao ?? "—"}</TableCell>
                        <TableCell>{brl(o.valor_total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ORC_STATUS_TONE[o.status]}>
                            {ORC_STATUS_LABEL[o.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.validade ? new Date(o.validade).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {orcs.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground"
                        >
                          Nenhum orçamento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contratos</CardTitle>
              {pode && (
                <Dialog open={openCt} onOpenChange={setOpenCt}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <ContratoForm
                    clientes={clientes}
                    userId={user?.id ?? null}
                    onSaved={() => {
                      setOpenCt(false);
                      load();
                    }}
                  />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.numero}</TableCell>
                      <TableCell>{nomeCli(c.cliente_id)}</TableCell>
                      <TableCell className="max-w-xs truncate">{c.objeto}</TableCell>
                      <TableCell>{brl(c.valor)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{CT_STATUS_LABEL[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.data_inicio ? new Date(c.data_inicio).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {contratos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nenhum contrato.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Clientes</CardTitle>
              {pode && (
                <Dialog open={openCli} onOpenChange={setOpenCli}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <ClienteForm
                    userId={user?.id ?? null}
                    onSaved={() => {
                      setOpenCli(false);
                      load();
                    }}
                  />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{c.documento ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.email ?? c.telefone ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.cidade ? `${c.cidade}/${c.uf ?? ""}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        Nenhum cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClienteForm({ onSaved, userId }: { onSaved: () => void; userId: string | null }) {
  const [f, setF] = useState({
    nome: "",
    documento: "",
    tipo_pessoa: "PJ",
    email: "",
    telefone: "",
    cidade: "",
    uf: "",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("clientes").insert({ ...f, created_by: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo cliente</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Nome *</Label>
          <Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo_pessoa} onValueChange={(v) => setF({ ...f, tipo_pessoa: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                <SelectItem value="PF">Pessoa Física</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CNPJ/CPF</Label>
            <Input
              value={f.documento}
              onChange={(e) => setF({ ...f, documento: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <Label>Cidade</Label>
            <Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Input
              maxLength={2}
              value={f.uf}
              onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function OrcForm({
  clientes,
  onSaved,
  userId,
}: {
  clientes: Cliente[];
  onSaved: () => void;
  userId: string | null;
}) {
  const [f, setF] = useState({
    cliente_id: "",
    descricao: "",
    valor_total: "",
    validade: "",
    status: "rascunho" as OrcamentoStatus,
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("orcamentos").insert({
      numero: "",
      cliente_id: f.cliente_id || null,
      descricao: f.descricao || null,
      valor_total: Number(f.valor_total) || 0,
      validade: f.validade || null,
      status: f.status,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Orçamento criado");
    onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo orçamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Cliente *</Label>
          <Select value={f.cliente_id} onValueChange={(v) => setF({ ...f, cliente_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={f.descricao}
            onChange={(e) => setF({ ...f, descricao: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={f.valor_total}
              onChange={(e) => setF({ ...f, valor_total: e.target.value })}
            />
          </div>
          <div>
            <Label>Validade</Label>
            <Input
              type="date"
              value={f.validade}
              onChange={(e) => setF({ ...f, validade: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={f.status}
            onValueChange={(v) => setF({ ...f, status: v as OrcamentoStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORC_STATUS_LABEL) as OrcamentoStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {ORC_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ContratoForm({
  clientes,
  onSaved,
  userId,
}: {
  clientes: Cliente[];
  onSaved: () => void;
  userId: string | null;
}) {
  const [f, setF] = useState({
    cliente_id: "",
    objeto: "",
    valor: "",
    data_inicio: "",
    data_fim: "",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("contratos").insert({
      numero: "",
      cliente_id: f.cliente_id || null,
      objeto: f.objeto,
      valor: Number(f.valor) || 0,
      data_inicio: f.data_inicio || null,
      data_fim: f.data_fim || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato criado");
    onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo contrato</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Cliente *</Label>
          <Select value={f.cliente_id} onValueChange={(v) => setF({ ...f, cliente_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Objeto *</Label>
          <Textarea
            required
            rows={2}
            value={f.objeto}
            onChange={(e) => setF({ ...f, objeto: e.target.value })}
          />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={f.valor}
            onChange={(e) => setF({ ...f, valor: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Início</Label>
            <Input
              type="date"
              value={f.data_inicio}
              onChange={(e) => setF({ ...f, data_inicio: e.target.value })}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input
              type="date"
              value={f.data_fim}
              onChange={(e) => setF({ ...f, data_fim: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
