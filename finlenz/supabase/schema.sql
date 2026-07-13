-- =========================================================
-- FINLENZ — schema do Supabase (v2 — corrige recursão de RLS
-- e adiciona criação automática de perfil)
-- Rode este arquivo inteiro em Supabase > SQL Editor > New query.
-- Pode rodar de novo com segurança em um projeto já existente.
-- =========================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  monthly_income numeric,
  current_savings numeric not null default 0,
  onboarding_done boolean not null default false,
  is_admin boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists current_savings numeric not null default 0;
alter table profiles add column if not exists onboarding_done boolean not null default false;

create table if not exists transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  description text not null,
  category text not null default 'Outros',
  amount numeric not null check (amount >= 0),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists dreams (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount >= 0),
  saved_amount numeric not null default 0,
  monthly_contribution numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists learning_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id int not null,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create table if not exists mentor_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  id int primary key default 1,
  app_name text default 'finlenz',
  logo_text text default 'F',
  logo_url text,
  primary_color text default '#C6FF3D',
  accent_color text default '#C6FF3D',
  openai_api_key text,
  updated_at timestamptz default now()
);
insert into app_settings (id) values (1) on conflict (id) do nothing;
alter table app_settings add column if not exists logo_url text;

-- =========================================================
-- RLS
-- =========================================================
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table dreams enable row level security;
alter table learning_progress enable row level security;
alter table mentor_messages enable row level security;
alter table app_settings enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_select_admin" on profiles; -- REMOVIDA: causava recursão infinita
drop policy if exists "tx_select_admin" on transactions;

-- profiles: cada usuário só vê/edita o próprio perfil (sem subconsulta na
-- própria tabela — isso é o que causava "infinite recursion" e quebrava o
-- login/admin).
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

drop policy if exists "tx_all_own" on transactions;
drop policy if exists "dreams_all_own" on dreams;
drop policy if exists "learning_all_own" on learning_progress;
drop policy if exists "mentor_all_own" on mentor_messages;
create policy "tx_all_own" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dreams_all_own" on dreams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_all_own" on learning_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mentor_all_own" on mentor_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_select_auth" on app_settings;
drop policy if exists "settings_select_public" on app_settings;
drop policy if exists "settings_upsert_admin" on app_settings;
drop policy if exists "settings_update_admin" on app_settings;
-- leitura pública (necessária pra aplicar o tema na landing/login antes do login)
create policy "settings_select_public" on app_settings for select using (true);
-- só admin altera (esta consulta é em outra tabela, não recursiva)
create policy "settings_upsert_admin" on app_settings for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "settings_update_admin" on app_settings for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- =========================================================
-- CRIAÇÃO AUTOMÁTICA DE PERFIL
-- Qualquer novo usuário (criado pelo app OU pelo painel do Supabase)
-- ganha uma linha em profiles automaticamente. A conta demo é
-- identificada pelo e-mail fixo e marcada como is_demo já na criação.
-- =========================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, is_demo)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Usuário'),
    (new.email = 'demo@finlenz.app')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill: cria perfil para usuários que já existiam antes desta trigger
-- (ex: contas demo/admin criadas manualmente no painel do Supabase).
insert into profiles (id, name, is_demo)
select u.id, coalesce(split_part(u.email, '@', 1), 'Usuário'), (u.email = 'demo@finlenz.app')
from auth.users u
where u.id not in (select id from profiles);

-- =========================================================
-- FUNÇÃO: reset dos dados da conta demo (busca por e-mail, não
-- depende de flags configuradas manualmente)
-- =========================================================
create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_id uuid;
begin
  select u.id into demo_id
  from auth.users u
  where u.email = 'demo@finlenz.app'
  limit 1;

  if demo_id is null then
    return;
  end if;

  delete from transactions where user_id = demo_id;
  delete from dreams where user_id = demo_id;
  delete from learning_progress where user_id = demo_id;
  delete from mentor_messages where user_id = demo_id;

  update profiles set name = 'Convidado(a)', monthly_income = 1800, current_savings = 2100, onboarding_done = false, is_demo = true where id = demo_id;

  insert into transactions (user_id, type, description, category, amount, date) values
    (demo_id, 'income', 'Estágio', 'Renda', 1800, date_trunc('month', current_date)::date + 4),
    (demo_id, 'expense', 'Aluguel dividido', 'Moradia', 650, date_trunc('month', current_date)::date + 5),
    (demo_id, 'expense', 'Mercado', 'Alimentação', 320, date_trunc('month', current_date)::date + 7),
    (demo_id, 'expense', 'iFood', 'Alimentação', 46.90, date_trunc('month', current_date)::date + 10),
    (demo_id, 'expense', 'Tênis novo', 'Lazer', 320, date_trunc('month', current_date)::date + 12),
    (demo_id, 'expense', 'Passagem de ônibus', 'Transporte', 180, date_trunc('month', current_date)::date + 3);

  insert into dreams (user_id, name, target_amount, saved_amount, monthly_contribution) values
    (demo_id, 'Intercâmbio', 12000, 4560, 400),
    (demo_id, 'Notebook novo', 3500, 900, 250);

  insert into learning_progress (user_id, lesson_id, completed, completed_at) values
    (demo_id, 1, true, now()),
    (demo_id, 2, true, now());
end;
$$;
grant execute on function reset_demo_data() to authenticated;

-- =========================================================
-- FUNÇÃO: estatísticas do painel admin (evita dar acesso amplo
-- à tabela profiles/transactions só pra contar linhas)
-- =========================================================
create or replace function admin_stats()
returns table(user_count bigint, tx_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  return query select (select count(*) from profiles), (select count(*) from transactions);
end;
$$;
grant execute on function admin_stats() to authenticated;

-- =========================================================
-- PROMOVER UM USUÁRIO A ADMIN (rode depois de criar a conta):
-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'seuemail@exemplo.com');
-- =========================================================
