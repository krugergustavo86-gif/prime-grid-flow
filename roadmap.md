# Correções de origem e atualização de cheques
- [x] Excluir cheque de teste 13456, mantendo legado R$ 145.500,00 e caixa intacto; exclusão auditada.
- [x] Exigir origem explícita sem opção pré-marcada no cadastro; validado na tela e em teste.
- [x] Corrigir atualização ao retornar aos Recebíveis e testar persistência (R$ 1,23 → 2,34 → 3,45); testes limpos, 23 testes aprovados, 6.770 lançamentos intactos e sem publicação.

# Edição e exclusão segura de cheques
- [x] Implementar ações atômicas para Admin em cheques Em carteira sem movimentação anterior.
- [x] Remover cheque 123456 de R$ 30,26 restaurando o legado e registrando Atividades.
- [x] Testar edição, exclusão, bloqueios e fluxo na tela; limpar testes e conferir caixa sem publicar.

# Renomeação de categoria
- [x] Atualizar nome nos seletores e título do card sem alterar cálculo.
- [x] Renomear registros e conferir totais mensais e Caixa Atual.
- [x] Atualizar integração OPS e automações em execução.

# Correções aprovadas de 07/10
- [x] Excluir somente GMS de 07/10 e registrar motivo em Atividades.
- [x] Preservar os dois Help, cadastrar regra e suprimir apenas alerta por semelhança.
- [x] Absorver Luciano Klein no ajuste e verificar caixa, receita e conciliação.

# Notas fiscais de serviço
- [x] Criar estrutura fiscal separada e vínculos sem movimentar o caixa.
- [x] Implementar abas, cadastro completo, anexos, resumos e margens distintas.
- [x] Validar exemplo de R$ 5.000/ISS retido R$ 150/líquido R$ 4.850 e fluxo autenticado sem publicar.

# Controle individual de cheques
- [x] Criar ciclo auditado, vínculos de caixa e migração gradual do saldo legado.
- [x] Implementar aba Cheques, foto privada, histórico e ações com confirmação.
- [x] Corrigir baixas/desfazer recebimento com vínculo e reversão segura.
- [x] Testar regras financeiras e fluxo autenticado, remover dados temporários e não publicar.

# Acesso aos cheques e lançamento rápido
- [x] Abrir controle pelo valor em Recebíveis e retirar aba separada.
- [x] Confirmar lançamento rápido com vínculo existente ou entrada única, mantendo devolução segura.
- [x] Testar fluxo autenticado, conferir caixa antes/depois e limpar testes sem publicar.

# Redução aprovada das categorias de saída
- [x] Aplicar 18 opções, preservar categorias históricas e atualizar origens automáticas/regras.
- [x] Consolidar 2.354 lançamentos de meses abertos e 17 regras; meses fechados agrupados na leitura, sem desbloquear nem remover histórico.
- [x] Conferir Pessoal nas duas telas (setembro R$ 256.252,19), 50 testes e integridade dos 6.659 lançamentos iniciais; nenhum movimento de teste ou publicação.

# Aviso de origem no cadastro de cheques
- [x] Dar ao aviso "Cheque novo" o mesmo destaque laranja do aviso de individualização; conferido no preview com R$ 30.000,00.
- [x] Publicar o formulário no site publicado; deploy agendado e a URL respondeu 200.