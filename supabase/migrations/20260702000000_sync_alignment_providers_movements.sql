-- ==============================================================================
-- MIGRATION: Alinhamento de schema para o sync (providers + movements)
-- O RxDB local tem mais campos do que as tabelas do Supabase; o push falhava
-- com PGRST204 ("Could not find the 'address'/'date' column") e fornecedores/
-- movimentacoes nunca subiam para a nuvem. Adiciona as colunas que o app usa,
-- relaxa o CHECK legado de movements.type e faz backfill dos cursores.
-- ==============================================================================

-- ─── PROVIDERS: colunas do cadastro completo (RxDB providerSchema v3) ────────
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS ie text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS im text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS mobile_phone text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS email_nfe text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "number" text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS complement text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS delivery_time text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS product_types text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS order_day text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS bank_info text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS credit_limit numeric;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Backfill: linhas antigas precisam de updated_at para entrarem no pull incremental
UPDATE public.providers SET updated_at = created_at WHERE updated_at IS NULL;

-- ─── MOVEMENTS: colunas do RxDB movementSchema v1 ────────────────────────────
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS cost_unit numeric;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS date timestamptz;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS validity text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- O app usa `quantity`; `qty` vira coluna legada (espelhada pelo sync)
ALTER TABLE public.movements ALTER COLUMN qty DROP NOT NULL;

-- O app grava 'Entrada'/'Saída'/'Ajuste' (o CHECK antigo so aceitava 2 valores)
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_type_check;
ALTER TABLE public.movements ADD CONSTRAINT movements_type_check
  CHECK (type IN ('Entrada', 'Saída', 'Ajuste', 'IN', 'OUT', 'ADJUSTMENT'));

-- Backfill das linhas antigas
UPDATE public.movements SET quantity = qty WHERE quantity IS NULL;
UPDATE public.movements SET date = created_at WHERE date IS NULL;
UPDATE public.movements SET updated_at = created_at WHERE updated_at IS NULL;

-- Upsert do sync precisa de UPDATE (o baseline so tinha SELECT/INSERT p/ movements)
DROP POLICY IF EXISTS "Users can update own movements" ON public.movements;
CREATE POLICY "Users can update own movements"
ON public.movements FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes para o pull incremental
CREATE INDEX IF NOT EXISTS idx_providers_updated_at ON public.providers(updated_at);
CREATE INDEX IF NOT EXISTS idx_movements_updated_at ON public.movements(updated_at);
