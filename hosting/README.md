# Página de convite (evobit.com.br/user)

Página estática que recebe o **link do e-mail de convite** e deixa o novo membro
**definir a própria senha**. Depois disso ele abre o app Evobit no desktop e
entra normalmente.

É um único arquivo (`user/index.html`), sem build, sem dependências para
instalar — o `supabase-js` vem por CDN. Basta subir para uma pasta do domínio.

## Como funciona (fluxo completo)

1. Proprietário convida o e-mail em Configurações → Equipe (no app desktop).
2. A Edge Function `invite-member` chama `inviteUserByEmail(email, { redirectTo })`
   com `redirectTo = https://evobit.com.br/user`.
3. O convidado recebe o e-mail e clica no link.
4. O Supabase valida o token e redireciona para `https://evobit.com.br/user#access_token=…`.
5. Esta página lê o token, mostra o formulário e grava a senha (`updateUser`).
6. O membro abre o **app desktop** e entra com o e-mail + a senha que criou.

## Passo a passo do deploy

### 1. Configurar a página
Edite `user/index.html` e preencha no topo do `<script>`:

```js
const SUPABASE_URL = "https://SEU-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "SUA_ANON_KEY_AQUI";
```

Esses valores estão em **Dashboard → Project Settings → API** (a *anon key* é
pública, pode ficar no HTML sem problema).

### 2. Subir para o domínio
Envie o arquivo para a pasta `user/` do seu site, de modo que fique acessível em:

```
https://evobit.com.br/user   (ou  https://evobit.com.br/user/index.html)
```

Qualquer hospedagem serve (é HTML estático). O `evobit.com.br` está na
**Hostinger** (hPanel) — passo a passo lá:

1. hpanel.hostinger.com → login → **Websites** → **Gerenciar** no `evobit.com.br`.
2. Menu lateral → **Arquivos** → **Gerenciador de arquivos**.
3. Entre em **`public_html`** (a raiz onde está o site atual).
4. Botão **Nova pasta** → nome `user` → criar.
5. Entre na pasta `user` → botão **Upload** → selecione o `index.html` já
   configurado (passo 1) → aguarde concluir.
6. Teste: `https://evobit.com.br/user` deve abrir a página com a mensagem
   "Este link é inválido ou expirou" (esperado sem um convite — confirma que
   está no ar e falando com o Supabase).
Use **HTTPS** — o Supabase recusa redirect para http.

### 3. Deploy da Edge Function do convite

```bash
supabase functions deploy invite-member --project-ref SEU_PROJECT_REF
supabase secrets set INVITE_REDIRECT_URL=https://evobit.com.br/user --project-ref SEU_PROJECT_REF
```

### 4. Autorizar a URL no Supabase
Authentication → **URL Configuration**:
- **Redirect URLs**: adicione `https://evobit.com.br/user`
- **Site URL**: pode manter `https://evobit.com.br` (ou apontar para `/user`).

### 5. (Opcional) SMTP e template
- Produção: configure um SMTP próprio em Authentication → SMTP Settings (o
  e-mail padrão do Supabase tem limite baixo de envios).
- Personalize o texto em Authentication → Email Templates → **Invite user**.

## Teste
1. Convide um e-mail que ainda **não tem conta**.
2. Confira a caixa de entrada → clique no link → a página abre em `/user`.
3. Defina a senha → mensagem de sucesso.
4. Abra o app desktop → entre com o e-mail + senha → você entra como membro.

## Observações
- Se o link mostrar "inválido ou expirou": o token expira (padrão ~24h) e é de
  uso único. Reenvie o convite (remova e convide de novo).
- A página só **define a senha**; todo o resto (permissões, dados) continua no
  app. Ela não expõe nenhum dado do sistema.

---

# App web em app.evobit.com.br (próximo passo)

A landing em `evobit.com.br` aponta TODOS os CTAs ("Entrar", "Criar conta",
"Ativar módulo") para `https://app.evobit.com.br/login|/register`. Enquanto o
subdomínio não existir, esses botões dão erro de DNS. Como publicar o app web
lá (a build do Vite já é web-ready):

1. **Build com as credenciais**: crie `.env.production` na raiz do repo com
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e rode `npm run build`.
   A saída fica em `dist/`.
2. **Criar o subdomínio na Hostinger**: hPanel → Domínios → Subdomínios →
   criar `app` (vira `app.evobit.com.br`, com pasta própria, ex.:
   `public_html/app` ou `domains/app.evobit.com.br/public_html`).
3. **Subir o conteúdo de `dist/`** para essa pasta (Gerenciador de arquivos →
   Upload; dá para zipar `dist/`, subir o .zip e extrair lá).
4. **Rotas**: o app usa HashRouter (`#/login`), mas a landing linka para
   `/login` (caminho). Crie um `.htaccess` na pasta do subdomínio com fallback
   para o index (LiteSpeed/Apache):

   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```

   Assim `app.evobit.com.br/login` carrega o app (e o router assume).
5. **Supabase**: adicionar `https://app.evobit.com.br` em Auth → URL
   Configuration → Redirect URLs (e considerar como Site URL).
6. **SSL**: hPanel emite certificado para o subdomínio (Let's Encrypt) —
   conferir o cadeado antes de divulgar.

Com o app web no ar, o convite pode opcionalmente redirecionar direto para
`https://app.evobit.com.br` (o fluxo de definir senha já é tratado pelo
próprio app via `bootstrapAuthRedirect` + `PasswordSetupGate`) — a página
`/user` continua funcionando como alternativa leve.
