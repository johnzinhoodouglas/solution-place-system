-- ============ SUCATA / RECICLÁVEIS ============
CREATE TYPE public.sucata_tipo AS ENUM ('aco_304','lataria','vidro','manta','outros');

CREATE TABLE public.sucata_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.sucata_tipo NOT NULL,
  descricao text,
  kg numeric NOT NULL DEFAULT 0,
  valor_kg numeric NOT NULL DEFAULT 0,
  valor_total numeric GENERATED ALWAYS AS (kg * valor_kg) STORED,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  setor text,
  destino text,
  data_movimento date NOT NULL DEFAULT current_date,
  responsavel_nome text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sucata_movimentos TO authenticated;
GRANT ALL ON public.sucata_movimentos TO service_role;
ALTER TABLE public.sucata_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sucata_select" ON public.sucata_movimentos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
  OR public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'qualidade')
  OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "sucata_insert" ON public.sucata_movimentos FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria')
    OR public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'qualidade')
    OR public.has_role(auth.uid(),'financeiro')
  )
);
CREATE POLICY "sucata_update" ON public.sucata_movimentos FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'));
CREATE POLICY "sucata_delete" ON public.sucata_movimentos FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'));

CREATE TRIGGER trg_sucata_updated BEFORE UPDATE ON public.sucata_movimentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  antes jsonb,
  depois jsonb,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_admin" ON public.audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'diretoria'));

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_tabela ON public.audit_log (tabela);

CREATE OR REPLACE FUNCTION public.registra_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome text;
  v_id uuid;
BEGIN
  SELECT nome INTO v_nome FROM public.profiles WHERE id = auth.uid();
  IF TG_OP = 'DELETE' THEN
    v_id := (to_jsonb(OLD)->>'id')::uuid;
    INSERT INTO public.audit_log(tabela, registro_id, acao, antes, autor_id, autor_nome)
    VALUES (TG_TABLE_NAME, v_id, 'delete', to_jsonb(OLD), auth.uid(), v_nome);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.audit_log(tabela, registro_id, acao, antes, depois, autor_id, autor_nome)
    VALUES (TG_TABLE_NAME, v_id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_nome);
    RETURN NEW;
  ELSE
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.audit_log(tabela, registro_id, acao, depois, autor_id, autor_nome)
    VALUES (TG_TABLE_NAME, v_id, 'insert', to_jsonb(NEW), auth.uid(), v_nome);
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.registra_auditoria() FROM anon, authenticated;

CREATE TRIGGER trg_audit_os AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_nc AFTER INSERT OR UPDATE OR DELETE ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_insp AFTER INSERT OR UPDATE OR DELETE ON public.inspecoes FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_cp AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_cr AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_nf AFTER INSERT OR UPDATE OR DELETE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_sug AFTER INSERT OR UPDATE OR DELETE ON public.sugestoes_melhoria FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_audit_sucata AFTER INSERT OR UPDATE OR DELETE ON public.sucata_movimentos FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();