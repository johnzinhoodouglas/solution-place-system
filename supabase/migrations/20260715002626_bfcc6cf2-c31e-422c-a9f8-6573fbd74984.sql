
-- Enums
CREATE TYPE public.nc_origem AS ENUM ('auditoria_interna','auditoria_externa','producao','cliente','fornecedor','inspecao','outro');
CREATE TYPE public.nc_severidade AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.nc_status AS ENUM ('aberta','em_analise','em_acao','resolvida','verificada','fechada');
CREATE TYPE public.acao_status AS ENUM ('planejada','em_execucao','concluida','verificada','cancelada');
CREATE TYPE public.incidente_tipo AS ENUM ('quase_acidente','primeiros_socorros','com_afastamento','sem_afastamento','ambiental','patrimonial');
CREATE TYPE public.incidente_gravidade AS ENUM ('leve','moderada','grave','gravissima');

-- Helper: check if user belongs to one of the QSMS-relevant roles
-- We'll write policies inline using has_role.

-- ============ NÃO CONFORMIDADES ============
CREATE TABLE public.nao_conformidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descricao text,
  origem nc_origem NOT NULL DEFAULT 'producao',
  severidade nc_severidade NOT NULL DEFAULT 'media',
  status nc_status NOT NULL DEFAULT 'aberta',
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  etapa os_etapa,
  setor text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aberta_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_fechamento timestamptz,
  evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nao_conformidades TO authenticated;
GRANT ALL ON public.nao_conformidades TO service_role;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NC: todos autenticados leem" ON public.nao_conformidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "NC: qualidade/diretoria/master inserem" ON public.nao_conformidades FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "NC: qualidade/diretoria/master atualizam" ON public.nao_conformidades FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "NC: diretoria/master excluem" ON public.nao_conformidades FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_nc_updated BEFORE UPDATE ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequência de numeração NC-000001
CREATE SEQUENCE IF NOT EXISTS public.nc_numero_seq START 1000;

CREATE OR REPLACE FUNCTION public.gerar_numero_nc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'NC-' || lpad(nextval('public.nc_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_nc_numero BEFORE INSERT ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_nc();

-- ============ AÇÕES CORRETIVAS (5W2H) ============
CREATE TABLE public.acoes_corretivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id uuid NOT NULL REFERENCES public.nao_conformidades(id) ON DELETE CASCADE,
  what text NOT NULL,        -- O quê
  why text,                  -- Por quê
  who uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- Quem
  when_prazo date,           -- Quando (prazo)
  where_local text,          -- Onde
  how_como text,             -- Como
  how_much numeric(12,2),    -- Quanto (custo)
  status acao_status NOT NULL DEFAULT 'planejada',
  eficacia_verificada boolean NOT NULL DEFAULT false,
  observacoes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes_corretivas TO authenticated;
GRANT ALL ON public.acoes_corretivas TO service_role;
ALTER TABLE public.acoes_corretivas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ações: todos autenticados leem" ON public.acoes_corretivas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ações: qualidade/diretoria/master inserem" ON public.acoes_corretivas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Ações: qualidade/diretoria/master atualizam" ON public.acoes_corretivas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Ações: diretoria/master excluem" ON public.acoes_corretivas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_acao_updated BEFORE UPDATE ON public.acoes_corretivas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_acoes_nc ON public.acoes_corretivas(nc_id);

-- ============ EPIs ============
CREATE TABLE public.epis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ca text,                       -- Certificado de Aprovação
  validade_ca date,
  tamanho text,
  estoque integer NOT NULL DEFAULT 0,
  estoque_minimo integer NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis TO authenticated;
GRANT ALL ON public.epis TO service_role;
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EPIs: todos autenticados leem" ON public.epis FOR SELECT TO authenticated USING (true);
CREATE POLICY "EPIs: segurança/diretoria/master inserem" ON public.epis FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "EPIs: segurança/diretoria/master atualizam" ON public.epis FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "EPIs: diretoria/master excluem" ON public.epis FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_epi_updated BEFORE UPDATE ON public.epis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ENTREGAS DE EPI ============
CREATE TABLE public.entregas_epi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id uuid NOT NULL REFERENCES public.epis(id) ON DELETE RESTRICT,
  colaborador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  colaborador_nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  assinado boolean NOT NULL DEFAULT false,
  observacoes text,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_epi TO authenticated;
GRANT ALL ON public.entregas_epi TO service_role;
ALTER TABLE public.entregas_epi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregas EPI: todos autenticados leem" ON public.entregas_epi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Entregas EPI: segurança/diretoria/master inserem" ON public.entregas_epi FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Entregas EPI: segurança/diretoria/master atualizam" ON public.entregas_epi FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Entregas EPI: diretoria/master excluem" ON public.entregas_epi FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_entrega_epi_updated BEFORE UPDATE ON public.entregas_epi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_entregas_epi_epi ON public.entregas_epi(epi_id);

-- Trigger: baixa/retorno de estoque
CREATE OR REPLACE FUNCTION public.movimenta_estoque_epi()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.epis SET estoque = estoque - NEW.quantidade WHERE id = NEW.epi_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.epis SET estoque = estoque + OLD.quantidade WHERE id = OLD.epi_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_entrega_epi_estoque
  AFTER INSERT OR DELETE ON public.entregas_epi
  FOR EACH ROW EXECUTE FUNCTION public.movimenta_estoque_epi();

-- ============ INCIDENTES DE SEGURANÇA ============
CREATE TABLE public.incidentes_seguranca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_ocorrencia timestamptz NOT NULL DEFAULT now(),
  tipo incidente_tipo NOT NULL,
  gravidade incidente_gravidade NOT NULL DEFAULT 'leve',
  local text,
  setor text,
  descricao text NOT NULL,
  envolvidos text,
  medidas_imediatas text,
  investigacao text,
  dias_afastamento integer NOT NULL DEFAULT 0,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  nc_id uuid REFERENCES public.nao_conformidades(id) ON DELETE SET NULL,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidentes_seguranca TO authenticated;
GRANT ALL ON public.incidentes_seguranca TO service_role;
ALTER TABLE public.incidentes_seguranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incidentes: todos autenticados leem" ON public.incidentes_seguranca FOR SELECT TO authenticated USING (true);
CREATE POLICY "Incidentes: segurança/diretoria/master inserem" ON public.incidentes_seguranca FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Incidentes: segurança/diretoria/master atualizam" ON public.incidentes_seguranca FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "Incidentes: diretoria/master excluem" ON public.incidentes_seguranca FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_incidente_updated BEFORE UPDATE ON public.incidentes_seguranca FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DDS ============
CREATE TABLE public.dds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  tema text NOT NULL,
  conteudo text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_nome text,
  participantes text,
  qtd_participantes integer NOT NULL DEFAULT 0,
  setor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dds TO authenticated;
GRANT ALL ON public.dds TO service_role;
ALTER TABLE public.dds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DDS: todos autenticados leem" ON public.dds FOR SELECT TO authenticated USING (true);
CREATE POLICY "DDS: segurança/diretoria/master inserem" ON public.dds FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "DDS: segurança/diretoria/master atualizam" ON public.dds FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'seguranca') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "DDS: diretoria/master excluem" ON public.dds FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));

CREATE TRIGGER trg_dds_updated BEFORE UPDATE ON public.dds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
