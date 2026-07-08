-- ==============================================================================
-- MIGRATION: limite de membros + exclusividade dono/membro
-- Regras de negócio (fonte da verdade no banco, o cliente só antecipa a UX):
--   R3. Cada conta tem no máximo 2 membros. Acima disso, precisa contratar
--       membros adicionais (limite por dono em team_member_limits; default 2).
--   R4. Uma conta é DONO ou MEMBRO, nunca os dois:
--       - não se convida um e-mail que já tem conta própria (proprietário);
--       - não se convida um e-mail que já é membro de outra equipe;
--       - cada pessoa é membro de no máximo UMA equipe (unique em member_id).
-- DEPENDE de 20260702300000 (member_id) e 20260707100000 (permissions).
-- ==============================================================================

-- ─── R3: limite de membros por dono ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_member_limits (
  owner_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  max_members int NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_member_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own limit" ON public.team_member_limits;
CREATE POLICY "owner reads own limit" ON public.team_member_limits
  FOR SELECT USING (owner_id = auth.uid());
-- Escrita só via service_role (futuro fluxo de pagamento) — sem policy de write.

CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  SELECT max_members INTO v_limit FROM public.team_member_limits WHERE owner_id = NEW.owner_id;
  IF v_limit IS NULL THEN v_limit := 2; END IF;

  SELECT count(*) INTO v_count FROM public.team_members WHERE owner_id = NEW.owner_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % membros atingido para esta conta.', v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_team_member_limit ON public.team_members;
CREATE TRIGGER trg_enforce_team_member_limit
BEFORE INSERT ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_limit();

-- ─── R4: cada pessoa é membro de no máximo uma equipe ────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_member_id
  ON public.team_members(member_id) WHERE member_id IS NOT NULL;

-- ─── R4: RPC de pré-checagem do convite (usada pelo cliente) ─────────────────
-- Retorna: 'free' | 'owner' | 'member_here' | 'member_elsewhere'
--   free            → e-mail sem conta; o convite pode criar a conta
--   owner           → e-mail já tem conta própria (proprietário) → bloquear
--   member_here     → já é membro DESTA equipe (re-convite) → unique responde
--   member_elsewhere→ já é membro de outra equipe → bloquear
CREATE OR REPLACE FUNCTION public.check_invite_email(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_user_id uuid;
  v_member_owner uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT owner_id INTO v_member_owner
  FROM public.team_members
  WHERE member_id = v_user_id
  LIMIT 1;

  IF v_member_owner IS NOT NULL THEN
    IF v_member_owner = v_caller THEN
      RETURN 'member_here';
    END IF;
    RETURN 'member_elsewhere';
  END IF;

  -- Tem conta e não é membro de ninguém → é proprietário da própria loja
  RETURN 'owner';
END;
$$;

REVOKE ALL ON FUNCTION public.check_invite_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_email(text) TO authenticated;

-- ─── R4: enforce no INSERT (defesa em profundidade além do RPC do cliente) ───
-- Substitui a antiga team_members_fill_member_id: antes ela LIGAVA member_id de
-- contas já existentes ao convidar; agora isso é justamente o caso proibido
-- (conta existente = proprietário). Contas novas continuam sendo ligadas no
-- aceite via team_members_link_new_user (trigger em auth.users).
CREATE OR REPLACE FUNCTION public.team_members_fill_member_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.member_id IS NOT NULL OR NEW.member_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(NEW.member_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN NEW; -- e-mail sem conta: convite cria a conta depois
  END IF;

  -- Já é membro de outra equipe?
  IF EXISTS (SELECT 1 FROM public.team_members WHERE member_id = v_user_id AND owner_id <> NEW.owner_id) THEN
    RAISE EXCEPTION 'Este e-mail já é membro de outra equipe.' USING ERRCODE = 'P0001';
  END IF;

  -- Já é membro DESTA equipe? liga o id e deixa o unique (owner_id,email) barrar a duplicata
  IF EXISTS (SELECT 1 FROM public.team_members WHERE member_id = v_user_id AND owner_id = NEW.owner_id) THEN
    NEW.member_id := v_user_id;
    RETURN NEW;
  END IF;

  -- Tem conta e não é membro de ninguém → proprietário: não pode virar membro
  RAISE EXCEPTION 'Este e-mail já possui conta própria (proprietário).' USING ERRCODE = 'P0001';
END;
$$;

-- ─── R4: ao criar a conta pelo convite, liga só o convite mais antigo ────────
-- (com o unique em member_id, ligar vários convites pendentes ao mesmo id
-- falharia; uma pessoa entra em uma equipe só.)
CREATE OR REPLACE FUNCTION public.team_members_link_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_members
  SET member_id = NEW.id
  WHERE id = (
    SELECT id FROM public.team_members
    WHERE member_id IS NULL
      AND member_email IS NOT NULL
      AND lower(member_email) = lower(NEW.email)
    ORDER BY created_at ASC
    LIMIT 1
  );
  RETURN NEW;
END;
$$;
