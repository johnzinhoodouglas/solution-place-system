CREATE TABLE public.afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  data_inicio date NOT NULL DEFAULT current_date,
  data_prevista_retorno date,
  data_retorno date,
  status text NOT NULL DEFAULT 'afastado' CHECK (status IN ('afastado','em_recolocacao','recolocado')),
  setor_origem text,
  setor_retorno text,
  cargo_retorno text,
  aso_apto boolean NOT NULL DEFAULT false,
  integracao_ok boolean NOT NULL DEFAULT false,
  treinamento_ok boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afastamentos TO authenticated;
GRANT ALL ON public.afastamentos TO service_role;
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH le afastamentos" ON public.afastamentos FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'seguranca'));
CREATE POLICY "RH gere afastamentos" ON public.afastamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master') OR has_role(auth.uid(),'qualidade'))
  WITH CHECK (has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master') OR has_role(auth.uid(),'qualidade'));
CREATE TRIGGER afastamentos_updated BEFORE UPDATE ON public.afastamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.metas_setor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  mes date NOT NULL,
  meta_os integer NOT NULL DEFAULT 0,
  max_ncs integer NOT NULL DEFAULT 0,
  pct_prazo integer NOT NULL DEFAULT 90,
  meta_horas numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (setor, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_setor TO authenticated;
GRANT ALL ON public.metas_setor TO service_role;
ALTER TABLE public.metas_setor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros leem metas" ON public.metas_setor FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY "Diretoria gere metas" ON public.metas_setor FOR ALL TO authenticated
  USING (has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'))
  WITH CHECK (has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
CREATE TRIGGER metas_setor_updated BEFORE UPDATE ON public.metas_setor FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();