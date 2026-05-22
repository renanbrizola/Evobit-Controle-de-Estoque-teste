# Manual Funcional: Evobit ERP Desktop

Este documento detalha todas as funcionalidades e módulos do sistema Evobit, explicando o fluxo de trabalho e os recursos disponíveis.

---

## 1. Módulo de Vendas (PDV)
O coração do sistema, focado em agilidade e precisão no fechamento de negócios.

*   **Frente de Caixa (PDV)**: Interface otimizada para seleção rápida de produtos e gestão de carrinho.
*   **Gestão de Orçamentos**: Permite salvar vendas em rascunho (orçamentos) para finalização posterior, com opção de edição e exclusão.
*   **Multi-Pagamento**: Suporte para múltiplas formas de pagamento em uma única venda (Ex: Parte em Dinheiro, parte no Cartão).
*   **Crediário Próprio**: Geração automática de parcelas com datas de vencimento no Contas a Receber para clientes cadastrados.
*   **Impressão de Comprovante**: Integração para geração de recibos térmicos no ato da conclusão.
*   **Integração de Estoque**: Dedução automática de produtos no estoque assim que a venda é confirmada.

## 2. Módulo de Compras (Gestão de Entradas)
Focado na automação da reposição de estoque e gestão de custos.

*   **Importação de XML (NFe)**: Carregamento automático de dados a partir do arquivo da nota fiscal do fornecedor.
    *   *Mapeamento Automático*: Identifica o fornecedor pelo CNPJ e tenta associar produtos pelo código de barras.
*   **Composição de Custos**: Cálculo detalhado do custo de aquisição, incluindo Frete, Seguro, Despesas Acessórias e Descontos.
*   **Integração com Contas a Pagar**: Gera automaticamente obrigações financeiras baseadas nas faturas (duplicatas) do XML ou lançamentos manuais.
*   **Gestão de Lotes**: Criação de lotes de entrada para controle de validade e custo médio por remessa.

## 3. Módulo de Estoque (Inventário)
Controle preciso sobre as mercadorias.

*   **Catálogo de Produtos**: Gerenciamento de preços de custo, venda, categorias e estoque mínimo.
*   **Movimentações de Estoque**: Histórico completo de entradas (compras) e saídas (vendas).
*   **Rastreabilidade por Lote**: Visualização de quantos itens existem em cada lote específico, facilitando o controle de vencimento.
*   **Alertas de Nível Baixo**: Indica visualmente produtos que estão abaixo do estoque de segurança.

## 4. Módulo Financeiro
Visibilidade total sobre a saúde financeira da empresa.

*   **Fluxo de Caixa**: Registro de todas as transações de entrada e saída.
*   **Contas a Receber**: Dashboard com status de parcelas de vendas realizadas no crediário.
*   **Contas a Pagar**: Gestão de compromissos com fornecedores originados das compras.
*   **Dashboard de Performance**: Gráficos de faturamento, ticket médio e volume de vendas por período.

## 5. Módulo de Contatos (Clientes e Fornecedores)
Centralização de informações para relacionamento comercial.

*   **Cadastro de Clientes**: Dados para emissão fiscal e histórico de compras.
*   **Cadastro de Fornecedores**: Gestão de parceiros para agilizar a importação de XMLs.

## 6. Módulo Fiscal (NFC-e) - *Em Fase de Implementação*
Preparado para conformidade legal.

*   **Infraestrutura de Emissão**: Sistema preparado para gerar o XML padrão NFe 4.00.
*   **Arquitetura Segura**: Processamento feito via Electron Main Process para garantir a segurança da assinatura digital.
*   **Botão de Emissão Direta**: Facilitador na tela de conclusão de venda para gerar a nota legal imediatamente.

---
*Evobit ERP - Documentação de Versão 1.0*
