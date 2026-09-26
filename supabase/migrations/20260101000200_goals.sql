-- =============================================================
-- 02 · OBIETTIVI DI RISPARMIO (salvadanai)
-- Due tabelle: l'obiettivo e i versamenti. Il saldo non si tiene
-- in una colonna (si disallinea): si somma dai versamenti.
-- =============================================================

create table if not exists public.goals (
  id            bigint generated always as identity primary key,

  scope         char(1)       not null check (scope in ('C', 'P')),
  group_id      bigint        references public.groups_account(id) on delete cascade,
  user_id       uuid          references auth.users(id)            on delete cascade,

  nome          text          not null check (length(btrim(nome)) > 0),
  -- nome dell'icona lucide usata dal frontend (plane, shield, car, …)
  icona         text          not null default 'piggy-bank',
  target        numeric(12,2) not null check (target > 0),
  data_obiettivo date,

  -- accantonamento automatico: quanto e in che giorno del mese
  auto_importo  numeric(12,2) check (auto_importo is null or auto_importo > 0),
  auto_giorno   smallint      check (auto_giorno between 1 and 28),

  archiviato    boolean       not null default false,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),

  constraint goals_owner_coerente check (
    (scope = 'C' and group_id is not null and user_id is null) or
    (scope = 'P' and user_id  is not null and group_id is null)
  ),
  constraint goals_auto_completo check (
    (auto_importo is null and auto_giorno is null) or
    (auto_importo is not null and auto_giorno is not null)
  )
);

create index if not exists goals_lookup on public.goals (scope, group_id, user_id, archiviato);

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- ---------- Versamenti ----------
create table if not exists public.goal_contributions (
  id         bigint generated always as identity primary key,
  goal_id    bigint        not null references public.goals(id) on delete cascade,
  user_id    uuid          not null references auth.users(id),
  -- negativo = prelievo dal salvadanaio
  importo    numeric(12,2) not null check (importo <> 0),
  data       date          not null default current_date,
  nota       text,
  -- true se generato dall'accantonamento automatico
  automatico boolean       not null default false,
  created_at timestamptz   not null default now()
);

create index if not exists goal_contributions_goal on public.goal_contributions (goal_id, data desc);

-- ---------- RLS ----------
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

drop policy if exists goals_rw on public.goals;
create policy goals_rw on public.goals
  for all to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  )
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists goal_contributions_rw on public.goal_contributions;
create policy goal_contributions_rw on public.goal_contributions
  for all to authenticated
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id
        and ((g.scope = 'P' and g.user_id = auth.uid())
          or (g.scope = 'C' and g.group_id = public.current_group_id()))
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.goals g
      where g.id = goal_id
        and ((g.scope = 'P' and g.user_id = auth.uid())
          or (g.scope = 'C' and g.group_id = public.current_group_id()))
    )
  );

-- ---------- Lettura: obiettivi con progresso ----------
create or replace view public.goals_progress
with (security_invoker = true) as
select
  g.*,
  coalesce(c.accantonato, 0)                                   as accantonato,
  greatest(g.target - coalesce(c.accantonato, 0), 0)           as mancante,
  least(round(coalesce(c.accantonato, 0) / g.target * 100), 100) as percentuale,
  c.ultimo_versamento,
  -- mesi stimati al traguardo con l'accantonamento automatico corrente
  case
    when g.auto_importo is null or g.auto_importo <= 0 then null
    else ceil(greatest(g.target - coalesce(c.accantonato, 0), 0) / g.auto_importo)
  end                                                           as mesi_stimati
from public.goals g
left join lateral (
  select sum(gc.importo) as accantonato, max(gc.data) as ultimo_versamento
  from public.goal_contributions gc
  where gc.goal_id = g.id
) c on true;

comment on view public.goals_progress is
  'Obiettivi con accantonato, mancante, percentuale e mesi stimati. Il saldo è sempre derivato dai versamenti.';

-- ---------- Accantonamento automatico ----------
-- Da richiamare una volta al giorno (pg_cron oppure la Edge Function
-- send-reminders già presente). Idempotente: non versa due volte lo
-- stesso mese sullo stesso obiettivo.
create or replace function public.run_auto_contributions(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.goal_contributions (goal_id, user_id, importo, data, nota, automatico)
  select g.id,
         coalesce(g.user_id, ga.admin),
         g.auto_importo,
         p_today,
         'Accantonamento automatico',
         true
  from public.goals g
  left join public.groups_account ga on ga.id = g.group_id
  where g.archiviato = false
    and g.auto_importo is not null
    and g.auto_giorno = extract(day from p_today)::smallint
    and not exists (
      select 1 from public.goal_contributions gc
      where gc.goal_id = g.id
        and gc.automatico
        and date_trunc('month', gc.data) = date_trunc('month', p_today)
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.run_auto_contributions(date) is
  'Esegue gli accantonamenti automatici del giorno. Idempotente per mese.';
