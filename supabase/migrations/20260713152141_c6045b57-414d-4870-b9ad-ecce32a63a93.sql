
-- Fase 2: Recepção, Ordens de Serviço, Timeline de produção

CREATE TYPE public.os_etapa AS ENUM (
  'recepcao',
  'engenharia',
  'desmontagem',
  'blindagem',
  'montagem',
  'acabamento',
  'qualidade',
  'entrega',
  'concluida'
);

CREATE TYPE public.os_status AS ENUM (
  'aberta',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

CREATE TYPE public.os_evento AS ENUM (
  'criacao',
  'avanco_etapa',
  'retorno_etapa',
  'nota',
  'intervencao_diretoria',
  'nao_conformidade',
  'anexo',
  'pausa',
  'retomada',
  'conclusao',
  'cancelamento'
);

-- Veículos
CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano int,
  cor text,
  chassi text,
  cliente_nome text NOT NULL,
  cliente_documento text,
  cliente_contato text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "veiculos_select_auth" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "veiculos_insert_auth" ON public.veiculos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
    OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'vendas')
  );
CREATE POLICY "veiculos_update_priv" ON public.veiculos FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
    OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'vendas')
  );
CREATE POLICY "veiculos_delete_priv" ON public.veiculos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'));

CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequence para número da OS
CREATE SEQUENCE public.os_numero_seq START 1000;

-- Ordens de Serviço
CREATE TABLE public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE DEFAULT ('OS-' || lpad(nextval('public.os_numero_seq')::text, 6, '0')),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  nivel_blindagem text,
  etapa_atual public.os_etapa NOT NULL DEFAULT 'recepcao',
  status public.os_status NOT NULL DEFAULT 'aberta',
  prioridade text NOT NULL DEFAULT 'normal',
  data_entrada timestamptz NOT NULL DEFAULT now(),
  data_prevista_entrega date,
  data_saida timestamptz,
  responsavel_id uuid,
  observacoes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "os_select_auth" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "os_insert_auth" ON public.ordens_servico FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
    OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'vendas')
  );
CREATE POLICY "os_update_setor" ON public.ordens_servico FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
    OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'engenharia')
    OR public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'qualidade')
  );
CREATE POLICY "os_delete_priv" ON public.ordens_servico FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'));

CREATE INDEX idx_os_etapa ON public.ordens_servico(etapa_atual);
CREATE INDEX idx_os_status ON public.ordens_servico(status);
CREATE INDEX idx_os_veiculo ON public.ordens_servico(veiculo_id);

CREATE TRIGGER trg_os_updated BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Timeline (append-only)
CREATE TABLE public.os_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  evento public.os_evento NOT NULL,
  etapa_de public.os_etapa,
  etapa_para public.os_etapa,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.os_timeline TO authenticated;
GRANT ALL ON public.os_timeline TO service_role;
ALTER TABLE public.os_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_select_auth" ON public.os_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "timeline_insert_auth" ON public.os_timeline FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

CREATE INDEX idx_timeline_os ON public.os_timeline(os_id, created_at DESC);

-- Trigger: registra criação e mudança de etapa automaticamente
CREATE OR REPLACE FUNCTION public.log_os_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome text;
BEGIN
  SELECT nome INTO v_nome FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.os_timeline(os_id, evento, etapa_para, descricao, autor_id, autor_nome)
    VALUES (NEW.id, 'criacao', NEW.etapa_atual, 'OS criada', COALESCE(auth.uid(), NEW.created_by), v_nome);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.etapa_atual IS DISTINCT FROM OLD.etapa_atual THEN
      INSERT INTO public.os_timeline(os_id, evento, etapa_de, etapa_para, descricao, autor_id, autor_nome)
      VALUES (NEW.id,
              CASE WHEN NEW.etapa_atual::text < OLD.etapa_atual::text THEN 'retorno_etapa' ELSE 'avanco_etapa' END,
              OLD.etapa_atual, NEW.etapa_atual,
              'Etapa alterada: ' || OLD.etapa_atual || ' → ' || NEW.etapa_atual,
              auth.uid(), v_nome);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.os_timeline(os_id, evento, descricao, autor_id, autor_nome)
      VALUES (NEW.id,
              CASE NEW.status
                WHEN 'concluida' THEN 'conclusao'::os_evento
                WHEN 'cancelada' THEN 'cancelamento'::os_evento
                WHEN 'pausada' THEN 'pausa'::os_evento
                ELSE 'retomada'::os_evento END,
              'Status: ' || OLD.status || ' → ' || NEW.status,
              auth.uid(), v_nome);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_os_log_insert AFTER INSERT ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.log_os_changes();

CREATE TRIGGER trg_os_log_update AFTER UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.log_os_changes();
