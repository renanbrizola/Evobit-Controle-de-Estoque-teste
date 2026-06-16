# 📋 Relatório de Auditoria — Evobit

**Data:** 15/06/2026 · **Stack:** Electron + React 19 + Vite + RxDB (local-first) + Supabase
**Escopo:** login → cadastro → senha → todos os módulos → configurações

---

## 1. Resumo executivo

O Evobit é um ERP desktop *local-first* com sincronização para a nuvem. A **arquitetura central é sólida e madura** (RxDB com event-sourcing, sync bidirecional, i18n PT/EN/ES, tema, segurança por PIN). O **módulo Estoque está completo e funcional**. O produto está num estado de **"vitrine ampla, profundidade desigual"**: muitas telas existem, mas há módulos **desligados de propósito** e áreas operando sobre **dados mock/stub**.

### Saúde técnica

| Verificação | Antes da Fase 0 | Depois da Fase 0 |
|---|---|---|
| `tsc --noEmit` | ✅ | ✅ |
| `eslint` (lint) | 🔴 76 erros | ✅ 0 |
| `vitest run` | 🔴 12 falhas | ✅ 12/12 |
| `vite build` | ✅ | ✅ |
| **`npm run verify`** | 🔴 **vermelho** | ✅ **verde** |

> Observação: lint e testes estavam vermelhos desde antes (um upgrade do ESLint introduziu regras novas). O sintoma ficou mascarado porque rodar `npm run lint | tail` retorna o *exit code* do `tail`, não do eslint.

---

## 2. Auditoria por área

### 2.1 🔐 Login — `src/pages/Login.jsx`
**✅ Funcional.** Tela polida, i18n, seletor de idioma, link de recuperação. Sem problemas funcionais.

### 2.2 👤 Cadastro — `src/pages/Register.jsx`
**✅ Funcional, com ressalvas.** Validação de senha forte (8+, maiúscula, minúscula, número, especial).
- 🟡 A mensagem "Conta criada! Faça login" assume que **não há confirmação de e-mail** no Supabase.
- 🟡 Não coleta nome — o objeto `user` nunca tem `.name` (gera "Bem-vindo, undefined" no hub).

### 2.3 🔑 Recuperação / Alteração de senha — `ForgotPassword.jsx` / `UpdatePassword.jsx`
**🟡 Funciona no navegador, frágil no desktop.**
- 🔴 **HashRouter:** o `redirectTo` usa caminho sem hash; o token do Supabase volta no fragmento `#access_token=...`, que colide com o roteamento por hash → o link de recuperação cai no `*` e redireciona para `/`. **Precisa ser repensado para Electron** (deep-link ou OTP).
- 🟡 Política de senha inconsistente (Register: forte; UpdatePassword: só 8 chars).

### 2.4 🚪 Controle de acesso e Admin
**✅ Corrigido na Fase 0.** O fluxo é cadastro → `pending` → `AccessDenied` → admin aprova em **Admin**. A página Admin **não renderizava** (usava `<Layout>` que ignora `children`), travando o onboarding in-app. **Corrigido**: movida para `/app/admin` no shell compartilhado.

### 2.5 🧩 Módulos + Licença — `Modules.jsx` / `ModuleContext.jsx`
**🟡 Funcional, com trava de desenvolvimento.**
- `ModuleContext` **força `sales`, `purchases`, `finance` para `false`**; `hasModule` só libera `inventory`/`technical_sheet`.
- 🟡 "Comprar módulo" é simulação (`setTimeout`), sem pagamento real.
- 🟡 Persistência de módulos é só `localStorage` (não sincroniza entre dispositivos).
- ✅ Botão "RESET" de dev agora só aparece em `import.meta.env.DEV`.

### 2.6 📦 Módulo Estoque — núcleo funcional
**✅ Completo e robusto.** `services/api.js` cobre produtos, lotes (FIFO/validade), movimentações com **estorno**, custo médio ponderado, categorias com propagação, fornecedores, importação XML/NF-e.
- 🟡 `GeneralDashboard` ("Visão Geral") tem "Resumo do Dia" como placeholder.
- 🟡 Busca/filtro de produtos é feita **em memória** (não escala >50k itens, conforme comentários no código).
- 🟡 `Inventory.jsx`: o form de editar/salvar produto **não está ligado** (handlers órfãos) — feature incompleta.

### 2.7 🍳 Módulo Ficha Técnica — `src/pages/TechnicalSheet/` + `src/modules/ficha-tecnica/`
**🟡 UI completa, backend ~50% mock/stub.** Toda a UI usa um **store de auth mock** paralelo ao `AuthContext` real.

| Submódulo | Backend | Status |
|---|---|---|
| Insumos (`inventory-management-api`) | RxDB real | ✅ Real |
| Fichas/Receitas (`recipes-management-api`) | `services/api.js` real | ✅ Real |
| Dashboard (`workbook-api` snapshot) | `mock/technical-sheet-data` | 🔴 Mock |
| Precificação (`pricing-management-api`) | valores hardcoded; approve/activate lançam erro | 🔴 Stub |
| Promoções (`promotions-management-api`) | `return []` | 🔴 Stub |
| Despesas / Equipamentos / Funcionários | `lib/api.js` (finge sucesso) | 🔴 Stub |

