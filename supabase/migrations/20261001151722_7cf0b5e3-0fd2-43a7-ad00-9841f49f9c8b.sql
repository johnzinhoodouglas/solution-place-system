CREATE TABLE public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nome text NOT NULL,
  categoria text,
  unidade text NOT NULL DEFAULT 'un',
  estoque numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  qtd_reposicao numeric NOT NULL DEFAULT 0,
  custo_unitario numeric NOT NULL DEFAULT 0,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  localizacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insumos_select" ON public.insumos FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'compras') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'engenharia') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
CREATE POLICY "insumos_write" ON public.insumos FOR ALL TO authenticated USING (
  has_role(auth.uid(),'compras') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'))
  WITH CHECK (has_role(auth.uid(),'compras') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
CREATE TRIGGER trg_insumos_updated BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.movimentos_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  os_id uuid REFERENCES public.ordens_servico(id),
  responsavel_nome text,
  observacoes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.movimentos_estoque TO authenticated;
GRANT ALL ON public.movimentos_estoque TO service_role;
ALTER TABLE public.movimentos_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_select" ON public.movimentos_estoque FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'compras') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'engenharia') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
CREATE POLICY "mov_insert" ON public.movimentos_estoque FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'compras') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

CREATE OR REPLACE FUNCTION public.aplica_movimento_estoque() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE insumos SET estoque = estoque + NEW.quantidade WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE insumos SET estoque = estoque - NEW.quantidade WHERE id = NEW.insumo_id;
  ELSE
    UPDATE insumos SET estoque = NEW.quantidade WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_mov_estoque AFTER INSERT ON public.movimentos_estoque FOR EACH ROW EXECUTE FUNCTION public.aplica_movimento_estoque();

CREATE OR REPLACE FUNCTION public.gera_pedido_reposicao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _qtd numeric;
BEGIN
  IF NEW.ativo AND NEW.estoque_minimo > 0 AND NEW.estoque <= NEW.estoque_minimo
     AND (TG_OP = 'INSERT' OR OLD.estoque > OLD.estoque_minimo OR OLD.estoque_minimo <> NEW.estoque_minimo OR OLD.estoque IS DISTINCT FROM NEW.estoque)
     AND NOT EXISTS (
       SELECT 1 FROM pedidos_compra p
       WHERE p.status IN ('rascunho','aprovado','enviado','parcial')
         AND p.itens @> jsonb_build_array(jsonb_build_object('insumo_id', NEW.id::text))
     ) THEN
    _qtd := GREATEST(COALESCE(NULLIF(NEW.qtd_reposicao,0), NEW.estoque_minimo * 2 - NEW.estoque), 1);
    INSERT INTO pedidos_compra (numero, fornecedor_id, itens, valor_total, status, observacoes)
    VALUES ('', NEW.fornecedor_id,
      jsonb_build_array(jsonb_build_object('insumo_id', NEW.id::text, 'descricao', NEW.nome,
        'quantidade', _qtd, 'unidade', NEW.unidade, 'valor_unitario', NEW.custo_unitario)),
      _qtd * NEW.custo_unitario, 'rascunho',
      'Gerado automaticamente pelo Almoxarifado: estoque de ' || NEW.nome || ' (' || NEW.estoque || ' ' || NEW.unidade || ') abaixo do mínimo (' || NEW.estoque_minimo || ').');
    PERFORM notificar('Estoque baixo: ' || NEW.nome,
      'Pedido de compra em rascunho gerado automaticamente.', 'estoque', 'alta',
      '/app/compras', 'insumos', NEW.id, ARRAY['compras','diretoria']::app_role[], NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_insumo_reposicao AFTER INSERT OR UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.gera_pedido_reposicao();
REVOKE EXECUTE ON FUNCTION public.aplica_movimento_estoque() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gera_pedido_reposicao() FROM PUBLIC, anon, authenticated;