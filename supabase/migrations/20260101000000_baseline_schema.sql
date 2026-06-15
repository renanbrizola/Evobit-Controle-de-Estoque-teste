-- ==========================================
--  STUDIO FRAN'S APP - SCHEMA DE SEGURANÇA
-- ==========================================
-- Este arquivo define a estrutura do banco de dados com foco em "Zero Trust".
-- Cada regra aqui é uma barreira contra invasões.

-- 1. Enable UUID extension 
-- (Gera IDs únicos aleatórios, dificultando que hackers "adivinhem" IDs sequenciais 1, 2, 3...)
create extension if not exists "uuid-ossp";

-- 2. Create Tables

-- PRODUCTS
-- Tabela de Produtos
create table public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null, -- VÍNCULO DE SEGURANÇA: Todo produto DEVE ter um dono.
  name text not null,
  category text default 'REVENDA',
  unit text default 'UN',
  min_stock numeric default 5,
  current_stock numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraint: Impede duplicidade (Mesmo usuário não pode ter 2 produtos com mesmo nome)
  unique(user_id, name)
);

-- PROVIDERS
-- Tabela de Fornecedores
create table public.providers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null, -- Dono do dado
  name text not null,
  cnpj text,
  seller text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(user_id, name)
);

-- MOVEMENTS (History)
-- Histórico de transações (Imutável via Frontend)
create table public.movements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null, -- Dono do dado
  product_id uuid references public.products(id) on delete cascade not null,
  type text not null check (type in ('Entrada', 'Saída')), -- Validação Forte: Só aceita esses dois valores
  qty numeric not null,
  reason text,
  price numeric,
  provider text,
  obs text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
-- ATIVANDO O "ESCUDO": Sem isso, qualquer um poderia ler tudo.
alter table public.products enable row level security;
alter table public.providers enable row level security;
alter table public.movements enable row level security;

-- 4. Create Policies (Security Rules)
-- Regra de Ouro: "auth.uid() = user_id"
-- Tradução: "O ID de quem está logado DEVE ser igual ao ID do dono do dado."

-- PRODUCTS Policies
create policy "Users can view own products" 
  on public.products for select 
  using (auth.uid() = user_id);

create policy "Users can insert own products" 
  on public.products for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own products" 
  on public.products for update 
  using (auth.uid() = user_id);

create policy "Users can delete own products" 
  on public.products for delete 
  using (auth.uid() = user_id);

-- PROVIDERS Policies
create policy "Users can view own providers" 
  on public.providers for select 
  using (auth.uid() = user_id);

create policy "Users can insert own providers" 
  on public.providers for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own providers" 
  on public.providers for update 
  using (auth.uid() = user_id);

create policy "Users can delete own providers" 
  on public.providers for delete 
  using (auth.uid() = user_id);

-- MOVEMENTS Policies
create policy "Users can view own movements" 
  on public.movements for select 
  using (auth.uid() = user_id);

-- NOTA: Não permitimos UPDATE nem DELETE em movimentos para garantir auditoria fiscal.
-- Apenas INSERT é permitido, e apenas se for o dono.
create policy "Users can insert own movements" 
  on public.movements for insert 
  with check (auth.uid() = user_id);

-- 5. Atomic Transaction Function (RPC)
-- Esta função roda DENTRO do banco de dados.
-- Ela garante que se você vender algo, o estoque DECRESCERÁ automaticamente.
-- Se o estoque for insuficiente, a venda é cancelada totalmente (Rollback).
create or replace function handle_movement(
  p_product_id uuid,
  p_type text,
  p_qty numeric,
  p_reason text,
  p_price numeric default 0,
  p_provider text default null,
  p_obs text default null,
  p_validity date default null
) returns json
language plpgsql
security definer -- Roda com privilegios de sistema (bypass RLS interno)
as $$
declare
  v_current_stock numeric;
  v_user_id uuid;
  v_new_movement_id uuid;
