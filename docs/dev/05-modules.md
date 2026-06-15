# 05-Modules & Routing

O sistema utiliza `React Router v7` para navegação.

## Estrutura de Rotas (`App.jsx`)
As rotas são protegidas por "Guards" que verificam autenticação e licença.

- `/app/`: Layout Principal (`Layout.jsx`)
    - `/app/dashboard`: Dashboard Geral
    - `/app/estoque`: Dashboard de Estoque e funcionalidades core.
    - `/app/vendas`: PDV (Requer módulo Vendas).
    - `/app/financeiro`: Dashboard Financeiro (Requer módulo Financeiro).

## ModuleGuard
Componente: `src/components/shared/ModuleGuard.jsx`
- **Função**: Verifica se o módulo solicitado está ativo no `ModuleContext`.
- **Comportamento**: Se o usuário acessar `/app/financeiro` sem licença, é redirecionado para `/app/modules` ou vê tela de bloqueio.

## Contextos
- **AuthContext**: Gerencia sessão do usuário (`user.id` necessário para RLS).
- **ModuleContext**: Carrega as permissões da empresa (quais módulos estão ativos).
- **ThemeContext**: Gerencia tema claro/escuro.
