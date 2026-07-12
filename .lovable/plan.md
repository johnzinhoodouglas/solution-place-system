# Sistema de Gestão ISO 9001:2015 — Solution Place (Blindagem Veicular)

Sistema web completo para gestão da produção de veículos blindados, cobrindo todas as fases do fluxo produtivo, com controle por setores, rastreabilidade, dashboards e melhoria contínua.

## Escopo funcional

**Módulos principais (setores)**
1. **Recepção de veículos** — entrada, checklist, fotos, OS aberta
2. **Engenharia** — projeto, especificações técnicas, BOM (materiais)
3. **Vendas** — orçamentos, contratos, clientes, pipeline
4. **Compras** — pedidos, fornecedores, cotações, recebimento
5. **Produção** — etapas (desmontagem, blindagem, montagem, acabamento, testes)
6. **Qualidade** — inspeções por etapa, não conformidades (NC), ações corretivas (5W2H), auditorias ISO
7. **Financeiro** — contas a pagar/receber, fluxo de caixa, faturamento
8. **Segurança do Trabalho** — EPIs, checklists ergonômicos, incidentes, DDS, PGR
9. **Fiscal/Estatutário** — notas fiscais, obrigações, documentos regulatórios
10. **Recicláveis/Sucata** — controle de aço inox 304 e sucatas de lataria, saldo, destinação, retorno financeiro
11. **Melhoria Contínua** — PDCA, sugestões, indicadores, planos de ação
12. **Entrega** — checklist final, termo de entrega ao cliente

**Rastreabilidade** — cada veículo (OS) tem timeline completa: entrada → etapa atual → saída, com responsável, timestamp e evidências em cada transição.

**Dashboards** — por etapa (produção em tempo real), qualidade (NCs abertas, taxa de retrabalho), financeiro (fluxo), sucata (kg/mês, receita), segurança (dias sem acidente).

## Controle de acesso (RBAC)

Papéis (armazenados em tabela `user_roles` separada, com função `has_role` SECURITY DEFINER):
- `master` — acesso total, manutenção do sistema, auditoria de logs
- `diretoria` — visão completa + poder de intervir/modificar qualquer etapa
- `qualidade`, `engenharia`, `vendas`, `compras`, `financeiro`, `producao`, `seguranca`, `fiscal`, `recepcao` — acesso ao próprio setor + leitura das etapas interligadas do fluxo

Cada setor vê o que entra dele e o que sai para o próximo, garantindo fluxograma limpo.

## Stack técnica

- **Frontend**: TanStack Start + React 19 + Tailwind v4, layout moderno (tema escuro industrial com acento em azul/laranja de segurança), componentes leves (shadcn). Sidebar por setor. Sem SPAs pesadas — code-split por rota.
- **Backend**: Lovable Cloud (Postgres + Auth + Storage + Server Functions).
- **Auth**: e-mail/senha + Google. Tabela `profiles` (nome, setor, cargo) + `user_roles`.
- **Rastreabilidade**: tabela `os_timeline` com evento por transição de etapa (append-only).
- **Dashboards**: Recharts, queries agregadas via server functions.

## Modelo de dados (principais tabelas)

```
profiles(user_id, nome, setor, cargo)
user_roles(user_id, role)  -- enum: master, diretoria, qualidade, ...
veiculos(id, placa, chassi, modelo, cliente_id, status, etapa_atual)
ordens_servico(id, veiculo_id, numero_os, data_entrada, data_prev_saida, status)
os_timeline(id, os_id, etapa, evento, responsavel_id, payload jsonb, created_at)
clientes / fornecedores / produtos / materiais
orcamentos / contratos / pedidos_compra / notas_fiscais
inspecoes_qualidade / nao_conformidades / acoes_corretivas
epis / checklists_seguranca / incidentes / dds
sucata_movimentos(id, tipo [aco304|lataria], kg, origem_os_id, destino, valor, data)
melhoria_sugestoes / planos_acao_pdca
contas_pagar / contas_receber
audit_log(user_id, tabela, acao, antes, depois, created_at)  -- para master/diretoria
```

Todas as tabelas com RLS + GRANTs adequados. Diretoria/master via `has_role` em policies.

## Entregas por fase

Como o escopo é grande, proponho construir incrementalmente:

**Fase 1 (agora)** — Fundação
- Ativar Lovable Cloud, auth (e-mail + Google), profiles, user_roles, tela de login, layout base (sidebar por setor, header, tema), dashboard inicial vazio por setor, rota de administração de usuários (master/diretoria).

**Fase 2** — Núcleo produtivo
- Recepção de veículos, OS, timeline/rastreabilidade, etapas de produção, dashboard de produção em tempo real.

**Fase 3** — Qualidade + Segurança
- Inspeções, NCs, ações corretivas, checklists de EPI/ergonomia, incidentes.

**Fase 4** — Comercial + Suprimentos + Financeiro
- Vendas, compras, financeiro, fiscal.

**Fase 5** — Sucata + Melhoria contínua + Auditoria ISO
- Movimentações de sucata com retorno financeiro, PDCA, log de auditoria, relatórios ISO.

## Perguntas antes de começar

1. Confirmo iniciar pela **Fase 1** (fundação + auth + layout + papéis)? As fases seguintes serão construídas nas próximas mensagens.
2. Login com **e-mail/senha + Google** (padrão) está ok?
3. Preferência de identidade visual: **tema escuro industrial (azul aço + laranja segurança)** ou tema claro corporativo?

Ao aprovar, começo pela Fase 1.