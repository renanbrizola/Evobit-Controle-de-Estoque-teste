-- ==============================================================================
-- MIGRATION: Ficha Tecnica - Precificacao (ft_prices)
-- Guarda o snapshot de cada precificacao salva (taxas, margem, custo, notas),
-- 1 registro ATIVO por receita (upsert por recipe_id). Online-first via Supabase,
-- mesmo padrao do ft_workbook (sem ocupar colecoes do RxDB).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ft_prices (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    recipe_id uuid not null unique,
    recipe_version_id text,
    finished_product_id uuid,
    pricing_unit text,
    status text default 'ACTIVE',
    target_margin_percent numeric default 0,
    card_fee_percent numeric default 0,
    delivery_fee_percent numeric default 0,
    commission_percent numeric default 0,
    tax_percent numeric default 0,
    operational_cost_percent numeric default 0,
    unit_cost numeric default 0,
    suggested_price numeric default 0,
    final_price numeric default 0,
    margin_percent numeric default 0,
    markup_factor numeric default 0,
    cmv_percent numeric default 0,
    notes text,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- RLS por equipe (dono OU membro da equipe por email), igual ao ft_workbook.
ALTER TABLE public.ft_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ft_prices_select" ON public.ft_prices;
CREATE POLICY "ft_prices_select" ON public.ft_prices FOR SELECT
USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = ft_prices.user_id and tm.member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "ft_prices_insert" ON public.ft_prices;
CREATE POLICY "ft_prices_insert" ON public.ft_prices FOR INSERT
WITH CHECK (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = user_id and tm.member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "ft_prices_update" ON public.ft_prices;
CREATE POLICY "ft_prices_update" ON public.ft_prices FOR UPDATE
USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = ft_prices.user_id and tm.member_email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "ft_prices_delete" ON public.ft_prices;
CREATE POLICY "ft_prices_delete" ON public.ft_prices FOR DELETE
USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = ft_prices.user_id and tm.member_email = (auth.jwt() ->> 'email')));

CREATE INDEX IF NOT EXISTS idx_ft_prices_user_id ON public.ft_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_ft_prices_recipe_id ON public.ft_prices(recipe_id);
