-- Nossa Casa: espaço financeiro compartilhado por até 2 usuários, com RLS.
create extension if not exists pgcrypto;

create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nossa Casa',
  owner_id uuid not null references auth.users(id),
  created_at timestamptz default now()
);
create table space_members (
  space_id uuid references spaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  display_name text,
  primary key (space_id, user_id)
);
create table invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,
  email text not null,
  accepted boolean default false,
  created_at timestamptz default now()
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null, unique (space_id, name)
);
create table budgets (
  space_id uuid references spaces(id) on delete cascade,
  month text not null,                       -- 'AAAA-MM'
  initial_cents bigint not null default 0,
  extra_cents bigint not null default 0,
  primary key (space_id, month)
);
create table bills (                           -- modelo e ocorrências
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  template_id uuid,                            -- ocorrências apontam ao modelo
  name text not null, category text not null,
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  kind text check (kind in ('fixa','variavel')),
  recurrence text check (recurrence in ('unica','semanal','mensal','anual')),
  method text, notes text,
  unique (space_id, template_id, due_date)     -- evita duplicar ocorrência
);
create table payments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  paid_cents bigint not null check (paid_cents > 0),
  fee_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  paid_on date not null, method text, notes text,
  created_by uuid default auth.uid()
);
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid default auth.uid(),
  action text not null, bill_name text,
  created_at timestamptz default now()
);

-- Funções de permissão (security definer evita recursão nas policies)
create function is_member(sid uuid) returns boolean language sql security definer stable as
$$ select exists(select 1 from space_members where space_id=sid and user_id=auth.uid()) $$;
create function is_admin(sid uuid) returns boolean language sql security definer stable as
$$ select exists(select 1 from space_members where space_id=sid and user_id=auth.uid() and role='admin') $$;

-- Limite de 2 usuários por espaço
create function limit_two() returns trigger language plpgsql as $$
begin
  if (select count(*) from space_members where space_id=new.space_id) >= 2 then
    raise exception 'Limite de 2 usuários por espaço';
  end if;
  return new;
end $$;
create trigger trg_limit_two before insert on space_members for each row execute function limit_two();

-- RLS
alter table spaces enable row level security;
alter table space_members enable row level security;
alter table invites enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table activity_log enable row level security;

create policy sp_sel on spaces for select using (is_member(id));
create policy sp_ins on spaces for insert with check (owner_id = auth.uid());
create policy sp_upd on spaces for update using (is_admin(id));
create policy sp_del on spaces for delete using (is_admin(id));

create policy mem_sel on space_members for select using (is_member(space_id));
create policy mem_ins on space_members for insert with check (
  is_admin(space_id) or (user_id = auth.uid() and role='admin'
    and exists(select 1 from spaces s where s.id=space_id and s.owner_id=auth.uid())));
create policy mem_del on space_members for delete using (is_admin(space_id));

create policy inv_all on invites for all using (is_admin(space_id)) with check (is_admin(space_id));
-- (aceite do convite: fazer via função/Edge Function que valida o e-mail do convidado)

create policy cat_all on categories for all using (is_member(space_id)) with check (is_member(space_id));
create policy bud_all on budgets for all using (is_member(space_id)) with check (is_member(space_id));
create policy bill_all on bills for all using (is_member(space_id)) with check (is_member(space_id));
create policy pay_all on payments for all using (is_member(space_id)) with check (is_member(space_id));
create policy log_sel on activity_log for select using (is_member(space_id));
create policy log_ins on activity_log for insert with check (is_member(space_id) and user_id = auth.uid());

-- Tempo real
alter publication supabase_realtime add table bills, payments, budgets, categories, activity_log;
