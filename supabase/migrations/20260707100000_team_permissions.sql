-- ==============================================================================
-- MIGRATION: permissões granulares por membro da equipe
-- O dono da loja tem acesso total (user_id = auth.uid() em todas as policies).
-- Membros convidados passam a ser LIMITADOS por padrão (somente leitura) e o
-- dono libera permissões pelo app (TeamSettings), gravadas em
-- team_members.permissions (jsonb):
--   { "inventory_write": bool, "technical_sheet_write": bool, "can_delete": bool }
--
-- Chaves:
--   inventory_write       → criar/editar produtos, fornecedores, movimentações,
--                           lotes e categorias
--   technical_sheet_write → criar/editar fichas (recipes) e workbook ft_*
--                           (produtos também, pois insumos/fichas criam produtos)
--   can_delete            → excluir registros (produtos, fornecedores, fichas...)
--
-- Obs: o app usa soft-delete (UPDATE deleted_at) — o gate de exclusão é
-- aplicado no cliente; as policies de DELETE abaixo cobrem exclusões físicas.
-- DEPENDE de 20260702300000_team_member_id_link.sql (team_members.member_id).
-- ==============================================================================

-- ─── 1. Coluna de permissões (default: membro somente leitura) ───────────────
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── 2. Helper: membro tem a permissão? ──────────────────────────────────────
-- SECURITY DEFINER para as policies de outras tabelas lerem team_members sem
-- depender da RLS dela; STABLE para o planner reaproveitar no statement.
CREATE OR REPLACE FUNCTION public.team_member_can(p_owner uuid, p_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE owner_id = p_owner
      AND member_id = auth.uid()
      AND COALESCE((permissions->>p_perm)::boolean, false)
  );
$$;

REVOKE ALL ON FUNCTION public.team_member_can(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_member_can(uuid, text) TO authenticated;

-- ─── 3. PRODUCTS ──────────────────────────────────────────────────────────────
-- Escrita liberada por estoque OU ficha técnica: insumos e fichas criam/atualizam
-- produtos (master data compartilhado entre os dois módulos).
DROP POLICY IF EXISTS "Team can insert products" ON public.products;
CREATE POLICY "Team can insert products"
ON public.products FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'inventory_write')
  OR public.team_member_can(user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Team can update products" ON public.products;
CREATE POLICY "Team can update products"
ON public.products FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(products.user_id, 'inventory_write')
  OR public.team_member_can(products.user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Team can delete products" ON public.products;
CREATE POLICY "Team can delete products"
ON public.products FOR DELETE
USING (
  user_id = auth.uid()
  OR public.team_member_can(products.user_id, 'can_delete')
);

-- ─── 4. PROVIDERS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Team can insert providers" ON public.providers;
CREATE POLICY "Team can insert providers"
ON public.providers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'inventory_write')
);

DROP POLICY IF EXISTS "Team can update providers" ON public.providers;
CREATE POLICY "Team can update providers"
ON public.providers FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(providers.user_id, 'inventory_write')
);

DROP POLICY IF EXISTS "Admins can delete providers" ON public.providers;
DROP POLICY IF EXISTS "Team can delete providers" ON public.providers;
CREATE POLICY "Team can delete providers"
ON public.providers FOR DELETE
USING (
  user_id = auth.uid()
  OR public.team_member_can(providers.user_id, 'can_delete')
);

-- ─── 5. MOVEMENTS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Team can insert movements" ON public.movements;
CREATE POLICY "Team can insert movements"
ON public.movements FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'inventory_write')
);

DROP POLICY IF EXISTS "Users can update own movements" ON public.movements;
DROP POLICY IF EXISTS "Team can update movements" ON public.movements;
CREATE POLICY "Team can update movements"
ON public.movements FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(movements.user_id, 'inventory_write')
);

-- ─── 6. PRODUCT_BATCHES ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Team can insert batches" ON public.product_batches;
CREATE POLICY "Team can insert batches"
ON public.product_batches FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'inventory_write')
);

DROP POLICY IF EXISTS "Team can update batches" ON public.product_batches;
CREATE POLICY "Team can update batches"
ON public.product_batches FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(product_batches.user_id, 'inventory_write')
);

