-- ordens_servico: leitura restrita a Admin/Gerencia/Contabilidade/NF Control
DROP POLICY "Autenticados leem OS" ON public.ordens_servico;
CREATE POLICY "Gestao e NF leem OS" ON public.ordens_servico
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerencia')
  OR public.has_role(auth.uid(), 'contabilidade')
  OR public.has_role(auth.uid(), 'nf_control')
);

-- regras_categoria: leitura para qualquer usuario com perfil; insercao so Admin/Lancamentos
DROP POLICY "auth read regras" ON public.regras_categoria;
CREATE POLICY "Perfis leem regras" ON public.regras_categoria
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerencia')
  OR public.has_role(auth.uid(), 'lancamentos')
  OR public.has_role(auth.uid(), 'lancador')
  OR public.has_role(auth.uid(), 'nf_control')
  OR public.has_role(auth.uid(), 'contabilidade')
);
DROP POLICY "auth insert regras" ON public.regras_categoria;
CREATE POLICY "Admin e lancamentos inserem regras" ON public.regras_categoria
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'lancamentos')
);

-- fechamentos_mensais: leitura restrita a Admin/Gerencia/Lancamentos/Lancador/Contabilidade
DROP POLICY "read fechamentos" ON public.fechamentos_mensais;
CREATE POLICY "Gestao e lancamento leem fechamentos" ON public.fechamentos_mensais
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerencia')
  OR public.has_role(auth.uid(), 'lancamentos')
  OR public.has_role(auth.uid(), 'lancador')
  OR public.has_role(auth.uid(), 'contabilidade')
);

-- contas_bancarias: leitura restrita a Admin/Gerencia/Lancamentos/Lancador/Contabilidade
DROP POLICY "auth read contas" ON public.contas_bancarias;
CREATE POLICY "Gestao e lancamento leem contas" ON public.contas_bancarias
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerencia')
  OR public.has_role(auth.uid(), 'lancamentos')
  OR public.has_role(auth.uid(), 'lancador')
  OR public.has_role(auth.uid(), 'contabilidade')
);