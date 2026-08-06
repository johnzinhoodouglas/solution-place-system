import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Truck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/app/os/nova")({
  component: NovaOsPage,
});

function NovaOsPage() {
  const navigate = useNavigate();
  const { roles, loading } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    placa: "",
    marca: "",
    modelo: "",
    ano: "",
    cor: "",
    chassi: "",
    cliente_nome: "",
    cliente_documento: "",
    cliente_contato: "",
    nivel_blindagem: "",
    data_prevista_entrega: "",
    observacoes: "",
  });

  const podeCriar =
    !loading &&
    (roles.includes("master") ||
      roles.includes("diretoria") ||
      roles.includes("recepcao") ||
      roles.includes("vendas"));

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!podeCriar) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas Recepção, Vendas, Diretoria ou Master podem abrir uma OS.
        </p>
        <Button asChild className="mt-4">
          <Link to="/app/os">Voltar</Link>
        </Button>
      </div>
    );
  }

  function upd<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.placa || !form.marca || !form.modelo || !form.cliente_nome) {
      toast.error("Preencha placa, marca, modelo e cliente.");
      return;
    }
    setBusy(true);
    const { data: veic, error: vErr } = await supabase
      .from("veiculos")
      .insert({
        placa: form.placa.toUpperCase(),
        marca: form.marca,
        modelo: form.modelo,
        ano: form.ano ? Number(form.ano) : null,
        cor: form.cor || null,
        chassi: form.chassi || null,
        cliente_nome: form.cliente_nome,
        cliente_documento: form.cliente_documento || null,
        cliente_contato: form.cliente_contato || null,
      })
      .select()
      .single();

    if (vErr || !veic) {
      toast.error("Erro ao cadastrar veículo", { description: vErr?.message });
      setBusy(false);
      return;
    }

    const { data: os, error: oErr } = await supabase
      .from("ordens_servico")
      .insert({
        veiculo_id: veic.id,
        nivel_blindagem: form.nivel_blindagem || null,
        data_prevista_entrega: form.data_prevista_entrega || null,
        observacoes: form.observacoes || null,
      })
      .select()
      .single();

    setBusy(false);
    if (oErr || !os) {
      toast.error("Erro ao abrir OS", { description: oErr?.message });
      return;
    }
    toast.success(`OS ${os.numero} criada`);
    navigate({ to: "/app/os/$id", params: { id: os.id } });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/app/os">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
          <p className="text-sm text-muted-foreground">
            Recepção do veículo — dados iniciam o rastreamento da OS.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Veículo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Placa *" v={form.placa} on={(v) => upd("placa", v)} />
            <Field label="Marca *" v={form.marca} on={(v) => upd("marca", v)} />
            <Field label="Modelo *" v={form.modelo} on={(v) => upd("modelo", v)} />
            <Field label="Ano" v={form.ano} on={(v) => upd("ano", v)} type="number" />
            <Field label="Cor" v={form.cor} on={(v) => upd("cor", v)} />
            <Field label="Chassi" v={form.chassi} on={(v) => upd("chassi", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome *" v={form.cliente_nome} on={(v) => upd("cliente_nome", v)} />
            <Field
              label="CPF/CNPJ"
              v={form.cliente_documento}
              on={(v) => upd("cliente_documento", v)}
            />
            <Field
              label="Contato"
              v={form.cliente_contato}
              on={(v) => upd("cliente_contato", v)}
              className="sm:col-span-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nível de blindagem"
              v={form.nivel_blindagem}
              on={(v) => upd("nivel_blindagem", v)}
              placeholder="Ex.: III-A, III, IV..."
            />
            <Field
              label="Previsão de entrega"
              v={form.data_prevista_entrega}
              on={(v) => upd("data_prevista_entrega", v)}
              type="date"
            />
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => upd("observacoes", e.target.value)}
                rows={3}
                placeholder="Checklist inicial, avarias, itens do veículo..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="ghost">
            <Link to="/app/os">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Criando..." : "Abrir OS"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
