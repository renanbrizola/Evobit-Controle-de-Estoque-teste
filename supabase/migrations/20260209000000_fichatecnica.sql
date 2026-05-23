-- ==============================================================================
-- MIGRATION: Módulo de Ficha Técnica (Alinhamento de Schema RxDB vs Supabase)
-- ==============================================================================

-- 1. ALTER TABLE products
-- Adicionando colunas de forma segura e idempotente
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_raw_material boolean default false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_service boolean default false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean default true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price numeric default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS average_cost numeric default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;

-- 2. CREATE TABLE recipes
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid default gen_random_uuid() primary key,
    finished_product_id uuid references public.products(id),
    name text not null,
    yield_quantity numeric default 1,
    preparation_time_minutes numeric default 0,
    instructions text,
    auto_production boolean default false,
    is_active boolean default true,
    user_id uuid references auth.users(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    deleted_at timestamp with time zone
);

-- 3. CREATE TABLE recipe_ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id uuid default gen_random_uuid() primary key,
    recipe_id uuid references public.recipes(id) on delete cascade,
    input_product_id uuid references public.products(id),
    quantity numeric not null default 0,
    unit text,
    loss_percentage numeric default 0,
    discount_from_stock boolean default true,
    user_id uuid references auth.users(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    deleted_at timestamp with time zone
);

-- 4. ENABLE RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES
-- Para Recipes
DROP POLICY IF EXISTS "Team can view recipes" ON public.recipes;
CREATE POLICY "Team can view recipes" 
ON public.recipes FOR SELECT 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipes.user_id and member_id = auth.uid())
);

DROP POLICY IF EXISTS "Team can insert recipes" ON public.recipes;
CREATE POLICY "Team can insert recipes" 
ON public.recipes FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = user_id and member_id = auth.uid())
);

DROP POLICY IF EXISTS "Team can update recipes" ON public.recipes;
CREATE POLICY "Team can update recipes" 
ON public.recipes FOR UPDATE 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipes.user_id and member_id = auth.uid())
);

-- TODO: Revisar permissões posteriormente. Atualmente, qualquer membro da equipe pode deletar.
DROP POLICY IF EXISTS "Team can delete recipes" ON public.recipes;
CREATE POLICY "Team can delete recipes" 
ON public.recipes FOR DELETE 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipes.user_id and member_id = auth.uid())
);


-- Para Recipe Ingredients
DROP POLICY IF EXISTS "Team can view recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can view recipe ingredients" 
ON public.recipe_ingredients FOR SELECT 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipe_ingredients.user_id and member_id = auth.uid())
);

DROP POLICY IF EXISTS "Team can insert recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can insert recipe ingredients" 
ON public.recipe_ingredients FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = user_id and member_id = auth.uid())
);

DROP POLICY IF EXISTS "Team can update recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can update recipe ingredients" 
ON public.recipe_ingredients FOR UPDATE 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipe_ingredients.user_id and member_id = auth.uid())
);

-- TODO: Revisar permissões posteriormente. Atualmente, qualquer membro da equipe pode deletar.
DROP POLICY IF EXISTS "Team can delete recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Team can delete recipe ingredients" 
ON public.recipe_ingredients FOR DELETE 
USING (
  user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = recipe_ingredients.user_id and member_id = auth.uid())
);

-- 6. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_finished_product_id ON public.recipes(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON public.recipes(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user_id ON public.recipe_ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_input_product_id ON public.recipe_ingredients(input_product_id);
