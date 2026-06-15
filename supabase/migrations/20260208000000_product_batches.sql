-- ==============================================================================
-- MIGRATION V26: Sistema de Lotes (Product Batches)
-- DATA: 2026-02-10
-- ==============================================================================

-- 1. Criar tabela de lotes
-- Cada entrada de produto gera um lote com custo, quantidade e validade próprios
create table if not exists public.product_batches (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  quantity numeric not null default 0,        -- Quantidade remanescente
  initial_quantity numeric not null default 0, -- Quantidade original do lote
  cost_unit numeric not null default 0,        -- Custo unitário de aquisição
  expiration_date text,                        -- Validade deste lote (opcional)
  provider text,                               -- Fornecedor deste lote
  movement_id uuid,                            -- Movimento de entrada que gerou este lote
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone           -- Tombstone para soft delete
);

-- 2. Ativar RLS
alter table public.product_batches enable row level security;

-- 3. Políticas de segurança (mesma lógica de teams)
create policy "Team can view batches"
  on public.product_batches for select
  using (
    user_id = auth.uid()
    OR exists (
      select 1 from public.team_members
      where owner_id = product_batches.user_id
      and member_id = auth.uid()
    )
  );

create policy "Team can insert batches"
  on public.product_batches for insert
  with check (
    user_id = auth.uid()
    OR exists (
      select 1 from public.team_members
      where owner_id = user_id
      and member_id = auth.uid()
    )
  );

create policy "Team can update batches"
  on public.product_batches for update
  using (
    user_id = auth.uid()
    OR exists (
      select 1 from public.team_members
      where owner_id = product_batches.user_id
      and member_id = auth.uid()
    )
  );

-- 4. Adicionar campos novos na tabela movements (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movements' AND column_name='cost_unit') THEN
    ALTER TABLE public.movements ADD COLUMN cost_unit numeric default 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movements' AND column_name='batch_id') THEN
    ALTER TABLE public.movements ADD COLUMN batch_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movements' AND column_name='reference_id') THEN
    ALTER TABLE public.movements ADD COLUMN reference_id uuid;
  END IF;

  -- Permitir tipo ADJUSTMENT em movements
  -- (Drop e recria constraint se existir)
  IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name='movements' AND column_name='type') THEN
    ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_type_check;
  END IF;
END $$;

-- Recriar constraint com ADJUSTMENT incluído
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_type_check;
ALTER TABLE public.movements ADD CONSTRAINT movements_type_check
  CHECK (type IN ('Entrada', 'Saída', 'IN', 'OUT', 'ADJUSTMENT'));

-- 5. Adicionar updated_at em tabelas existentes que não têm
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='updated_at') THEN
    ALTER TABLE public.products ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='providers' AND column_name='updated_at') THEN
    ALTER TABLE public.providers ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movements' AND column_name='updated_at') THEN
    ALTER TABLE public.movements ADD COLUMN updated_at timestamp with time zone default timezone('utc'::text, now());
  END IF;
END $$;
