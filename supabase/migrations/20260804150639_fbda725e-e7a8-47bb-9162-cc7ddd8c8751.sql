-- helper: user has at least one assigned role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;

-- trigger-only SECURITY DEFINER functions must not be callable by API users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.log_os_changes() FROM anon, authenticated;

-- ============ SELECT restrictions ============
DROP POLICY IF EXISTS clientes_select ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated
USING (has_role(auth.uid(),'vendas') OR has_role(auth.uid(),'recepcao') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'fiscal') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS colab_select ON public.colaboradores;
CREATE POLICY colab_select ON public.colaboradores FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS cp_select ON public.contas_pagar;
CREATE POLICY cp_select ON public.contas_pagar FOR SELECT TO authenticated
USING (has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'fiscal') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS cr_select ON public.contas_receber;
CREATE POLICY cr_select ON public.contas_receber FOR SELECT TO authenticated
USING (has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'fiscal') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS ct_select ON public.contratos;
CREATE POLICY ct_select ON public.contratos FOR SELECT TO authenticated
USING (has_role(auth.uid(),'vendas') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS forn_select ON public.fornecedores;
CREATE POLICY forn_select ON public.fornecedores FOR SELECT TO authenticated
USING (has_role(auth.uid(),'compras') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'fiscal') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS nf_select ON public.notas_fiscais;
CREATE POLICY nf_select ON public.notas_fiscais FOR SELECT TO authenticated
USING (has_role(auth.uid(),'fiscal') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS orc_select ON public.orcamentos;
CREATE POLICY orc_select ON public.orcamentos FOR SELECT TO authenticated
USING (has_role(auth.uid(),'vendas') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS pc_select ON public.pedidos_compra;
CREATE POLICY pc_select ON public.pedidos_compra FOR SELECT TO authenticated
USING (has_role(auth.uid(),'compras') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS veiculos_select_auth ON public.veiculos;
CREATE POLICY veiculos_select_auth ON public.veiculos FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid()));

-- ============ role-based writes (replace auth.uid() IS NOT NULL) ============
DROP POLICY IF EXISTS insp_insert ON public.inspecoes;
CREATE POLICY insp_insert ON public.inspecoes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'recepcao') OR has_role(auth.uid(),'compras') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS insp_update ON public.inspecoes;
CREATE POLICY insp_update ON public.inspecoes FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'recepcao') OR has_role(auth.uid(),'compras') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS apt_insert ON public.producao_apontamentos;
CREATE POLICY apt_insert ON public.producao_apontamentos FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'producao') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS apt_update ON public.producao_apontamentos;
CREATE POLICY apt_update ON public.producao_apontamentos FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'producao') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS colab_insert ON public.colaboradores;
CREATE POLICY colab_insert ON public.colaboradores FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS colab_update ON public.colaboradores;
CREATE POLICY colab_update ON public.colaboradores FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS trein_insert ON public.treinamentos;
CREATE POLICY trein_insert ON public.treinamentos FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS trein_update ON public.treinamentos;
CREATE POLICY trein_update ON public.treinamentos FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS tp_insert ON public.treinamento_participantes;
CREATE POLICY tp_insert ON public.treinamento_participantes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS tp_update ON public.treinamento_participantes;
CREATE POLICY tp_update ON public.treinamento_participantes FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS tp_delete ON public.treinamento_participantes;
CREATE POLICY tp_delete ON public.treinamento_participantes FOR DELETE TO authenticated
USING (has_role(auth.uid(),'seguranca') OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS econ_insert ON public.economia_registros;
CREATE POLICY econ_insert ON public.economia_registros FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));
DROP POLICY IF EXISTS econ_update ON public.economia_registros;
CREATE POLICY econ_update ON public.economia_registros FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master'));

DROP POLICY IF EXISTS sug_insert ON public.sugestoes_melhoria;
CREATE POLICY sug_insert ON public.sugestoes_melhoria FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid()) AND (autor_id IS NULL OR autor_id = auth.uid()));

-- ============ storage: inspecoes bucket ownership/role ============
DROP POLICY IF EXISTS insp_fotos_read ON storage.objects;
CREATE POLICY insp_fotos_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'inspecoes' AND (owner = auth.uid() OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master')));

DROP POLICY IF EXISTS insp_fotos_insert ON storage.objects;
CREATE POLICY insp_fotos_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspecoes' AND owner = auth.uid() AND (has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'producao') OR has_role(auth.uid(),'recepcao') OR has_role(auth.uid(),'compras') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master')));

DROP POLICY IF EXISTS insp_fotos_update ON storage.objects;
CREATE POLICY insp_fotos_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'inspecoes' AND (owner = auth.uid() OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master')));

DROP POLICY IF EXISTS insp_fotos_delete ON storage.objects;
CREATE POLICY insp_fotos_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspecoes' AND (owner = auth.uid() OR has_role(auth.uid(),'qualidade') OR has_role(auth.uid(),'diretoria') OR has_role(auth.uid(),'master')));