# Convite de membros por e-mail — deploy e configuração

O convite de equipe tem duas metades:

1. **Registrar o convite** (`team_members`) — funciona só com o SQL das migrations aplicado. O membro aparece na lista como *Pendente*.
2. **Disparar o e-mail** para o convidado confirmar o cadastro e definir a senha — depende desta Edge Function (`invite-member`) **deployada** + a app rodando na **web** + as **URLs de Auth** configuradas.

Enquanto a metade 2 não estiver pronta, o convite continua válido: o convidado pode criar a conta manualmente na tela de cadastro usando o mesmo e-mail (os triggers ligam o `member_id` no aceite).

---

## Pré-requisitos

- Migrations de equipe aplicadas na nuvem (até `20260708000000_team_limits_and_exclusivity.sql`).
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado (`supabase login`).
- O `project-ref` do projeto (Dashboard → Project Settings → General → *Reference ID*).

---

## 1. Deploy da Edge Function

```bash
# na raiz do repo
supabase functions deploy invite-member --project-ref SEU_PROJECT_REF
```

A função usa `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY`, que **já são injetadas automaticamente** em funções deployadas — não precisa configurar secret para elas.

Secret **opcional** (para onde o link do e-mail leva o convidado):

```bash
supabase secrets set INVITE_REDIRECT_URL=https://SEU-APP-WEB.vercel.app --project-ref SEU_PROJECT_REF
```

Sem esse secret, a função usa a *Site URL* configurada no Auth (passo 3).

Teste rápido de que subiu:

```bash
supabase functions list --project-ref SEU_PROJECT_REF   # deve listar invite-member
```

---

## 2. Hospedar a app na web (obrigatório para o e-mail funcionar)

O link do e-mail de convite abre no **navegador** — ele **não abre o app desktop** (Electron). Então o convidado precisa de uma página web para definir a senha. A mesma build do Vite serve para web:

1. Faça deploy do projeto (ex.: Vercel/Netlify) apontando para `npm run build` (saída em `dist/`).
2. Configure as variáveis de ambiente no host:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Anote a URL pública (ex.: `https://evobit.vercel.app`).

A app usa `HashRouter`, então o link de definição de senha fica em `https://SEU-APP-WEB/#/update-password`. O redirecionamento automático já está tratado no código (`bootstrapAuthRedirect.js` + `PasswordSetupGate`): o token do e-mail é capturado e o app leva o convidado direto para a tela de senha.

---

## 3. Configurar as URLs de Auth (Dashboard)

Authentication → **URL Configuration**:

- **Site URL**: `https://SEU-APP-WEB` (a URL pública do passo 2).
- **Redirect URLs** (adicione as duas):
  - `https://SEU-APP-WEB`
  - `https://SEU-APP-WEB/#/update-password`

Sem isso, o Supabase recusa o redirect e o link do e-mail não completa o login.

---

## 4. E-mail (SMTP) e template

- **Teste**: o e-mail padrão do Supabase funciona, mas tem limite baixo de envios/hora.
- **Produção**: Authentication → **SMTP Settings** → configure um SMTP próprio (SendGrid, Resend, Amazon SES, etc.). Sem SMTP próprio, envios em volume são bloqueados.
- **Template**: Authentication → **Email Templates** → *Invite user* → personalize o texto em pt-BR (ex.: "Você foi convidado para a equipe no Evobit. Clique para definir sua senha.").

---

## 5. Checklist de teste (2 contas, máquinas/navegadores separados)

1. Proprietário convida `membro@exemplo.com` → toast "Convidado com sucesso" + toast de e-mail enviado.
2. Chega o e-mail no convidado → clicar no link → abre a web na tela de **definir senha**.
3. Define a senha → loga → vê os dados do proprietário (só leitura, sem permissões liberadas).
4. Proprietário marca "Editar Estoque" no card do membro.
5. Membro **desloga/loga (ou F5)** → agora consegue criar/editar estoque; o registro aparece para o proprietário no próximo sync (~60s).
6. Tentar convidar um 3º e-mail → bloqueado ("Limite de 2 membros").
7. Tentar convidar um e-mail que já é proprietário → bloqueado ("já possui conta própria").

---

## Como a função se comporta se algo faltar

- **Função não deployada**: `api.teams.invite` registra o convite, mas `sendInviteEmail` retorna `emailSent: false` → o app mostra o aviso "convite registrado, mas o e-mail não pôde ser enviado". O convidado cria a conta manualmente.
- **`check_invite_email` ausente** (migration não aplicada): o app não consegue pré-bloquear proprietário/membro alheio; o trigger no banco ainda barra no INSERT quando a migration estiver aplicada.
- **Limite pago (> 2 membros)**: insira/atualize uma linha em `public.team_member_limits(owner_id, max_members)` para o proprietário. O fluxo de cobrança automática (Stripe) ainda não existe.
