# Arquitetura de Segurança Profissional & Conformidade 🛡️

Este documento detalha as medidas de segurança de nível empresarial implementadas no **Evobit App**, garantindo proteção contra ataques, rastreabilidade (Anti-Tamper) e integridade de dados.

## 1. Integridade de Dados & Anti-Tamper (Banco de Dados)

### 1.1. Auditoria Imutável (`audit_logs`)
Implementamos um sistema de **Auditoria de Banco de Dados** que opera no nível mais baixo do sistema (Triggers SQL).
*   **O que faz:** Cada INSERT, UPDATE ou DELETE nas tabelas críticas (`products`, `movements`, `providers`, `team_members`) é gravado automaticamente.
*   **Por que é seguro:** A gravação é feita pelo próprio banco de dados. Mesmo que um hacker (ou usuário mal intencionado) tente alterar o estoque via API ou Console, o banco registrará a ação.
*   **Inviolabilidade:** As políticas de segurança (RLS) da tabela de logs são configuradas como **Write-Only** para o sistema e **Read-Only** para Admins. Ninguém pode deletar ou alterar um log já escrito.

### 1.2. Row Level Security (RLS) Rigoroso
O sistema opera sob o princípio de "Zero Trust".
*   As regras de acesso ao banco de dados garantem que um usuário só pode acessar dados que pertencem explicitamente à sua empresa (`company_id`).
*   Tentativas de acessar dados de outros inquilinos (Tenants) são bloqueadas no nível do kernel do banco de dados PostgreSQL.

## 2. Proteção Contra Ataques (Anti-Hack)

### 2.1. Sanitização de Entrada (Anti-XSS)
Todos os dados importados via planilhas (Excel/CSV) passam por uma camada de **Sanitização** no Frontend antes de serem processados.
*   **Mecanismo:** Removemos tags HTML (`<script>`, `<iframe>`) e caracteres perigosos de todos os campos de texto.
*   **Benefício:** Impede ataques de *Cross-Site Scripting* (XSS) onde um atacante poderia inserir scripts maliciosos em uma planilha para roubar sessões de outros usuários.

### 2.2. Cabeçalhos de Segurança HTTP (Headers)
O servidor de aplicação (Vercel) foi configurado com headers de resposta "Militar-Grade":
*   `X-Content-Type-Options: nosniff`: Impede que o navegador "adivinhe" tipos de arquivo (proteção contra upload malicioso).
*   `X-Frame-Options: DENY`: Impede que seu site seja colocado dentro de um `<iframe>` em sites de terceiros (Proteção contra **Clickjacking**).
*   `X-XSS-Protection: 1; mode=block`: Ativa filtros de XSS nativos dos navegadores.
*   `Referrer-Policy: strict-origin-when-cross-origin`: Protege dados de navegação.

## 3. Criptografia & Privacidade

*   **Em Trânsito:** Toda comunicação Cliente-Servidor é forçada via **HTTPS (TLS 1.2+)**.
*   **Em Repouso:** O banco de dados Supabase utiliza criptografia de disco (AES-256).
*   **Dados Sensíveis:** Senhas nunca são armazenadas em texto plano (são feito hashes seguros via Supabase Auth).

## 4. Conclusão para Auditoria

Este sistema atende aos requisitos modernos de segurança para aplicações corporativas, implementando defesa em profundidade:
1.  **Frontend:** Sanitização e Validação.
2.  **Transporte:** HTTPS e Headers Seguros.
3.  **Backend:** Autenticação Robusta e Validação de Schema.
4.  **Database:** RLS e Auditoria Imutável.

---
**Status:** ✅ PROTEGIDO E MONITORADO
