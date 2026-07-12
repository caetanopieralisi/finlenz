# Finlenz

App de educação e organização financeira, mobile-first, feito em HTML/CSS/JS puro
(sem framework, sem build) + [Supabase](https://supabase.com) como backend.

## Estrutura do projeto

```
finlenz/
├── index.html          landing page
├── login.html           login / criar conta / conta demo
├── app.html              app principal (todas as ferramentas)
├── admin.html           painel administrativo (escondido)
├── assets/css/          estilos
├── assets/js/           lógica (um módulo por funcionalidade)
├── data/                 conteúdo estático (trilha, glossário, presets de investimento)
└── supabase/schema.sql   banco de dados, RLS e função da conta demo
```

Não existe passo de build: é só HTML/CSS/JS estático, publicável em qualquer lugar
(o guia abaixo usa Vercel).

---

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**.
2. Anote a **Project URL** e a **anon public key** (em *Project Settings → API*).
3. Vá em **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql`
   e clique em **Run**. Isso cria as tabelas, as políticas de segurança (RLS) e a
   função que reseta a conta demo.
4. Em **Authentication → Providers**, confirme que **Email** está habilitado.
5. Em **Authentication → Settings**, desative **"Confirm email"** (deixe como
   *disabled*) — assim quem cria conta já entra direto, sem precisar clicar em
   e-mail de confirmação. Isso é importante para a avaliação/demo.

### Criar a conta demo

1. Vá em **Authentication → Users → Add user** e crie:
   - E-mail: `demo@finlenz.app`
   - Senha: `finlenzdemo2026`
   *(se trocar esses valores, atualize também `DEMO_EMAIL` e `DEMO_PASSWORD` em
   `assets/js/config.js`)*
2. Copie o **UUID** desse usuário (aparece na lista de usuários).
3. No **SQL Editor**, rode substituindo pelo UUID copiado:
   ```sql
   insert into profiles (id, name, monthly_income, is_demo)
   values ('COLE_O_UUID_AQUI', 'Convidado(a)', 1800, true);

   select reset_demo_data(); -- já popula os dados de exemplo
   ```

### Criar a conta de administrador

1. Em **Authentication → Users → Add user**, crie o seu e-mail de admin e uma senha forte.
2. Copie o UUID desse usuário e rode no SQL Editor:
   ```sql
   insert into profiles (id, name, is_admin)
   values ('COLE_O_UUID_AQUI', 'Admin', true);
   ```

---

## Passo 2 — Configurar as chaves no código

Abra `assets/js/config.js` e preencha:

```js
export const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
export const SUPABASE_ANON_KEY = "sua-anon-key";
```

Se quiser, troque também `ADMIN_SECRET_CODE` (o código digitado na tela de
*login* — em qualquer lugar da tela, sem precisar de um campo — que abre o
painel administrativo escondido em `admin.html`).

---

## Passo 3 — Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e
   importe o repositório.
3. Em **Framework Preset**, escolha **Other** (é um site estático, não precisa
   de build command nem output directory especiais).
4. Clique em **Deploy**. Pronto — a Vercel te dá uma URL pública.
5. Em **Authentication → URL Configuration** no Supabase, adicione a URL da
   Vercel como *Site URL* (evita bloqueios de CORS/redirect).

---

## Passo 4 — Configurar a Mentoria com IA

1. Acesse a URL publicada, vá até `login.html` e digite o código secreto
   (o valor de `ADMIN_SECRET_CODE`) em qualquer lugar da tela — isso te leva
   para `admin.html`.
2. Entre com a conta de administrador criada no Passo 1.
3. Cole sua chave da API da OpenAI no campo **Chave da API OpenAI** e salve.
   A partir daí, a aba **Mentoria** do app já funciona.
4. No mesmo painel dá pra trocar o nome do app, a letra do logo e as cores
   (primária e de destaque) — a mudança aparece pra todo mundo.

> **Sobre segurança:** para simplificar a demo em uma competição, a chave da
> OpenAI fica salva no banco e é lida diretamente pelo navegador do usuário
> logado. Isso funciona bem para fins de avaliação, mas não é o ideal para um
> produto em produção real (nesse caso, o correto seria a chamada passar por
> um servidor/serverless function que escondesse a chave).

---

## Como a conta demo funciona

- O botão **"Iniciar conta demo"** faz login com a conta fixa
  `demo@finlenz.app` e, antes de entrar, chama a função `reset_demo_data()`
  no banco — que apaga qualquer alteração feita por quem usou antes e recoloca
  os lançamentos, sonhos e progresso de exemplo originais.
- Ou seja: qualquer pessoa pode mexer à vontade na conta demo, que a próxima
  pessoa que clicar em "Iniciar conta demo" sempre vai ver os dados originais.

## Personalização visual

O botão "Iniciar conta demo" e o restante do app usam variáveis CSS
(`--primary`, `--accent`, etc. em `assets/css/style.css`). O painel admin
sobrescreve essas variáveis em tempo real com o que está salvo em
`app_settings`, então trocar a paleta não exige mexer em código.
