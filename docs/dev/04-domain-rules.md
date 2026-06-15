# 04-Domain Rules

Regras de negócio cruciais para a integridade do sistema.

## 1. Módulo Financeiro (Condicional)
O módulo financeiro é vendido separadamente. O código deve respeitar essa licença.

- **Regra**: Lançamentos automáticos no Financeiro dependem do status do módulo.
- **Implementação**:
  - `Se (Financeiro Ativo)`: Venda/Compra -> Gera registro em `transactions`.
  - `Se (Financeiro Inativo)`: Venda/Compra -> Apenas baixa estoque e cria registro de venda/compra, SEM impacto financeiro.

## 2. Integridade de Estoque
Existem duas fontes de dados sobre quantidade:
1.  `movements` (Tabela de Movimentações): Log imutável de entradas e saídas.
2.  `products.current_stock` (Campo no Produto): Cache do saldo atual.

- **Fonte da Verdade**: `movements` é a fonte confiável auditável.
- **Cache**: `current_stock` é apenas um valor calculado para performance agilizada.
- **Drift**: Em caso de divergência (drift), deve haver um processo (futuro) de "Reconstrução de Estoque" que soma todas as `movements` e atualiza o `current_stock`.

## 3. Custo do Produto
O sistema utiliza o método de **Último Preço de Compra**.
- Ao dar entrada em uma nota (Módulo Compras), o campo `cost_price` do produto é sobrescrito pelo valor unitário da nova nota.
- **Não** utilizamos Média Ponderada no momento.

## 4. Imutabilidade Transacional (Append-Only)
Para evitar conflitos de sincronização complexos:
- **Vendas (`sales`) e Movimentações (`movements`) nunca devem ser editadas.**
- Se houver erro, deve-se criar uma transação de estorno (ex: Saída -> Entrada de correção).
- IDs são gerados no cliente (UUID v4) para garantir unicidade sem depender do servidor.