> **Causa raiz:** o backend de workbench não foi conectado porque o RxDB está no **teto de 16 coleções** — não há onde persistir os dados. Ver Fase 2.

### 2.8 💰 Vendas / Compras / Financeiro — prontos mas desligados
**⚠️ Completos e bloqueados.** Têm serviços reais (`sales.js`, `purchases.js`, `finance.js`, `orders.js`, `customers.js`), páginas completas (PDV, Carrinho, Pagamento, Clientes, Pedidos, dashboards) e **já estão no pipeline de sync**. Estão apenas marcados "Em breve" e travados pelo `ModuleContext`. Há ainda infraestrutura **fiscal NF-e** (`electron/fiscal/`).

### 2.9 ⚙️ Configurações — `CompanySettings.jsx`
**✅ Maduro (3 de 4 abas).** Empresa, Equipe, Segurança (backup JSON, PIN, auto-lock) — reais.
- 🔴 Aba **Licença é mock visual** (`LicenseSettings.jsx`: plano/versão hardcoded). Existe um `licenseService` **real** (trial 30 dias) que não é usado por essa tela.

### 2.10 🔄 Dados, Sync e Offline — `db/sync.js`
**✅ Sofisticado.** Pull+push bidirecional das 16 coleções, recipes via RPC, tombstones, fallback item-a-item, event-sourcing.
- 🟡 **Schema drift:** o whitelist `ALLOWED_FIELDS_BY_TABLE.products` descarta ao subir pro Supabase: `provider_id`, `brand`, `manufacturer`, `location`, `description`, `expiration_date` → ficam só no dispositivo local.

### 2.11 🖥️ Desktop / Electron — `electron/main.cjs`
**🟡 Funcional, inseguro.**
- ⚠️ `nodeIntegration: true` + `contextIsolation: false` (anti-padrão; existe `preload.js` não usado).
- 🟡 Nome do DB `evobitdb_debug_v3` ("debug" em produção); migração destrutiva por bump manual.

---

## 3. Consolidado

### ✅ Funciona bem
Login, módulo Estoque completo, RxDB + sync bidirecional, i18n, tema, PIN/auto-lock, backup/restore, equipe, build de produção.

### 🔴 Bugs (corrigidos na Fase 0)
Admin não renderizava (onboarding travado) · 12 testes quebrados · `toast` não importado em ProductGrid · `setProviderForm` inexistente em Movements · botão RESET em produção.

### 🟡 Incompleto / mock / stub (pendente)
Precificação, Promoções, Despesas, Equipamentos, Funcionários e Dashboard da Ficha Técnica · aba Licença · "Resumo do Dia" do hub · pagamento de módulos · form de editar produto no Estoque · campos de produto que não sobem no sync · reset de senha no desktop.

### 🗑️ Removido / a consolidar
Removidos: `TechnicalSheetProvisional.jsx`, `DebugAuth.jsx`. A consolidar: `lib/api.js` stub e `mock/auth.store.js` da ficha-tecnica (unificar com a API/Auth reais) · `SlidePanel`/`SheetBlock` duplicados (shared vs ficha-tecnica) · 6 dashboards separados.

### ⚠️ Riscos arquiteturais
1. **Teto de 16 coleções do RxDB** (já atingido) — bloqueia persistir o workbench e qualquer módulo novo.
2. **Dois sistemas de identidade** (AuthContext real + auth.store mock).
3. **Segurança Electron** (nodeIntegration/contextIsolation).
4. **Licença/módulos sem fonte de verdade no servidor** (tudo localStorage/mock).

---

## 4. Planejamento por fases

### Fase 0 — Estabilização ✅ CONCLUÍDA
`verify` verde: Admin/onboarding corrigido; 12 testes; lint 76→0; bugs reais (toast, setProviderForm); órfãos removidos; RESET escondido em dev.

### Fase 1 — Decisão estratégica da Ficha Técnica (0,5 dia)
Decidir entre **(A)** dar backend real ao workbench ou **(B)** enxugar para o que já é real (Insumos + Fichas). Depende de resolver o teto de coleções.

### Fase 2 — Backend da Ficha Técnica + RxDB (3–5 dias)
Resolver o cap de 16 coleções; conectar Precificação/Promoções/Despesas/Equipamentos/Funcionários ao real; aposentar `lib/api.js` stub e `mock/auth.store`.

### Fase 3 — Ativar módulos & licenciamento real (2–4 dias)
Destravar Vendas/Compras/Financeiro (já prontos); ligar `LicenseSettings` ao `licenseService`; mover licença/módulos para o Supabase; definir pagamento real (Stripe).

### Fase 4 — Hardening & Release (2–3 dias)
Segurança Electron (contextIsolation + preload); fidelidade do sync (campos de produto); repensar reset de senha no desktop; renomear DB; empacotamento e teste de instalação.

### Fase 5 — Fiscal NF-e (épico à parte)
Concluir a emissão de NF-e (`electron/fiscal/`), dependente do módulo Vendas ativo.
