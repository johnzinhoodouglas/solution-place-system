ALTER TABLE public.nao_conformidades
  ADD COLUMN IF NOT EXISTS prazo date,
  ADD COLUMN IF NOT EXISTS analise_ia jsonb,
  ADD COLUMN IF NOT EXISTS escalonamento_nivel int NOT NULL DEFAULT 0;
ALTER TABLE public.acoes_corretivas
  ADD COLUMN IF NOT EXISTS aprovacao_status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS escalonamento_nivel int NOT NULL DEFAULT 0;
ALTER TABLE public.inspecoes
  ADD COLUMN IF NOT EXISTS prazo date,
  ADD COLUMN IF NOT EXISTS escalonamento_nivel int NOT NULL DEFAULT 0;

UPDATE public.nao_conformidades SET prazo = (data_abertura::date + CASE severidade WHEN 'critica' THEN 7 WHEN 'alta' THEN 15 WHEN 'media' THEN 30 ELSE 45 END) WHERE prazo IS NULL;
UPDATE public.inspecoes SET prazo = data_inspecao::date + 2 WHERE prazo IS NULL;

CREATE OR REPLACE FUNCTION public.define_prazo_padrao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'nao_conformidades' AND NEW.prazo IS NULL THEN
    NEW.prazo := (COALESCE(NEW.data_abertura, now())::date + CASE NEW.severidade WHEN 'critica' THEN 7 WHEN 'alta' THEN 15 WHEN 'media' THEN 30 ELSE 45 END);
  ELSIF TG_TABLE_NAME = 'inspecoes' AND NEW.prazo IS NULL THEN
    NEW.prazo := COALESCE(NEW.data_inspecao, now())::date + 2;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nc_prazo_padrao BEFORE INSERT ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.define_prazo_padrao();
CREATE TRIGGER insp_prazo_padrao BEFORE INSERT ON public.inspecoes FOR EACH ROW EXECUTE FUNCTION public.define_prazo_padrao();
REVOKE EXECUTE ON FUNCTION public.define_prazo_padrao() FROM PUBLIC, anon, authenticated;

-- Histórico de decisões
CREATE TABLE public.nc_decisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id uuid NOT NULL REFERENCES public.nao_conformidades(id) ON DELETE CASCADE,
  acao_id uuid REFERENCES public.acoes_corretivas(id) ON DELETE SET NULL,
  decisao text NOT NULL,
  comentario text,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nc_decisoes TO authenticated;
GRANT ALL ON public.nc_decisoes TO service_role;
ALTER TABLE public.nc_decisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Decisões: autenticados leem" ON public.nc_decisoes FOR SELECT TO authenticated USING (true);
CREATE INDEX ON public.nc_decisoes (nc_id, created_at);

-- Responsável pode editar sua NC e suas ações
CREATE POLICY "NC: responsável atualiza" ON public.nao_conformidades FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid()) WITH CHECK (responsavel_id = auth.uid());
CREATE POLICY "Ações: responsável insere" ON public.acoes_corretivas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.nao_conformidades n WHERE n.id = nc_id AND n.responsavel_id = auth.uid()));
CREATE POLICY "Ações: responsável atualiza" ON public.acoes_corretivas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nao_conformidades n WHERE n.id = nc_id AND n.responsavel_id = auth.uid()));

-- Proteção: só Diretoria/Master aprovam ações e fecham NCs; responsável não altera status/responsável da NC
CREATE OR REPLACE FUNCTION public.guarda_aprovacao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE gestor boolean := has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master');
BEGIN
  IF auth.uid() IS NULL OR gestor THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'acoes_corretivas' THEN
    IF NEW.aprovacao_status IN ('aprovada','ajustes') AND NEW.aprovacao_status IS DISTINCT FROM OLD.aprovacao_status THEN
      RAISE EXCEPTION 'Somente a Diretoria pode aprovar ou pedir ajustes';
    END IF;
  ELSE
    IF NEW.status = 'fechada' AND OLD.status <> 'fechada' THEN
      RAISE EXCEPTION 'Somente a Diretoria pode concluir a NC';
    END IF;
    IF NOT has_role(auth.uid(),'qualidade') AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id OR NEW.prazo IS DISTINCT FROM OLD.prazo) THEN
      RAISE EXCEPTION 'O responsável só pode editar descrição, evidências e análise';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acao_guarda BEFORE UPDATE ON public.acoes_corretivas FOR EACH ROW EXECUTE FUNCTION public.guarda_aprovacao();