begin
  -- Pega o ID do usuário da sessão atual de forma segura
  v_user_id := auth.uid();
  
  -- Bloqueia a linha do produto para evitar que duas pessoas vendam o mesmo item ao mesmo tempo
  select current_stock into v_current_stock
  from public.products
  where id = p_product_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Produto não encontrado ou acesso negado (Tentativa de hacking?)';
  end if;

  -- Regra de Negócio: Não vender o que não tem
  if p_type = 'Saída' and v_current_stock < p_qty then
    raise exception 'Estoque insuficiente. Atual: %, Tentativa: %', v_current_stock, p_qty;
  end if;

  -- Insere o histórico
  insert into public.movements (
    user_id, product_id, type, qty, reason, price, provider, obs
  ) values (
    v_user_id, p_product_id, p_type, p_qty, p_reason, p_price, p_provider, p_obs
  ) returning id into v_new_movement_id;

  -- Atualiza o saldo
  if p_type = 'Entrada' then
    update public.products 
    set current_stock = current_stock + p_qty 
    where id = p_product_id;
  else
    update public.products 
    set current_stock = current_stock - p_qty 
    where id = p_product_id;
  end if;

  return json_build_object('movement_id', v_new_movement_id, 'status', 'success');
end;
$$;
-- ==============================================================================
-- MIGRATION V22: CorreÃ§Ã£o de PermissÃµes e Case Sensitivity no RPC de Email
-- DATA: 2026-02-07
-- ==============================================================================

-- 1. Recriar funÃ§Ã£o com ILIKE para evitar erro de Case Sensitive
create or replace function public.check_email_exists(email_to_check text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 
    from auth.users 
    where email ilike email_to_check -- USANDO ILIKE para ignorar maiÃºsculas/minÃºsculas
  );
end;
$$;

-- 2. Conceder permissÃ£o explÃ­cita para usuÃ¡rios anÃ´nimos e logados executarem a funÃ§Ã£o
-- Sem isso, o frontend nÃ£o consegue chamar a funÃ§Ã£o antes do login.
grant execute on function public.check_email_exists(text) to anon;
grant execute on function public.check_email_exists(text) to authenticated;
grant execute on function public.check_email_exists(text) to service_role;
-- ==============================================================================
-- MIGRATION V24: Sistema de Equipes (Multi-usuÃ¡rio)
-- DATA: 2026-02-07
-- ==============================================================================

-- 1. Create Team Members Table
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null, -- O "Dono" da loja
  member_email text not null, -- E-mail do convidado
  member_id uuid references auth.users, -- ID do convidado (pode ser null se ainda nÃ£o criou conta)
  role text default 'employee', -- 'admin' ou 'employee'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Um e-mail sÃ³ pode ser convidado uma vez por dono
  unique(owner_id, member_email)
);

-- Ativar RLS na tabela de times
alter table public.team_members enable row level security;

-- PolÃ­ticas para team_members
-- Dono pode ver/criar/editar/deletar seus membros
create policy "Owners can manage their team"
  on public.team_members
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Membros podem ver onde estÃ£o alocados (para saber quem Ã© o chefe)
create policy "Members can view their teams"
  on public.team_members
  for select
  using (auth.uid() = member_id);

-- 2. Helper Functions

-- FunÃ§Ã£o para descobrir quem Ã© o dono da loja que o usuÃ¡rio atual estÃ¡ operando
-- (Por padrÃ£o, se ele nÃ£o Ã© membro de ninguÃ©m, ele Ã© o dono da prÃ³pria loja)
create or replace function get_active_store_owner()
returns uuid
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
begin
  -- Tenta achar se o usuÃ¡rio atual Ã© membro de alguma equipe
  select owner_id into v_owner_id
  from public.team_members
  where member_id = auth.uid()
  limit 1;
  
  -- Se achou, retorna o dono. Se nÃ£o, retorna o prÃ³prio ID (ele Ã© o dono)
  return coalesce(v_owner_id, auth.uid());
end;
$$;


-- 3. Atualizar PolÃ­ticas RLS das tabelas principais (Products, Providers, Movements)
-- Agora a regra Ã©: "Sou dono OU Sou membro da equipe do dono"

-- PRODUCTS
drop policy "Users can view own products" on public.products;
create policy "Team can view products" 
  on public.products for select 
  using (
    user_id = auth.uid() -- Sou dono
    OR 
    exists ( -- Sou membro da equipe deste dono
      select 1 from public.team_members 
      where owner_id = products.user_id 
      and member_id = auth.uid()
    )
  );

drop policy "Users can insert own products" on public.products;
create policy "Team can insert products" 
  on public.products for insert 
  with check (
    -- Ao inserir, o user_id deve ser o meu OU do meu chefe.
    -- O Frontend deve mandar o ID correto, mas aqui validamos se tenho permissÃ£o sobre esse ID.
    user_id = auth.uid()
    OR
    exists (
      select 1 from public.team_members 
      where owner_id = user_id -- O user_id que estou tentando inserir Ã© do meu chefe?
      and member_id = auth.uid()
    )
  );

