# Arquitetura do Sistema e Diretrizes de Independência

Este documento estabelece os princípios arquiteturais fundamentais do projeto, com foco especial na **independência de módulos**.

## 1. Princípio da Independência de Módulos (Strict Module Independence)

Para garantir a estabilidade, escalabilidade e facilidade de manutenção do sistema, **cada módulo deve operar de forma isolada**, minimizando dependências diretas de outros módulos.

### O que isso significa na prática?
- **Não compartilhe estado global desnecessário:** Cada página/módulo deve gerenciar seu próprio estado (ex: formulários, filtros, dados locais) internamente ou via Contextos específicos se estritamente necessário.
- **Evite "Prop Drilling" entre módulos distintos:** Se o módulo de "Produtos" precisa de dados de "Fornecedores", ele deve buscar esses dados via API, e não esperar que o componente pai os passe.
- **Componentes Compartilhados:** Componentes de UI (botões, cards, inputs) ficam em `src/components/ui`. Componentes de lógica compartilhada (como o Importador) ficam em `src/components/shared`.
- **Roteamento Desacoplado:** As rotas são definidas centralmente, e a navegação entre módulos deve ser feita via Links ou redirecionamentos, nunca por montagem direta de componentes de página dentro de outra página (salvo layouts).

### Benefícios
1. **Segurança:** Alterar a lógica do módulo de Vendas não quebra o módulo de Estoque.
2. **Manutenibilidade:** É mais fácil entender e corrigir bugs quando o escopo é limitado.
3. **Performance:** Carregamento de dados sob demanda apenas quando o módulo é acessado.

## 2. Estrutura de Pastas

```
src/
  components/
    layout/       # Layouts globais (Sidebar, Navbar)
    ui/           # Componentes visuais puros (Burtons, Inputs)
    shared/       # Componentes funcionais reutilizáveis (DataImporter)
  pages/          # Módulos principais (cada arquivo é uma "tela")
  services/       # Camada de comunicação com API (Supabase)
  contexts/       # Estado global essencial (Auth, Theme)
  hooks/          # Lógica reutilizável (useMobile)
```

## 3. Padrão de Validação de Dados Externos

Todo dado que entra no sistema via importação externa (Excel, CSV) deve passar por uma camada de validação no cliente antes de ser enviado ao servidor, para evitar inconsistências no banco de dados.

- **Importação:** Utilize `DataImporter` com templates estritos.
- **Tipagem:** Force a conversão de tipos (ex: `Number()`, `String()`) antes do envio.