CREATE TRIGGER nc_guarda BEFORE UPDATE ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.guarda_aprovacao();
REVOKE EXECUTE ON FUNCTION public.guarda_aprovacao() FROM PUBLIC, anon, authenticated;

-- Fluxo de aprovação
CREATE OR REPLACE FUNCTION public.registrar_decisao(_nc uuid, _acao uuid, _decisao text, _comentario text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  gestor boolean := has_role(uid,'diretoria') OR has_role(uid,'master');
  resp uuid; num text; nome text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT responsavel_id, numero INTO resp, num FROM nao_conformidades WHERE id = _nc;
  IF num IS NULL THEN RAISE EXCEPTION 'NC não encontrada'; END IF;
  SELECT COALESCE(p.nome, p.email) INTO nome FROM profiles p WHERE p.id = uid;

  IF _decisao = 'enviada' THEN
    IF NOT (uid = resp OR gestor OR has_role(uid,'qualidade')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    UPDATE acoes_corretivas SET aprovacao_status = 'enviada' WHERE id = _acao AND nc_id = _nc;
    UPDATE nao_conformidades SET status = 'em_acao' WHERE id = _nc AND status IN ('aberta','em_analise');
    PERFORM notificar('Ação enviada para aprovação', num || ': nova ação corretiva aguardando revisão', 'aprovacao', 'media',
      '/app/qualidade/' || _nc, 'nao_conformidades', _nc, ARRAY['diretoria']::app_role[], NULL);
  ELSIF _decisao IN ('aprovada','ajustes') THEN
    IF NOT gestor THEN RAISE EXCEPTION 'Somente a Diretoria decide'; END IF;
    IF _decisao = 'ajustes' AND COALESCE(trim(_comentario),'') = '' THEN RAISE EXCEPTION 'Descreva os ajustes solicitados'; END IF;
    UPDATE acoes_corretivas SET aprovacao_status = _decisao WHERE id = _acao AND nc_id = _nc;
    PERFORM notificar(CASE WHEN _decisao='aprovada' THEN 'Ação aprovada' ELSE 'Ajustes solicitados' END,
      num || COALESCE(': ' || _comentario, ''), 'aprovacao', CASE WHEN _decisao='aprovada' THEN 'baixa' ELSE 'alta' END,
      '/app/qualidade/' || _nc, 'nao_conformidades', _nc, ARRAY['qualidade']::app_role[], resp);
  ELSIF _decisao = 'concluida' THEN
    IF NOT gestor THEN RAISE EXCEPTION 'Somente a Diretoria conclui a NC'; END IF;
    UPDATE nao_conformidades SET status = 'fechada', data_fechamento = now() WHERE id = _nc;
    PERFORM notificar('NC concluída', num || ' foi concluída pela Diretoria', 'aprovacao', 'baixa',
      '/app/qualidade/' || _nc, 'nao_conformidades', _nc, ARRAY['qualidade']::app_role[], resp);
  ELSIF _decisao = 'reaberta' THEN
    IF NOT gestor THEN RAISE EXCEPTION 'Somente a Diretoria reabre a NC'; END IF;
    UPDATE nao_conformidades SET status = 'em_acao', data_fechamento = NULL WHERE id = _nc;
  ELSE
    RAISE EXCEPTION 'Decisão inválida';
  END IF;

  INSERT INTO nc_decisoes (nc_id, acao_id, decisao, comentario, autor_id, autor_nome)
  VALUES (_nc, _acao, _decisao, NULLIF(trim(_comentario),''), uid, nome);
END $$;
REVOKE EXECUTE ON FUNCTION public.registrar_decisao(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_decisao(uuid, uuid, text, text) TO authenticated;

-- Escalonamento de prazos
CREATE OR REPLACE FUNCTION public.escalar_prazos() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  -- NCs vencidas
  FOR r IN SELECT id, numero, prazo, responsavel_id FROM nao_conformidades
    WHERE status NOT IN ('resolvida','verificada','fechada') AND prazo < current_date AND escalonamento_nivel < 2 LOOP
    PERFORM notificar('NC vencida — escalonada', r.numero || ' venceu em ' || to_char(r.prazo,'DD/MM/YYYY'), 'escalonamento', 'critica',
      '/app/qualidade/' || r.id, 'nao_conformidades', r.id, ARRAY['diretoria','qualidade']::app_role[], r.responsavel_id);
    UPDATE nao_conformidades SET escalonamento_nivel = 2 WHERE id = r.id; n := n + 1;
  END LOOP;
  -- NCs com prazo próximo (2 dias)
  FOR r IN SELECT id, numero, prazo, responsavel_id FROM nao_conformidades
    WHERE status NOT IN ('resolvida','verificada','fechada') AND prazo BETWEEN current_date AND current_date + 2 AND escalonamento_nivel < 1 LOOP
    PERFORM notificar('Prazo de NC próximo', r.numero || ' vence em ' || to_char(r.prazo,'DD/MM/YYYY'), 'escalonamento', 'alta',
      '/app/qualidade/' || r.id, 'nao_conformidades', r.id, ARRAY['qualidade']::app_role[], r.responsavel_id);
    UPDATE nao_conformidades SET escalonamento_nivel = 1 WHERE id = r.id; n := n + 1;
  END LOOP;
  -- Ações corretivas vencidas
  FOR r IN SELECT a.id, a.nc_id, a.when_prazo, n2.numero, n2.responsavel_id FROM acoes_corretivas a JOIN nao_conformidades n2 ON n2.id = a.nc_id
    WHERE a.status NOT IN ('concluida','verificada','cancelada') AND a.when_prazo < current_date AND a.escalonamento_nivel < 2 LOOP
    PERFORM notificar('Ação corretiva vencida', r.numero || ': ação venceu em ' || to_char(r.when_prazo,'DD/MM/YYYY'), 'escalonamento', 'alta',
      '/app/qualidade/' || r.nc_id, 'acoes_corretivas', r.id, ARRAY['diretoria']::app_role[], r.responsavel_id);
    UPDATE acoes_corretivas SET escalonamento_nivel = 2 WHERE id = r.id; n := n + 1;
  END LOOP;
  -- Inspeções pendentes
  FOR r IN SELECT id, numero, prazo, inspetor_id, escalonamento_nivel lvl FROM inspecoes
    WHERE resultado IN ('pendente','reprovado') AND prazo <= current_date + 1 AND escalonamento_nivel < CASE WHEN prazo < current_date THEN 2 ELSE 1 END LOOP
    PERFORM notificar(CASE WHEN r.prazo < current_date THEN 'Inspeção pendente vencida' ELSE 'Inspeção pendente — prazo próximo' END,
      COALESCE(r.numero,'Inspeção') || ' — prazo ' || to_char(r.prazo,'DD/MM/YYYY'), 'escalonamento',
      CASE WHEN r.prazo < current_date THEN 'critica' ELSE 'alta' END,
      '/app/qualidade/inspecoes', 'inspecoes', r.id,
      CASE WHEN r.prazo < current_date THEN ARRAY['diretoria','qualidade']::app_role[] ELSE ARRAY['qualidade']::app_role[] END, r.inspetor_id);
    UPDATE inspecoes SET escalonamento_nivel = CASE WHEN r.prazo < current_date THEN 2 ELSE 1 END WHERE id = r.id; n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.escalar_prazos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalar_prazos() TO authenticated;