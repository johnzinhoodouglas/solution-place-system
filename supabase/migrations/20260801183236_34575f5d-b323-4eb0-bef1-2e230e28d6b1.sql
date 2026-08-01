-- ENUMS
CREATE TYPE public.inspecao_tipo AS ENUM ('recebimento','entrada','saida','processo');
CREATE TYPE public.inspecao_resultado AS ENUM ('pendente','aprovado','aprovado_condicional','reprovado');
CREATE TYPE public.setor_producao AS ENUM ('aco','manta','vidros','montagem','limpeza_envelopamento','acabamento');
CREATE TYPE public.apontamento_status AS ENUM ('em_execucao','concluido','pronto_limpeza','reprovado','retrabalho');
CREATE TYPE public.sugestao_status AS ENUM ('nova','em_analise','aprovada','em_implantacao','implantada','recusada','duplicada');
CREATE TYPE public.treinamento_tipo AS ENUM ('lideranca','gestao_pessoal','tecnico','seguranca','iso_9001','integracao');

-- INSPECOES
CREATE TABLE public.inspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  tipo public.inspecao_tipo NOT NULL DEFAULT 'entrada',
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  inspetor_id uuid,
  inspetor_nome text,
  data_inspecao timestamptz NOT NULL DEFAULT now(),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  resultado public.inspecao_resultado NOT NULL DEFAULT 'pendente',
  km integer,
  combustivel text,
  itens_recebidos text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspecoes TO authenticated;
GRANT ALL ON public.inspecoes TO service_role;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insp_select" ON public.inspecoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "insp_insert" ON public.inspecoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "insp_update" ON public.inspecoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "insp_delete" ON public.inspecoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'qualidade'));
CREATE TRIGGER trg_insp_updated BEFORE UPDATE ON public.inspecoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.insp_numero_seq;
CREATE OR REPLACE FUNCTION public.gerar_numero_insp() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'INSP-' || lpad(nextval('public.insp_numero_seq')::text,6,'0');
  END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_insp_numero BEFORE INSERT ON public.inspecoes FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_insp();

-- PRODUCAO APONTAMENTOS
CREATE TABLE public.producao_apontamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor public.setor_producao NOT NULL,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  colaborador_id uuid,
  colaborador_nome text NOT NULL,
  escopos text[] NOT NULL DEFAULT '{}',
  observacoes text,
  horas numeric,
  status public.apontamento_status NOT NULL DEFAULT 'em_execucao',
  data_execucao date NOT NULL DEFAULT current_date,
  assinatura text,
  assinado_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_apontamentos TO authenticated;
GRANT ALL ON public.producao_apontamentos TO service_role;
ALTER TABLE public.producao_apontamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apt_select" ON public.producao_apontamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "apt_insert" ON public.producao_apontamentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "apt_update" ON public.producao_apontamentos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "apt_delete" ON public.producao_apontamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_apt_updated BEFORE UPDATE ON public.producao_apontamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROCEDIMENTOS ISO
CREATE TABLE public.procedimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  titulo text NOT NULL,
  setor text NOT NULL,
  versao text NOT NULL DEFAULT '1.0',
  clausula_iso text,
  objetivo text,
  passos jsonb NOT NULL DEFAULT '[]'::jsonb,
  riscos jsonb NOT NULL DEFAULT '[]'::jsonb,
  epis text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedimentos TO authenticated;
GRANT ALL ON public.procedimentos TO service_role;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc_select" ON public.procedimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "proc_write" ON public.procedimentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'engenharia') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "proc_update" ON public.procedimentos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'engenharia') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "proc_delete" ON public.procedimentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_proc_updated BEFORE UPDATE ON public.procedimentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUGESTOES DE MELHORIA
CREATE TABLE public.sugestoes_melhoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'processo',
  setor text,
  autor_id uuid,
  autor_nome text,
  ganho_tempo_min integer NOT NULL DEFAULT 0,
  ganho_custo_mes numeric NOT NULL DEFAULT 0,
  ganho_papel_folhas integer NOT NULL DEFAULT 0,
  nota_impacto integer NOT NULL DEFAULT 3,
  nota_esforco integer NOT NULL DEFAULT 3,
  nota_risco integer NOT NULL DEFAULT 3,
  score numeric NOT NULL DEFAULT 0,
  status public.sugestao_status NOT NULL DEFAULT 'nova',
  conflito_com uuid REFERENCES public.sugestoes_melhoria(id) ON DELETE SET NULL,
  parecer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugestoes_melhoria TO authenticated;
