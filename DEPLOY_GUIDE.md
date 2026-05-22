# Guia de Deploy: Evobit App 🚀

Vamos colocar o seu aplicativo no ar agora! Siga estes passos com calma.

## Parte 1: Preparando o GitHub (Onde o código fica)

Precisamos enviar seu código para o GitHub para que a Vercel possa "ler" ele.

1.  **Crie um Repositório:**
    *   Acesse [github.com/new](https://github.com/new).
    *   Nome do repositório: `evobit-app`.
    *   Privacidade: **Private** (Importante para segurança).
    *   Clique em "Create repository".

2.  **Envie o Código (Pelo Terminal do VS Code):**
    Abra o terminal na pasta do projeto e digite um comando por vez:

    ```bash
    git init
    git add .
    git commit -m "Primeiro deploy oficial Evobit"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/evobit-app.git
    git push -u origin main
    ```
    *(Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub)*.

---

## Parte 2: Conectando a Vercel (Onde o site roda)

1.  Acesse [vercel.com](https://vercel.com) e faça login (pode usar a conta do GitHub).
2.  Clique em **"Add New..."** -> **"Project"**.
3.  Você verá o repositório `evobit-app` na lista (se conectou o GitHub). Clique em **"Import"**.

---

## Parte 3: Configuração Crítica (Environment Variables)

**NÃO CLIQUE EM DEPLOY AINDA!**

Na tela de configuração do projeto na Vercel:

1.  Procure a seção **"Environment Variables"**.
2.  Você precisa adicionar as duas chaves que estão no seu arquivo `.env` local:

    *   **Nome:** `VITE_SUPABASE_URL`
    *   **Valor:** (Copie do seu arquivo .env) `https://...`
    *   *Clique em Add*

    *   **Nome:** `VITE_SUPABASE_ANON_KEY`
    *   **Valor:** (Copie do seu arquivo .env) `eyJ...`
    *   *Clique em Add*

3.  Agora sim, clique em **"Deploy"**.

---

## Parte 4: Finalização

A Vercel vai instalar tudo e construir o site. Em cerca de 1 a 2 minutos, você verá fogos de artifício na tela e um link como:
`https://evobit-app.vercel.app`

**Pronto! Esse é o link oficial do seu sistema.**
Envie para seu celular, instale como App (Adicionar à Tela de Início) e teste!

---
**Precisa de ajuda com o comando git?** Me avise que eu gero o comando exato com seu usuário se me disser qual é.

---

## Parte 5: Domínio Personalizado (evobit.com.br) 🌐

Se você já comprou o domínio `evobit.com.br`, configurar na Vercel é fácil:

1.  No painel do projeto na Vercel, vá em **Settings** (Configurações).
2.  No menu lateral, clique em **Domains**.
3.  Digite `evobit.com.br` no campo e clique em **Add**.
4.  A Vercel vai te dar uns números (DNS Records).
    *   Provavelmente um **A Record** (Tipo A) com valor `76.76.21.21`.
    *   Ou um **CNAME** se for subdomínio.
5.  Acesse o site onde você comprou o domínio (GoDaddy, Registro.br, Hostinger, etc).
6.  Vá em **Configurar DNS** e adicione esses registros que a Vercel pediu.
7.  Aguarde (pode levar de 1h a 24h para propagar).

Quando ficar "Verde" na Vercel, seu site abrirá oficial em `evobit.com.br`!
