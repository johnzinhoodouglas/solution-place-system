CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text,
  tipo text NOT NULL,
  severidade text NOT NULL DEFAULT 'info',
  link text,
  origem_tabela text,
  origem_id uuid,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id, lida, created_at DESC);

GRANT SELECT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON public.notificacoes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notificacoes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_notificacoes_updated BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Envia notificação para um conjunto de papéis + destinatário direto
CREATE OR REPLACE FUNCTION public.notificar(
  _titulo text, _mensagem text, _tipo text, _severidade text,
  _link text, _tabela text, _registro uuid,
  _roles app_role[], _direto uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, severidade, link, origem_tabela, origem_id)
  SELECT DISTINCT d.uid, _titulo, _mensagem, _tipo, _severidade, _link, _tabela, _registro
  FROM (
    SELECT ur.user_id AS uid FROM public.user_roles ur WHERE ur.role = ANY(_roles)
    UNION
    SELECT _direto WHERE _direto IS NOT NULL
  ) d
  WHERE d.uid IS NOT NULL;
END; $$;

REVOKE ALL ON FUNCTION public.notificar(text, text, text, text, text, text, uuid, app_role[], uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notifica_nc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notificar(
      'Nova não conformidade ' || NEW.numero,
      NEW.titulo || ' · severidade ' || NEW.severidade,
      'nc', CASE WHEN NEW.severidade IN ('alta','critica') THEN 'critico' ELSE 'aviso' END,
      '/app/qualidade/' || NEW.id, 'nao_conformidades', NEW.id,
      ARRAY['qualidade','diretoria']::app_role[], NEW.responsavel_id);
  ELSIF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id AND NEW.responsavel_id IS NOT NULL THEN
    PERFORM public.notificar(
      'Você é responsável pela NC ' || NEW.numero,
      NEW.titulo, 'nc', 'aviso',
      '/app/qualidade/' || NEW.id, 'nao_conformidades', NEW.id,
      ARRAY[]::app_role[], NEW.responsavel_id);
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notifica_nc() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notifica_nc AFTER INSERT OR UPDATE ON public.nao_conformidades
  FOR EACH ROW EXECUTE FUNCTION public.notifica_nc();

CREATE OR REPLACE FUNCTION public.notifica_inspecao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.resultado IN ('pendente','reprovado')
     AND (TG_OP = 'INSERT' OR NEW.resultado IS DISTINCT FROM OLD.resultado) THEN
    PERFORM public.notificar(
      CASE WHEN NEW.resultado = 'pendente' THEN 'Inspeção pendente ' ELSE 'Inspeção reprovada ' END
        || COALESCE(NEW.numero,''),
      'Tipo: ' || NEW.tipo, 'inspecao',
      CASE WHEN NEW.resultado = 'reprovado' THEN 'critico' ELSE 'aviso' END,
      '/app/qualidade/inspecoes', 'inspecoes', NEW.id,
      ARRAY['qualidade','diretoria']::app_role[], NEW.inspetor_id);
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notifica_inspecao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notifica_inspecao AFTER INSERT OR UPDATE ON public.inspecoes
  FOR EACH ROW EXECUTE FUNCTION public.notifica_inspecao();