

## Plano: Dois graficos separados na aba Evolução

### Situacao atual
Existe um unico grafico "Patrimonio Liquido vs Divida" que mistura conceitos. Os labels dizem "Liquido" mas o campo armazena `gross_patrimony`. Alem disso, o segundo grafico mostra "Liquido/Socio" sem contexto de crescimento.

### O que sera feito

**1. Corrigir dados e auto-sync para salvar Patrimonio Bruto**
- Garantir que `autoGrossPatrimony` (da PatrimonialPage) seja salvo no campo `gross_patrimony`
- Meses passados sem snapshot ficam vazios (sem backfill)

**2. Grafico 1: Patrimonio Bruto x Divida Total**
- Titulo: "Patrimonio Bruto vs Divida Total"
- Linha verde: `gross_patrimony` (Patrimonio Bruto)
- Linha vermelha: `total_debt` (Divida Total)

**3. Grafico 2: Crescimento Liquido por Socio**
- Titulo: "Crescimento Liquido por Socio"
- Linha unica mostrando `net_equity_per_partner` ao longo dos meses
- Calculado como `(bruto - divida) / numSocios`

**4. Corrigir labels em KPI cards e tabela**
- Primeiro card: "Patrimonio Bruto" com valor de `gross_patrimony`
- Tabela: coluna "Patrimonio Bruto" em vez de "Patrimonio Liquido"

### Arquivos alterados
- `src/components/patrimonial/tabs/EvolutionTab.tsx` — corrigir labels, chartData keys, e titulos dos graficos
- `src/pages/PatrimonialPage.tsx` — garantir que passa `grossPatrimony` (nao `netPatrimony`)

