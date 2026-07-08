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

Qualquer hospedagem serve (cPanel/FTP, Vercel, Netlify, S3…). É HTML estático.
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
