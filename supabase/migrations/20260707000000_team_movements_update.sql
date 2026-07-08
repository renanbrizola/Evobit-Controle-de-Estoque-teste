-- ==============================================================================
-- MIGRATION: modo equipe — UPDATE de movements para membros
-- A policy de UPDATE criada em 20260702 (alinhamento do sync) só cobria o dono
-- (auth.uid() = user_id). No modo equipe o membro grava movimentações com
-- user_id do DONO da loja, e o sync faz upsert (INSERT ... ON CONFLICT UPDATE):
-- sem esta policy o push do membro falha na parte de UPDATE. Mesmo shape das
-- policies "Team can ..." de products/providers (V24).
-- DEPENDE de 20260702300000_team_member_id_link.sql (cria a coluna
-- team_members.member_id) — sem ela: ERROR 42703 column "member_id" does not exist.
-- ==============================================================================

DROP POLICY IF EXISTS "Users can update own movements" ON public.movements;

CREATE POLICY "Team can update movements"
ON public.movements FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE owner_id = movements.user_id
      AND member_id = auth.uid()
  )
);