-- ─── 7. RECIPES + RECIPE_INGREDIENTS ─────────────────────────────────────────
-- O push vai pela RPC sync_recipe_with_ingredients (SECURITY INVOKER), então
-- estas policies valem também para o sync do membro.
DROP POLICY IF EXISTS "Team can insert recipes" ON public.recipes;
CREATE POLICY "Team can insert recipes"
ON public.recipes FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Team can update recipes" ON public.recipes;
CREATE POLICY "Team can update recipes"
ON public.recipes FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(recipes.user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Team can delete recipes" ON public.recipes;
CREATE POLICY "Team can delete recipes"
ON public.recipes FOR DELETE
USING (
  user_id = auth.uid()
  OR public.team_member_can(recipes.user_id, 'can_delete')
);

DROP POLICY IF EXISTS "Team can insert recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can insert recipe ingredients"
ON public.recipe_ingredients FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.team_member_can(user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Team can update recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can update recipe ingredients"
ON public.recipe_ingredients FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.team_member_can(recipe_ingredients.user_id, 'technical_sheet_write')
);

DROP POLICY IF EXISTS "Team can delete recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can delete recipe ingredients"
ON public.recipe_ingredients FOR DELETE
USING (
  user_id = auth.uid()
  OR public.team_member_can(recipe_ingredients.user_id, 'can_delete')
);

-- ─── 8. Tabelas ft_* (workbook + preços) ──────────────────────────────────────
-- Normaliza o casamento de membro para member_id (antes era member_email no
-- JWT) e exige technical_sheet_write nas escritas. Exclusões nas ft_* são
-- edição rotineira do workbook (despesas, funcionários...) — ficam no mesmo
-- gate de escrita, não no can_delete.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ft_workbook_settings', 'ft_operating_expenses', 'ft_depreciation_assets',
    'ft_staff', 'ft_electric_equipment', 'ft_gas_equipment', 'ft_gas_bottles'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_select" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_select" ON public.%I FOR SELECT USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = %I.user_id and tm.member_id = auth.uid()))', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_insert" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid() OR public.team_member_can(user_id, ''technical_sheet_write''))', t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_update" ON public.%I FOR UPDATE USING (user_id = auth.uid() OR public.team_member_can(%I.user_id, ''technical_sheet_write''))', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_delete" ON public.%I FOR DELETE USING (user_id = auth.uid() OR public.team_member_can(%I.user_id, ''technical_sheet_write''))', t, t);
  END LOOP;
END $$;

-- ft_prices tem nomes de policy próprios (migration 20260630)
DO $$
BEGIN
  IF to_regclass('public.ft_prices') IS NULL THEN RETURN; END IF;

  DROP POLICY IF EXISTS "ft_prices_select" ON public.ft_prices;
  CREATE POLICY "ft_prices_select" ON public.ft_prices FOR SELECT
    USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = ft_prices.user_id and tm.member_id = auth.uid()));

  DROP POLICY IF EXISTS "ft_prices_insert" ON public.ft_prices;
  CREATE POLICY "ft_prices_insert" ON public.ft_prices FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.team_member_can(user_id, 'technical_sheet_write'));

  DROP POLICY IF EXISTS "ft_prices_update" ON public.ft_prices;
  CREATE POLICY "ft_prices_update" ON public.ft_prices FOR UPDATE
    USING (user_id = auth.uid() OR public.team_member_can(ft_prices.user_id, 'technical_sheet_write'));

  DROP POLICY IF EXISTS "ft_prices_delete" ON public.ft_prices;
  CREATE POLICY "ft_prices_delete" ON public.ft_prices FOR DELETE
    USING (user_id = auth.uid() OR public.team_member_can(ft_prices.user_id, 'technical_sheet_write'));
END $$;

-- ─── 9. CATEGORIES (tabela criada fora das migrations do repo) ────────────────
-- Se existir na nuvem, zera as policies atuais (estado desconhecido) e aplica
-- o mesmo padrão de equipe das demais tabelas de estoque.
DO $$
DECLARE r record;
BEGIN
  IF to_regclass('public.categories') IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE 'categories sem coluna user_id — policies de equipe NÃO aplicadas';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY';
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' LOOP
    EXECUTE format('DROP POLICY %I ON public.categories', r.policyname);
  END LOOP;

  CREATE POLICY "Team can view categories" ON public.categories FOR SELECT
    USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = categories.user_id and tm.member_id = auth.uid()));
  CREATE POLICY "Team can insert categories" ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.team_member_can(user_id, 'inventory_write'));
  CREATE POLICY "Team can update categories" ON public.categories FOR UPDATE
    USING (user_id = auth.uid() OR public.team_member_can(categories.user_id, 'inventory_write'));
  CREATE POLICY "Team can delete categories" ON public.categories FOR DELETE
    USING (user_id = auth.uid() OR public.team_member_can(categories.user_id, 'can_delete'));
END $$;
