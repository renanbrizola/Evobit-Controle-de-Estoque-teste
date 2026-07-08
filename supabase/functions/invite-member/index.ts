// Edge Function: invite-member
// Dispara o e-mail de convite do Supabase Auth para um membro da equipe.
// Só o service_role pode chamar auth.admin.inviteUserByEmail — por isso isso
// roda aqui e não no cliente. Fluxo:
//   1. Cliente (dono) insere a linha em team_members (RLS garante que só o
//      dono consegue) e chama esta função com { email }.
//   2. A função valida o JWT do chamador e confere que existe um convite dele
//      para esse e-mail (impede uso da função como spam de convites).
//   3. inviteUserByEmail envia o e-mail; o link cria a sessão e o app abre a
//      tela de definir senha (/update-password).
//
// Deploy:  supabase functions deploy invite-member
// Secret opcional: INVITE_REDIRECT_URL (URL do app web hospedado; sem ela o
// Supabase usa a Site URL configurada em Auth → URL Configuration).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Quem está chamando? (JWT do dono, validado pelo GoTrue)
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "E-mail inválido" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // O chamador precisa ter um convite registrado para este e-mail
    const { data: invite } = await admin
      .from("team_members")
      .select("id")
      .eq("owner_id", user.id)
      .eq("member_email", email)
      .maybeSingle();
    if (!invite) {
      return json({ error: "Convite não encontrado para este e-mail" }, 403);
    }

    const redirectTo = Deno.env.get("INVITE_REDIRECT_URL") || undefined;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : {},
    );

    if (inviteError) {
      // Conta já existe: não é erro — o membro entra com a senha que já tem
      // (o trigger team_members_fill_member_id já ligou o member_id).
      if (/already.*(registered|exists|been)/i.test(inviteError.message ?? "")) {
        return json({ ok: true, alreadyRegistered: true });
      }
      return json({ error: inviteError.message }, 400);
    }

    return json({ ok: true, emailSent: true });
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});
