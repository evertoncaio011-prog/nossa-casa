-- Shared household data: email/password authentication is provided by Supabase Auth.
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nossa Casa',
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.household_data (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  data jsonb not null default '{"bills":[],"pays":[],"bud":{},"cats":[]}'::jsonb
    check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  version bigint not null default 0 check (version >= 0)
);

alter table public.household_data
  add column if not exists version bigint not null default 0 check (version >= 0);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create unique index if not exists invites_one_pending_email_per_space
  on public.invites (space_id, lower(email))
  where accepted_at is null;

create or replace function public.is_household_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = p_space_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_admin(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.enforce_two_household_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.spaces where id = new.space_id for update;

  if (select count(*) from public.space_members where space_id = new.space_id) >= 2 then
    raise exception 'Esta casa já atingiu o limite de 2 pessoas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limit_two on public.space_members;
create trigger trg_limit_two
  before insert on public.space_members
  for each row execute function public.enforce_two_household_members();

create or replace function public.create_household(
  p_name text default 'Nossa Casa',
  p_data jsonb default '{"bills":[],"pays":[],"bud":{},"cats":[]}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_space_id uuid;
begin
  if v_user_id is null then
    raise exception 'Entre na sua conta para criar uma casa.';
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Os dados iniciais da casa são inválidos.';
  end if;

  if exists (select 1 from public.space_members where user_id = v_user_id) then
    raise exception 'Sua conta já está vinculada a uma casa.';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.spaces (name, owner_id)
  values (coalesce(nullif(btrim(p_name), ''), 'Nossa Casa'), v_user_id)
  returning id into v_space_id;

  insert into public.space_members (space_id, user_id, role, display_name)
  values (v_space_id, v_user_id, 'admin', coalesce(v_email, 'Administrador'));

  insert into public.household_data (space_id, data)
  values (v_space_id, p_data);

  return v_space_id;
end;
$$;

create or replace function public.create_household_invite(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
  v_email text := lower(btrim(p_email));
  v_token uuid := gen_random_uuid();
  v_invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para convidar alguém.';
  end if;

  select space_id into v_space_id
  from public.space_members
  where user_id = auth.uid() and role = 'admin';

  if v_space_id is null then
    raise exception 'Somente o administrador da casa pode criar convites.';
  end if;

  perform 1 from public.spaces where id = v_space_id for update;

  if (select count(*) from public.space_members where space_id = v_space_id) >= 2 then
    raise exception 'Esta casa já tem 2 pessoas.';
  end if;

  if v_email = '' or v_email = lower((select email from auth.users where id = auth.uid())) then
    raise exception 'Informe o e-mail de outra pessoa.';
  end if;

  if exists (
    select 1
    from auth.users u
    join public.space_members m on m.user_id = u.id
    where lower(u.email) = v_email
  ) then
    raise exception 'Este e-mail já está vinculado a uma casa.';
  end if;

  select id into v_invite_id
  from public.invites
  where space_id = v_space_id and lower(email) = v_email and accepted_at is null
  for update;

  if v_invite_id is null then
    insert into public.invites (space_id, email, token, created_by)
    values (v_space_id, v_email, v_token, auth.uid())
    returning id into v_invite_id;
  else
    update public.invites
    set token = v_token,
        created_by = auth.uid(),
        created_at = now(),
        expires_at = now() + interval '7 days'
    where id = v_invite_id;
  end if;

  return v_token;
end;
$$;

create or replace function public.accept_household_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.invites%rowtype;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Entre na sua conta para aceitar o convite.';
  end if;

  select lower(email) into v_email from auth.users where id = v_user_id;

  select * into v_invite
  from public.invites
  where token = p_token;

  if not found or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'Este convite é inválido ou expirou.';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'Entre com o e-mail convidado para aceitar este convite.';
  end if;

  perform 1 from public.spaces where id = v_invite.space_id for update;

  select * into v_invite
  from public.invites
  where id = v_invite.id and token = p_token
  for update;

  if not found or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'Este convite é inválido ou expirou.';
  end if;

  if exists (select 1 from public.space_members where user_id = v_user_id) then
    raise exception 'Sua conta já está vinculada a uma casa.';
  end if;

  select count(*) into v_member_count
  from public.space_members
  where space_id = v_invite.space_id;

  if v_member_count >= 2 then
    raise exception 'Esta casa já atingiu o limite de 2 pessoas.';
  end if;

  insert into public.space_members (space_id, user_id, role, display_name)
  values (v_invite.space_id, v_user_id, 'member', coalesce(v_email, 'Membro'));

  update public.invites set accepted_at = now() where id = v_invite.id;

  return v_invite.space_id;
end;
$$;

create or replace function public.save_household_data(p_data jsonb, p_expected_version bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
  v_version bigint;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para salvar os dados.';
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Os dados da casa são inválidos.';
  end if;

  select space_id into v_space_id
  from public.space_members
  where user_id = auth.uid();

  if v_space_id is null then
    raise exception 'Sua conta não está vinculada a uma casa.';
  end if;

  update public.household_data
  set data = p_data,
      version = version + 1,
      updated_at = now()
  where space_id = v_space_id
    and version = p_expected_version
  returning version into v_version;

  if v_version is null then
    raise exception 'Outra pessoa atualizou os dados da casa. Atualize a página antes de salvar novamente.';
  end if;

  return v_version;
end;
$$;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.household_data enable row level security;
alter table public.invites enable row level security;

drop policy if exists spaces_select_members on public.spaces;
create policy spaces_select_members on public.spaces
  for select to authenticated using (public.is_household_member(id));

drop policy if exists members_select_household on public.space_members;
create policy members_select_household on public.space_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_household_member(space_id));

drop policy if exists household_data_select_members on public.household_data;
create policy household_data_select_members on public.household_data
  for select to authenticated using (public.is_household_member(space_id));

drop policy if exists household_data_insert_members on public.household_data;
create policy household_data_insert_members on public.household_data
  for insert to authenticated with check (public.is_household_member(space_id));

drop policy if exists household_data_update_members on public.household_data;
create policy household_data_update_members on public.household_data
  for update to authenticated
  using (public.is_household_member(space_id))
  with check (public.is_household_member(space_id));

drop policy if exists invites_select_admin on public.invites;
create policy invites_select_admin on public.invites
  for select to authenticated using (public.is_household_admin(space_id));

revoke all on public.spaces, public.space_members, public.household_data, public.invites
  from anon, authenticated;
grant select on public.spaces, public.space_members, public.invites to authenticated;
grant select, insert on public.household_data to authenticated;

revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.is_household_admin(uuid) from public, anon;
revoke all on function public.enforce_two_household_members() from public, anon, authenticated;
revoke all on function public.create_household(text, jsonb) from public, anon;
revoke all on function public.create_household_invite(text) from public, anon;
revoke all on function public.accept_household_invite(uuid) from public, anon;
revoke all on function public.save_household_data(jsonb, bigint) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_admin(uuid) to authenticated;
grant execute on function public.create_household(text, jsonb) to authenticated;
grant execute on function public.create_household_invite(text) to authenticated;
grant execute on function public.accept_household_invite(uuid) to authenticated;
grant execute on function public.save_household_data(jsonb, bigint) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'household_data'
  ) then
    alter publication supabase_realtime add table public.household_data;
  end if;
end;
$$;
