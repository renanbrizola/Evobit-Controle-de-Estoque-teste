-- Create licenses table
create table public.licenses (
  id uuid not null default uuid_generate_v4 (),
  user_id uuid null,
  key text not null,
  type text not null default 'lifetime'::text, -- 'lifetime', 'subscription', 'trial'
  status text not null default 'active'::text, -- 'active', 'revoked', 'expired'
  machine_id text null, -- Lock to specific machine
  activation_date timestamp with time zone null,
  expires_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint licenses_pkey primary key (id),
  constraint licenses_key_key unique (key)
);

-- Enable RLS
alter table public.licenses enable row level security;

-- Policies
-- Admin/Service Role can manage everything. 
-- Users can only read their own license if linked, or check a key during activation.

-- Allow authenticated users to read their own licenses
create policy "Users can read own licenses" on public.licenses
  for select using (auth.uid() = user_id);

-- Depending on how we handle activation (server-side function vs client-side), we might need an RPC.
-- ideally, we use a Postgres Function for activation to prevent users from binding any key they find.

-- Function to activate license
create or replace function public.activate_license(license_key text, machine_id_input text)
returns json
language plpgsql
security definer
as $$
declare
  v_license_id uuid;
  v_current_machine_id text;
  v_status text;
begin
  -- Find license
  select id, machine_id, status into v_license_id, v_current_machine_id, v_status
  from public.licenses
  where key = license_key;

  if v_license_id is null then
    return json_build_object('success', false, 'message', 'Licença inválida');
  end if;

  if v_status != 'active' then
    return json_build_object('success', false, 'message', 'Licença inativa ou revogada');
  end if;

  -- Check machine lock
  if v_current_machine_id is not null and v_current_machine_id != machine_id_input then
    return json_build_object('success', false, 'message', 'Licença já em uso em outra máquina');
  end if;

  -- Activate (Bind to user and machine if not already)
  update public.licenses
  set 
    user_id = auth.uid(),
    machine_id = machine_id_input,
    activation_date = coalesce(activation_date, now()),
    updated_at = now()
  where id = v_license_id;

  return json_build_object('success', true, 'message', 'Licença ativada com sucesso');
end;
$$;
