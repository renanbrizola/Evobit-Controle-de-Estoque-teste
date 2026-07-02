-- ==============================================================================
-- MIGRATION: preencher team_members.member_id automaticamente
-- ~50 policies de equipe casam por `team_members.member_id = auth.uid()`, mas o
-- fluxo de convite so grava owner_id + member_email + role — member_id ficava
-- NULL para sempre e nenhuma policy de equipe funcionava. Este fix liga o
-- member_id ao usuario do auth pelas duas pontas (convite e cadastro), fazendo
-- todas as policies existentes funcionarem sem reescrever nenhuma.
-- (As tabelas ft_* casam por member_email e seguem funcionando em paralelo.)
-- ==============================================================================

-- 1. Coluna (a nuvem antiga do usuario pode nao te-la; local ja tem)
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES auth.users;

-- 2. Backfill: convites de contas que ja existem
UPDATE public.team_members tm
SET member_id = u.id
FROM auth.users u
WHERE tm.member_id IS NULL
  AND tm.member_email IS NOT NULL
  AND lower(tm.member_email) = lower(u.email);

-- 3. Ao convidar alguem que JA tem conta, preenche member_id na hora
CREATE OR REPLACE FUNCTION public.team_members_fill_member_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.member_id IS NULL AND NEW.member_email IS NOT NULL THEN
        SELECT id INTO NEW.member_id
        FROM auth.users
        WHERE lower(email) = lower(NEW.member_email)
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_members_fill_member_id ON public.team_members;
CREATE TRIGGER trg_team_members_fill_member_id
BEFORE INSERT OR UPDATE OF member_email ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.team_members_fill_member_id();

-- 4. Quando o convidado CRIA a conta depois, liga os convites pendentes
CREATE OR REPLACE FUNCTION public.team_members_link_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.team_members
    SET member_id = NEW.id
    WHERE member_id IS NULL
      AND member_email IS NOT NULL
      AND lower(member_email) = lower(NEW.email);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_members_link_new_user ON auth.users;
CREATE TRIGGER trg_team_members_link_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.team_members_link_new_user();

-- 5. Indice para as RLS de equipe
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON public.team_members(member_id);