GRANT ALL ON public.sugestoes_melhoria TO service_role;
ALTER TABLE public.sugestoes_melhoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sug_select" ON public.sugestoes_melhoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "sug_insert" ON public.sugestoes_melhoria FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sug_update" ON public.sugestoes_melhoria FOR UPDATE TO authenticated USING (auth.uid() = autor_id OR public.has_role(auth.uid(),'qualidade') OR public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE POLICY "sug_delete" ON public.sugestoes_melhoria FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_sug_updated BEFORE UPDATE ON public.sugestoes_melhoria FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.calc_score_sugestao() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.score := round(((NEW.nota_impacto * 2.0) + (6 - NEW.nota_esforco) + (6 - NEW.nota_risco)
    + LEAST(4, NEW.ganho_custo_mes / 500.0) + LEAST(3, NEW.ganho_tempo_min / 60.0))::numeric, 2);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sug_score BEFORE INSERT OR UPDATE ON public.sugestoes_melhoria FOR EACH ROW EXECUTE FUNCTION public.calc_score_sugestao();

-- RH
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  nome text NOT NULL,
  matricula text,
  cpf text,
  setor text,
  cargo text,
  data_admissao date,
  data_demissao date,
  email text,
  telefone text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colab_select" ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "colab_insert" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "colab_update" ON public.colaboradores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "colab_delete" ON public.colaboradores FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_colab_updated BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.treinamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo public.treinamento_tipo NOT NULL DEFAULT 'tecnico',
  setor text,
  descricao text,
  conteudo jsonb NOT NULL DEFAULT '[]'::jsonb,
  carga_horaria numeric NOT NULL DEFAULT 1,
  instrutor text,
  data_prevista date,
  data_realizada date,
  obrigatorio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos TO authenticated;
GRANT ALL ON public.treinamentos TO service_role;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trein_select" ON public.treinamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "trein_insert" ON public.treinamentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "trein_update" ON public.treinamentos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "trein_delete" ON public.treinamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_trein_updated BEFORE UPDATE ON public.treinamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.treinamento_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  colaborador_nome text NOT NULL,
  presente boolean NOT NULL DEFAULT false,
  nota numeric,
  certificado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_participantes TO authenticated;
GRANT ALL ON public.treinamento_participantes TO service_role;
ALTER TABLE public.treinamento_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_select" ON public.treinamento_participantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "tp_insert" ON public.treinamento_participantes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tp_update" ON public.treinamento_participantes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "tp_delete" ON public.treinamento_participantes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ECONOMIA / LEAN
CREATE TABLE public.economia_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  categoria text NOT NULL DEFAULT 'papel',
  quantidade numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'un',
  custo_unitario numeric NOT NULL DEFAULT 0,
  custo_evitado numeric NOT NULL DEFAULT 0,
  mes date NOT NULL DEFAULT date_trunc('month', current_date)::date,
  origem text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.economia_registros TO authenticated;
GRANT ALL ON public.economia_registros TO service_role;
ALTER TABLE public.economia_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "econ_select" ON public.economia_registros FOR SELECT TO authenticated USING (true);
CREATE POLICY "econ_insert" ON public.economia_registros FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "econ_update" ON public.economia_registros FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "econ_delete" ON public.economia_registros FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'diretoria') OR public.has_role(auth.uid(),'master'));
CREATE TRIGGER trg_econ_updated BEFORE UPDATE ON public.economia_registros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for inspection photos bucket (bucket created via tool)
CREATE POLICY "insp_fotos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inspecoes');
CREATE POLICY "insp_fotos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inspecoes');
CREATE POLICY "insp_fotos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'inspecoes');
CREATE POLICY "insp_fotos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inspecoes');