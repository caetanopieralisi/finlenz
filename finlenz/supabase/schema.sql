-- =========================================================
-- FINLENZ — schema do Supabase
-- Rode este arquivo inteiro em Supabase > SQL Editor > New query
-- =========================================================

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  monthly_income numeric,
  is_admin boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- TRANSACTIONS ----------
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

-- ---------- DREAMS ----------
create table if not exists dreams (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount >= 0),
  saved_amount numeric not null default 0,
  monthly_contribution numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- LEARNING PROGRESS ----------
create table if not exists learning_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id int not null,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- ---------- MENTOR MESSAGES ----------
create table if not exists mentor_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- APP SETTINGS (linha única, id = 1) ----------
create table if not exists app_settings (
  id int primary key default 1,
  app_name text default 'finlenz',
  logo_text text default 'F',
  primary_color text default '#2B3A67',
  accent_color text default '#FF6B4A',
  openai_api_key text,
  updated_at timestamptz default now()
);
insert into app_settings (id) values (1) on conflict (id) do nothing;

-- =========================================================
-- RLS
-- =========================================================
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table dreams enable row level security;
alter table learning_progress enable row level security;
alter table mentor_messages enable row level security;
alter table app_settings enable row level security;

-- profiles: cada usuário vê e edita só o próprio perfil
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
-- admins podem ler todos os perfis (usado nas estatísticas do painel)
create policy "profiles_select_admin" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- transactions / dreams / learning_progress / mentor_messages: dono only
create policy "tx_all_own" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dreams_all_own" on dreams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_all_own" on learning_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mentor_all_own" on mentor_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- admins podem contar transações de todos (estatísticas)
create policy "tx_select_admin" on transactions for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- app_settings: leitura pública (necessária pra aplicar o tema na landing page
-- e na tela de login, antes do usuário entrar); só admin pode alterar.
create policy "settings_select_public" on app_settings for select using (true);
create policy "settings_upsert_admin" on app_settings for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "settings_update_admin" on app_settings for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- =========================================================
-- FUNÇÃO: reset dos dados da conta demo
-- Encontra o usuário com profiles.is_demo = true e recoloca
-- os dados de exemplo originais, apagando o que foi alterado.
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
  select id into demo_id from profiles where is_demo = true limit 1;
  if demo_id is null then
    return;
  end if;

  delete from transactions where user_id = demo_id;
  delete from dreams where user_id = demo_id;
  delete from learning_progress where user_id = demo_id;
  delete from mentor_messages where user_id = demo_id;

  update profiles set name = 'Convidado(a)', monthly_income = 1800 where id = demo_id;

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
