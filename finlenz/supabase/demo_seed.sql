-- =========================================================
-- FINLENZ — dados da conta demo
-- Recria a função reset_demo_data() com uma história coerente
-- para apresentar o app em ~1 minuto:
--   Ana, 20 anos, estagiária. Ganha R$ 1.800 + freelas.
--   Mês no azul, mas comprou um tênis de R$ 399,90 por impulso
--   (= ~33 h de trabalho e ~30 dias de atraso no intercâmbio).
-- Datas são relativas ao dia do reset, então a demo nunca "envelhece".
-- Pode rodar de novo com segurança.
-- =========================================================
create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_id uuid;
  m0 date := date_trunc('month', current_date)::date;
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

  update profiles
     set name = 'Ana', monthly_income = 2100, current_savings = 3200,
         onboarding_done = false, is_demo = true
   where id = demo_id;

  -- mo = meses atrás (0 = mês atual); dd >= 0 = dia do mês (0 = dia 1);
  -- dd < 0 = dias antes de hoje (só no mês atual). Datas do mês atual
  -- nunca passam de hoje nem voltam para o mês anterior.
  insert into transactions (user_id, type, description, category, amount, date)
  select demo_id, v.t, v.descr, v.cat, v.amt,
         case
           when v.mo = 0 and v.dd < 0 then greatest(m0, current_date + v.dd)
           when v.mo = 0 then least(current_date, m0 + v.dd)
           else (m0 - make_interval(months => v.mo))::date + v.dd
         end
  from (values
    -- ===== 3 meses atrás =====
    (3, 4,  'income',  'Estágio',              'Renda',       1800.00),
    (3, 17, 'income',  'Freela: identidade visual', 'Renda',   250.00),
    (3, 4,  'expense', 'Aluguel dividido',     'Moradia',      700.00),
    (3, 9,  'expense', 'Conta de luz',         'Moradia',       64.30),
    (3, 1,  'expense', 'Passe de ônibus',      'Transporte',   150.00),
    (3, 20, 'expense', 'Uber',                 'Transporte',    31.40),
    (3, 5,  'expense', 'Mercado',              'Alimentação',  192.80),
    (3, 19, 'expense', 'Mercado',              'Alimentação',  176.40),
    (3, 11, 'expense', 'iFood',                'Alimentação',   48.90),
    (3, 24, 'expense', 'iFood',                'Alimentação',   39.50),
    (3, 7,  'expense', 'Curso de inglês',      'Educação',     180.00),
    (3, 2,  'expense', 'Academia',             'Saúde',         99.00),
    (3, 14, 'expense', 'Farmácia',             'Saúde',         37.60),
    (3, 9,  'expense', 'Spotify',              'Lazer',         21.90),
    (3, 22, 'expense', 'Cinema com amigos',    'Lazer',         46.00),
    -- ===== 2 meses atrás =====
    (2, 4,  'income',  'Estágio',              'Renda',       1800.00),
    (2, 15, 'income',  'Freela: posts para loja', 'Renda',     400.00),
    (2, 4,  'expense', 'Aluguel dividido',     'Moradia',      700.00),
    (2, 9,  'expense', 'Conta de luz',         'Moradia',       71.20),
    (2, 1,  'expense', 'Passe de ônibus',      'Transporte',   150.00),
    (2, 12, 'expense', 'Uber',                 'Transporte',    24.80),
    (2, 6,  'expense', 'Mercado',              'Alimentação',  205.10),
    (2, 20, 'expense', 'Mercado',              'Alimentação',  168.30),
    (2, 8,  'expense', 'iFood',                'Alimentação',   52.40),
    (2, 16, 'expense', 'iFood',                'Alimentação',   44.90),
    (2, 26, 'expense', 'iFood',                'Alimentação',   57.80),
    (2, 7,  'expense', 'Curso de inglês',      'Educação',     180.00),
    (2, 2,  'expense', 'Academia',             'Saúde',         99.00),
    (2, 9,  'expense', 'Spotify',              'Lazer',         21.90),
    (2, 21, 'expense', 'Show',                 'Lazer',        120.00),
    (2, 18, 'expense', 'Presente de aniversário', 'Outros',     65.00),
    -- ===== mês passado =====
    (1, 4,  'income',  'Estágio',              'Renda',       1800.00),
    (1, 19, 'income',  'Freela: cardápio digital', 'Renda',    300.00),
    (1, 4,  'expense', 'Aluguel dividido',     'Moradia',      700.00),
    (1, 9,  'expense', 'Conta de luz',         'Moradia',       66.90),
    (1, 1,  'expense', 'Passe de ônibus',      'Transporte',   150.00),
    (1, 23, 'expense', 'Uber',                 'Transporte',    28.70),
    (1, 5,  'expense', 'Mercado',              'Alimentação',  188.60),
    (1, 18, 'expense', 'Mercado',              'Alimentação',  181.20),
    (1, 10, 'expense', 'iFood',                'Alimentação',   46.50),
    (1, 25, 'expense', 'iFood',                'Alimentação',   41.90),
    (1, 7,  'expense', 'Curso de inglês',      'Educação',     180.00),
    (1, 2,  'expense', 'Academia',             'Saúde',         99.00),
    (1, 9,  'expense', 'Spotify',              'Lazer',         21.90),
    (1, 16, 'expense', 'Barzinho',             'Lazer',         58.00),
    -- ===== mês atual =====
    (0, 4,  'income',  'Estágio',              'Renda',       1800.00),
    (0, 11, 'income',  'Freela: logo para café', 'Renda',      350.00),
    (0, 4,  'expense', 'Aluguel dividido',     'Moradia',      700.00),
    (0, 1,  'expense', 'Passe de ônibus',      'Transporte',   150.00),
    (0, 2,  'expense', 'Academia',             'Saúde',         99.00),
    (0, 5,  'expense', 'Mercado',              'Alimentação',  197.40),
    (0, 7,  'expense', 'Curso de inglês',      'Educação',     180.00),
    (0, 9,  'expense', 'Spotify',              'Lazer',         21.90),
    (0, -4, 'expense', 'iFood',                'Alimentação',   42.90),
    (0, -2, 'expense', 'Uber',                 'Transporte',    27.50),
    (0, -1, 'expense', 'Tênis novo',           'Lazer',        399.90)
  ) as v(mo, dd, t, descr, cat, amt);

  insert into dreams (user_id, name, target_amount, saved_amount, monthly_contribution, created_at) values
    (demo_id, 'Intercâmbio no Canadá', 15000, 5200, 400, now() - interval '3 minutes'),
    (demo_id, 'Notebook novo',          4500, 2900, 300, now() - interval '2 minutes'),
    (demo_id, 'Reserva de emergência',  6000, 3200, 250, now() - interval '1 minute');

  insert into learning_progress (user_id, lesson_id, completed, completed_at) values
    (demo_id, 1, true, now() - interval '20 days'),
    (demo_id, 2, true, now() - interval '12 days'),
    (demo_id, 3, true, now() - interval '3 days');

  insert into mentor_messages (user_id, role, content, created_at) values
    (demo_id, 'user', 'Comprei um tênis de R$ 399,90 ontem. Fiz besteira?', now() - interval '10 minutes'),
    (demo_id, 'assistant', 'Não é o fim do mundo, mas olha o custo real: com sua renda de R$ 2.100, esse tênis equivale a umas 33 horas de trabalho e atrasa seu intercâmbio em cerca de 30 dias. Seu mês ainda fecha no azul, então dá pra compensar: se você pular 3 pedidos de iFood por mês, são uns R$ 130 que voltam direto pro Canadá.', now() - interval '9 minutes');
end;
$$;
grant execute on function reset_demo_data() to authenticated;

-- aplica agora
select reset_demo_data();
