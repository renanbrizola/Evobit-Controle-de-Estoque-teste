# 07-Testing

## Estratégia de Testes
Atualmente o projeto depende fortemente de testes manuais e verificação visual.

### Comandos
- `npm run test`: Executa testes unitários (Vitest).
- `npm run typecheck`: Valida tipos (embora seja JS, o compilador TS verifica JSDoc/imports).

### Cenários de Regressão Críticos
Ao alterar o código, verifique manualmente:

1.  **Venda Completa (PDV)**
    - Adicionar item ao carrinho.
    - Finalizar venda.
    - Verificar se estoque reduziu (`products.current_stock`).
    - Verificar se transação financeira foi criada (se módulo ativo).

2.  **Movimentação de Estoque**
    - Criar Entrada manual.
    - Verificar se Custo Médio (Cost Price) atualizou.

3.  **Sync Offline**
    - Desconectar internet.
    - Criar venda.
    - Reconectar.
    - Verificar se apareceu no Supabase.

### Test Data Generator
Existe um botão "Gerar Dados de Teste" no Dashboard (apenas Dev).
- Ele interage diretamente com `api.js`.
- Útil para popular dashboards vazios e testar performance de renderização.