drop policy "Users can update own products" on public.products;
create policy "Team can update products" 
  on public.products for update 
  using (
    user_id = auth.uid()
    OR 
    exists (
      select 1 from public.team_members 
      where owner_id = products.user_id 
      and member_id = auth.uid()
    )
  );

drop policy "Users can delete own products" on public.products;
create policy "Team can delete products" 
  on public.products for delete 
  using (
    user_id = auth.uid()
    OR 
    exists (
      select 1 from public.team_members 
      where owner_id = products.user_id 
      and member_id = auth.uid()
      and role = 'admin' -- Opcional: SÃ³ admins deletam? Por enquanto liberado.
    )
  );

-- PROVIDERS (Repetir lÃ³gica)
drop policy "Users can view own providers" on public.providers;
create policy "Team can view providers" 
  on public.providers for select 
  using (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = providers.user_id and member_id = auth.uid())
  );

drop policy "Users can insert own providers" on public.providers;
create policy "Team can insert providers" 
  on public.providers for insert 
  with check (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = user_id and member_id = auth.uid())
  );

drop policy "Users can update own providers" on public.providers;
create policy "Team can update providers" 
  on public.providers for update 
  using (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = providers.user_id and member_id = auth.uid())
  );

drop policy "Users can delete own providers" on public.providers;
create policy "Team can delete providers" 
  on public.providers for delete 
  using (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = providers.user_id and member_id = auth.uid())
  );

-- MOVEMENTS (Repetir lÃ³gica)
drop policy "Users can view own movements" on public.movements;
create policy "Team can view movements" 
  on public.movements for select 
  using (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = movements.user_id and member_id = auth.uid())
  );

drop policy "Users can insert own movements" on public.movements;
create policy "Team can insert movements" 
  on public.movements for insert 
  with check (
    user_id = auth.uid() OR exists (select 1 from public.team_members where owner_id = user_id and member_id = auth.uid())
  );
-- ==============================================================================
-- MIGRATION V25: PermissÃµes e Perfis (Admin vs Employee)
-- DATA: 2026-02-07
-- ==============================================================================

-- 1. Refinando PolÃ­ticas de ExclusÃ£o (DELETE)
-- Regra: Apenas o DONO ou membros com papel 'admin' podem excluir itens.

-- PRODUCTS DELETE
drop policy "Team can delete products" on public.products;

create policy "Admins can delete products" 
  on public.products for delete 
  using (
    user_id = auth.uid() -- Sou dono
    OR 
    exists (
      select 1 from public.team_members 
      where owner_id = products.user_id 
      and member_id = auth.uid()
      and role = 'admin' -- SÃ“ ADMINS
    )
  );

-- PROVIDERS DELETE
drop policy "Team can delete providers" on public.providers;

create policy "Admins can delete providers" 
  on public.providers for delete 
  using (
    user_id = auth.uid()
    OR 
    exists (
      select 1 from public.team_members 
      where owner_id = providers.user_id 
      and member_id = auth.uid()
      and role = 'admin'
    )
  );

-- NOTE: Movements jÃ¡ nÃ£o tinham DELETE permitido para membros na migraÃ§Ã£o V24 (sÃ³ insert),
-- mas vamos garantir que membros normais nÃ£o possam bagunÃ§ar.
-- Na V24 nÃ£o criamos politica de delete para movements para times? Vamos checar.
-- Se nÃ£o criamos, o padrÃ£o Ã© negar. Ã“timo.

-- 2. Helper para Frontend saber o papel
-- FunÃ§Ã£o para retornar o papel do usuÃ¡rio na equipe atual
create or replace function get_my_team_role()
returns text
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  -- Se sou dono de algo, meu papel Ã© 'owner' (mas aqui buscamos papel em equipe ALHEIA)
  select role into v_role
  from public.team_members
  where member_id = auth.uid()
  limit 1;
  
  -- Se nÃ£o achou role na tabela team_members, assume que sou 'owner' (da minha prÃ³pria loja)
  -- ou 'none' se nÃ£o tiver nada.
  return coalesce(v_role, 'owner');
end;
$$;

grant execute on function public.get_my_team_role() to authenticated;
grant execute on function public.get_my_team_role() to anon;
