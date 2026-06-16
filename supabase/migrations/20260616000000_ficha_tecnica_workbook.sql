-- ==============================================================================
-- MIGRATION: Ficha Tecnica - Workbench (custos operacionais)
-- Opcao C da Fase 2: persistencia online-first via Supabase (espelha team_members),
-- sem ocupar coleshoes do RxDB (teto de 16 ja atingido).
-- ==============================================================================

-- 1. CONFIGURACOES (singleton por usuario)
CREATE TABLE IF NOT EXISTS public.ft_workbook_settings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null unique,
    work_days_per_week numeric default 6,
    work_hours_per_day numeric default 8,
    target_margin_percent numeric default 0,
    average_monthly_kwh numeric default 0,
    electric_other_costs numeric default 0,
    kwh_price numeric default 0,
    card_fee_percent numeric default 0,
    delivery_fee_percent numeric default 0,
    commission_percent numeric default 0,
    tax_percent numeric default 0,
    operational_cost_percent numeric default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now())
);

-- 2. DESPESAS OPERACIONAIS (fixas / variaveis)
CREATE TABLE IF NOT EXISTS public.ft_operating_expenses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    type text not null default 'FIXED' check (type in ('FIXED', 'VARIABLE')),
    name text not null,
    amount numeric default 0,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- 3. DEPRECIACAO DE ATIVOS
CREATE TABLE IF NOT EXISTS public.ft_depreciation_assets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    category text,
    asset_name text not null,
    invoice_value numeric default 0,
    linear boolean default true,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- 4. FUNCIONARIOS (folha)
CREATE TABLE IF NOT EXISTS public.ft_staff (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    is_active boolean default true,
    name text not null,
    role text,
    salary numeric default 0,
    fgts numeric default 0,
    thirteenth numeric default 0,
    vacation numeric default 0,
    fgts_vacation numeric default 0,
    weekly_hours numeric default 0,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- 5. EQUIPAMENTOS ELETRICOS
CREATE TABLE IF NOT EXISTS public.ft_electric_equipment (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    power_watts numeric default 0,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- 6. EQUIPAMENTOS A GAS
CREATE TABLE IF NOT EXISTS public.ft_gas_equipment (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    kg_per_hour numeric default 0,
    bottle_kg numeric default 0,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- 7. BOTIJOES DE GAS
CREATE TABLE IF NOT EXISTS public.ft_gas_bottles (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    code text not null,
    capacity_kg numeric default 0,
    price numeric,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()),
    updated_at timestamptz default timezone('utc'::text, now()),
    deleted_at timestamptz
);

-- ==============================================================================
-- RLS + POLICIES por equipe (mesma regra de recipes: dono OU membro da equipe)
-- ==============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ft_workbook_settings', 'ft_operating_expenses', 'ft_depreciation_assets',
    'ft_staff', 'ft_electric_equipment', 'ft_gas_equipment', 'ft_gas_bottles'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_select" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_select" ON public.%I FOR SELECT USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = %I.user_id and tm.member_email = (auth.jwt() ->> 'email')))', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_insert" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = user_id and tm.member_email = (auth.jwt() ->> 'email')))', t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_update" ON public.%I FOR UPDATE USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = %I.user_id and tm.member_email = (auth.jwt() ->> 'email')))', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "ft_team_delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ft_team_delete" ON public.%I FOR DELETE USING (user_id = auth.uid() OR exists (select 1 from public.team_members tm where tm.owner_id = %I.user_id and tm.member_email = (auth.jwt() ->> 'email')))', t, t);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_user_id ON public.%I(user_id)', t, t);
  END LOOP;
END $$;
