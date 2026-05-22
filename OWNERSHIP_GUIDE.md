# Guia de Propriedade e Continuidade do Sistema 🛡️

Este documento serve para garantir que você, **Renan**, tenha total controle, propriedade e capacidade de manter o **Evobit App** funcionando para sempre, independentemente de qualquer serviço externo ou desenvolvedor.

## 1. Onde está o seu sistema?

Atualmente, o sistema existe em duas partes:

1.  **Código Fonte (O "Cérebro"):**
    *   **Localização:** `C:\Users\Renan\OneDrive\Desktop\teste app estoque\studio-frans-app`
    *   **O que é:** Todos os arquivos `.jsx`, `.css`, configurações e lógica do sistema.
    *   **Propriedade:** **100% Sua.** Este código está na sua máquina física e no seu OneDrive. Ninguém pode tirá-lo de você.

2.  **Banco de Dados (A "Memória"):**
    *   **Localização:** Hospedado no **Supabase** (Plataforma em Nuvem).
    *   **O que é:** Todos os dados de produtos, fornecedores, movimentações e usuários.
    *   **Propriedade:** **Seus Dados.** Embora hospedado na nuvem, você pode (e deve) fazer backups regulares.

---

## 2. Como garantir que nada se perca? (Backups)

### A. Backup do Código (Aplicação)
Como o código já está na sua pasta `OneDrive`, ele já está automaticamente salvo na nuvem da Microsoft.
*   **Recomendação Extra:** A cada grande atualização, copie a pasta `studio-frans-app` para um Pen Drive ou HD Externo, ou faça um arquivo `.zip`.

### B. Backup do Banco de Dados (Dados)
O Supabase armazena seus dados. Para garantir que você nunca os perca:
1.  Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2.  Vá em **Database** -> **Backups**.
3.  Você pode baixar um "Dump" (arquivo `.sql`) de todo o seu banco de dados a qualquer momento.
4.  **Dica:** Exporte seus dados via CSV/Excel pelo próprio aplicativo (funcionalidade que acabamos de criar) regularmente para ter uma cópia legível.

---

## 3. "E se serviços acabarem?" (Independência)

### O framework (React/Vite)
O site é construído com tecnologias de código aberto (React, Node.js).
*   **Significado:** Mesmo que a empresa Google, Microsoft ou Vercel desapareça, essas tecnologias continuarão existindo. Qualquer desenvolvedor Web do mundo sabe trabalhar com isso.

### O Banco de Dados (PostgreSQL)
O Supabase usa **PostgreSQL**, o banco de dados mais comum do mundo.
*   **Significado:** Se o Supabase fechar ou ficar caro, você pode pegar seu backup `.sql` e colocar em QUALQUER outro serviço (AWS, Google Cloud, Azure, ou até num servidor caseiro). Você não está "preso" a eles para sempre.

---

## 4. Como rodar o projeto no futuro?

Se daqui a 5 anos você trocar de computador e quiser rodar o sistema:

1.  **Instale o Node.js:** (Baixe no site oficial nodejs.org)
2.  **Copie sua pasta** do projeto para o novo PC.
3.  **Abra o terminal** na pasta e digite:
    *   `npm install` (Para baixar as dependências)
    *   `npm run dev` (Para rodar o app)
4.  **Conecte o Banco:** Certifique-se de que o arquivo `.env` (onde ficam as chaves de acesso) esteja junto, ou reconfigure as chaves do seu banco de dados.

---

## ✅ Resumo da Garantia

1.  **O Código é seu.** Está no seu HD.
2.  **Os Dados são seus.** Você pode exportar quando quiser.
3.  **A Tecnologia é Padrão.** Não usamos nada "mágico" ou proprietário que tranque você.
4.  **Sem Mensalidade de Software.** O app é seu, não é um aluguel. (O único custo eventual é a hospedagem na nuvem se o sistema crescer muito, mas o código continua sendo seu).

Este sistema foi construído para ser **SEU**.
