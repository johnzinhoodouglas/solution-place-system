
-- Enums
CREATE TYPE public.orcamento_status AS ENUM ('rascunho','enviado','aprovado','recusado','expirado','convertido');
CREATE TYPE public.contrato_status AS ENUM ('ativo','concluido','cancelado','suspenso');
CREATE TYPE public.pedido_compra_status AS ENUM ('rascunho','aprovado','enviado','parcial','recebido','cancelado');
CREATE TYPE public.nf_tipo AS ENUM ('entrada','saida');
CREATE TYPE public.nf_status AS ENUM ('emitida','autorizada','cancelada','denegada');
CREATE TYPE public.titulo_status AS ENUM ('aberto','pago','parcial','vencido','cancelado');

-- Sequences
CREATE SEQUENCE public.orc_numero_seq START 1000;
CREATE SEQUENCE public.pc_numero_seq START 1000;
CREATE SEQUENCE public.ct_numero_seq START 1000;

-- CLIENTES
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  tipo_pessoa text DEFAULT 'PJ',
  email text,
  telefone text,
  endereco text,
  cidade text,
  uf text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_ins" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'recepcao'));
CREATE POLICY "clientes_upd" ON public.clientes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "clientes_del" ON public.clientes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FORNECEDORES
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  categoria text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  uf text,
  contato text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forn_select" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "forn_ins" ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'compras') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "forn_upd" ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'compras') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "forn_del" ON public.fornecedores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_forn_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORCAMENTOS
CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  descricao text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  validade date,
  status public.orcamento_status NOT NULL DEFAULT 'rascunho',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orc_select" ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "orc_ins" ON public.orcamentos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "orc_upd" ON public.orcamentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "orc_del" ON public.orcamentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_orc_updated BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gerar_numero_orc() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'ORC-' || lpad(nextval('public.orc_numero_seq')::text,6,'0');
  END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_orc_numero BEFORE INSERT ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_orc();

-- CONTRATOS
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  objeto text NOT NULL,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  data_inicio date,
  data_fim date,
  status public.contrato_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_select" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ct_ins" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "ct_upd" ON public.contratos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'vendas') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "ct_del" ON public.contratos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_ct_updated BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gerar_numero_ct() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'CT-' || lpad(nextval('public.ct_numero_seq')::text,6,'0');
  END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_ct_numero BEFORE INSERT ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_ct();

-- PEDIDOS DE COMPRA
CREATE TABLE public.pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  data_pedido date NOT NULL DEFAULT CURRENT_DATE,
  data_prev_entrega date,
  status public.pedido_compra_status NOT NULL DEFAULT 'rascunho',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_compra TO authenticated;
GRANT ALL ON public.pedidos_compra TO service_role;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select" ON public.pedidos_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "pc_ins" ON public.pedidos_compra FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'compras') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "pc_upd" ON public.pedidos_compra FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'compras') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "pc_del" ON public.pedidos_compra FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.pedidos_compra FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gerar_numero_pc() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'PC-' || lpad(nextval('public.pc_numero_seq')::text,6,'0');
  END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_pc_numero BEFORE INSERT ON public.pedidos_compra FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_pc();

-- NOTAS FISCAIS
CREATE TABLE public.notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.nf_tipo NOT NULL,
  numero text NOT NULL,
  serie text,
  natureza text,
  chave text,
  cliente_id uuid REFERENCES public.clientes(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  pedido_compra_id uuid REFERENCES public.pedidos_compra(id) ON DELETE SET NULL,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  status public.nf_status NOT NULL DEFAULT 'emitida',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT ALL ON public.notas_fiscais TO service_role;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nf_select" ON public.notas_fiscais FOR SELECT TO authenticated USING (true);
CREATE POLICY "nf_ins" ON public.notas_fiscais FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "nf_upd" ON public.notas_fiscais FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "nf_del" ON public.notas_fiscais FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_nf_updated BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTAS A PAGAR
CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  pedido_compra_id uuid REFERENCES public.pedidos_compra(id) ON DELETE SET NULL,
  nota_fiscal_id uuid REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_pagamento date,
  valor_pago numeric(14,2),
  status public.titulo_status NOT NULL DEFAULT 'aberto',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select" ON public.contas_pagar FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp_ins" ON public.contas_pagar FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "cp_upd" ON public.contas_pagar FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "cp_del" ON public.contas_pagar FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTAS A RECEBER
CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id),
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  nota_fiscal_id uuid REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_recebimento date,
  valor_recebido numeric(14,2),
  status public.titulo_status NOT NULL DEFAULT 'aberto',
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_select" ON public.contas_receber FOR SELECT TO authenticated USING (true);
CREATE POLICY "cr_ins" ON public.contas_receber FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "cr_upd" ON public.contas_receber FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "cr_del" ON public.contas_receber FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ON public.orcamentos(cliente_id);
CREATE INDEX ON public.orcamentos(status);
CREATE INDEX ON public.contratos(cliente_id);
CREATE INDEX ON public.pedidos_compra(fornecedor_id);
CREATE INDEX ON public.pedidos_compra(status);
CREATE INDEX ON public.notas_fiscais(tipo);
CREATE INDEX ON public.contas_pagar(status, data_vencimento);
CREATE INDEX ON public.contas_receber(status, data_vencimento);
