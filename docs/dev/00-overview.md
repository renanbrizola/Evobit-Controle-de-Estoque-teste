# 00-Overview

## Visão Geral
O **Evobit Desktop** é um ERP modular focado em **Offline-First**.
O sistema é projetado para operar em ambientes com conectividade intermitente, garantindo que o usuário possa vender e gerenciar estoque sem internet.

## Status do Projeto
- **Versão Atual**: Web/PWA (Progressive Web App).
- **Roadmap**: Versão Desktop nativa via Electron (atualmente em estágio experimental/dev).

## Tech Stack
### Core
- **Frontend**: React 19
- **Build Tool**: Vite 6
- **Routing**: React Router DOM v7
- **Linguagem**: JavaScript (ES6+ / Modules)

### Dados
- **Local (Browser)**: RxDB 16 (sobre IndexedDB) - *Fonte de verdade offline*
- **Remoto (Cloud)**: Supabase (PostgreSQL) - *Backup e Sincronização*
- **Sync**: Replicação bidirecional customizada (`src/db/sync.js`)

### UI/UX
- **Estilização**: TailwindCSS 3.4
- **Componentes**: Radix UI (base para alguns), Lucide React (Ícones)
- **Toast**: Sonner

## Arquitetura de Módulos
O sistema é dividido em contextos de negócio isolados, mas integrados via banco de dados:
1.  **Estoque (Core)**: Gestão de produtos e movimentações.
2.  **Vendas (PDV)**: Frente de caixa.
3.  **Compras**: Entrada de notas e fornecedores.
4.  **Financeiro**: Contas a pagar/receber (dependente dos módulos acima).

> **Nota**: A ativação de módulos é controlada via licença (`ModuleContext`). O código deve sempre verificar se o módulo está ativo antes de permitir acesso ou criar transações financeiras.
