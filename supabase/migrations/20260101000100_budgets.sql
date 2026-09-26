-- =============================================================
-- 01 · BUDGET A BUSTE
-- Un tetto mensile per categoria, con storico: cambiare il tetto
-- non deve riscrivere il passato, quindi si versiona per periodo
-- (valido_da / valido_a) invece di aggiornare la riga in place.
-- =============================================================

create table if not exists public.budgets (
  id          bigint generated always as identity primary key,

  -- 'C' = gruppo, 'P' = personale. Stessa convenzione di spese.tipo_spesa.
  scope       char(1)      not null check (scope in ('C', 'P')),
  group_id    bigint       references public.groups_account(id) on delete cascade,
  user_id     uuid         references auth.users(id)            on delete cascade,

  categoria   text         not null,
  tetto       numeric(12,2) not null check (tetto > 0),

  -- periodo di validità del tetto; valido_a null = ancora in vigore
  valido_da   date         not null default date_trunc('month', current_date)::date,
  valido_a    date,

  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),

  constraint budgets_owner_coerente check (
    (scope = 'C' and group_id is not null and user_id is null) or
    (scope = 'P' and user_id  is not null and group_id is null)
  ),
  constraint budgets_periodo_valido check (valido_a is null or valido_a >= valido_da)
);

-- Un solo tetto attivo per categoria e portafoglio.
create unique index if not exists budgets_attivo_unico
  on public.budgets (scope, coalesce(group_id, 0), coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(categoria))
  where valido_a is null;

create index if not exists budgets_lookup
  on public.budgets (scope, group_id, user_id, valido_da desc);

drop trigger if exists budgets_touch on public.budgets;
create trigger budgets_touch before update on public.budgets
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.budgets enable row level security;

drop policy if exists budgets_select on public.budgets;
create policy budgets_select on public.budgets
  for select to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_insert on public.budgets;
create policy budgets_insert on public.budgets
  for insert to authenticated
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_update on public.budgets;
create policy budgets_update on public.budgets
  for update to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  )
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_delete on public.budgets;
create policy budgets_delete on public.budgets
  for delete to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id() and public.is_group_admin(group_id))
  );

-- ---------- Lettura: stato dei budget in un periodo ----------
-- Restituisce, per ogni categoria con un tetto attivo nel periodo:
-- il tetto, lo speso reale (confermato e già avvenuto) e lo speso
-- previsto (tutto il periodo). È la stessa distinzione reale/previsto
-- usata dal resto dell'app: vedi src/lib/finance.ts.
create or replace function public.get_budget_status(
  p_scope     char(1),
  p_group_id  bigint,
  p_user_id   uuid,
  p_start     date,
  p_end       date
)
returns table (
  categoria     text,
  tetto         numeric,
  speso_reale   numeric,
  speso_previsto numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with tetti as (
    select b.categoria, b.tetto
    from public.budgets b
    where b.scope = p_scope
      and (p_scope <> 'C' or b.group_id = p_group_id)
      and (p_scope <> 'P' or b.user_id  = p_user_id)
      and b.valido_da <= p_end
      and (b.valido_a is null or b.valido_a >= p_start)
  ),
  movimenti as (
    select s.ambito as categoria,
           s.importo,
           s.confermata,
           s.data_spesa
    from public.spese s
    where p_scope = 'C'
      and s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.data_spesa between p_start and p_end
    union all
    select sp.ambito, sp.importo, sp.confermata, sp.data_spesa
    from public.spese_personali sp
    where p_scope = 'P'
      and sp.user_id = p_user_id
      and sp.tipo_transazione = 'spesa'
      and sp.deleted_at is null
      and coalesce(sp.is_recurring_parent, false) = false
      and sp.data_spesa between p_start and p_end
  )
  select t.categoria,
         t.tetto,
         coalesce(sum(m.importo) filter (
           where m.confermata and m.data_spesa <= current_date
         ), 0) as speso_reale,
         coalesce(sum(m.importo), 0) as speso_previsto
  from tetti t
  left join movimenti m on lower(m.categoria) = lower(t.categoria)
  group by t.categoria, t.tetto
  order by t.tetto desc;
$$;

grant execute on function public.get_budget_status(char, bigint, uuid, date, date) to authenticated;

comment on table public.budgets is
  'Tetti di spesa per categoria, versionati per periodo. Il frontend legge lo stato con get_budget_status().';

-- ---------- Scrittura: versionare un tetto ----------
-- Cambiare un tetto è due operazioni (chiudi la versione in corso,
-- aprine una nuova) che devono riuscire o fallire insieme: in mezzo
-- l'indice unico parziale lascerebbe la categoria senza tetto attivo.
--
-- Regola di versionamento, per non ritrovarsi due versioni che
-- coprono lo stesso periodo (get_budget_status le restituirebbe
-- entrambe, e la stessa busta comparirebbe due volte):
--
--   versione attiva nata IN questo periodo  → si aggiorna in place
--   versione attiva nata PRIMA              → si chiude il giorno
--                                             prima dell'inizio del
--                                             periodo e se ne apre una
--                                             nuova che parte da lì
--
-- p_period_start è l'inizio del periodo corrente dell'app, che con i
-- periodi personalizzati non è il primo del mese.
create or replace function public.set_budget(
  p_scope        char(1),
  p_group_id     bigint,
  p_user_id      uuid,
  p_categoria    text,
  p_tetto        numeric,
  p_period_start date default date_trunc('month', current_date)::date
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attivo   public.budgets;
  v_id       bigint;
begin
  if p_tetto is null or p_tetto <= 0 then
    raise exception 'Il tetto deve essere maggiore di zero';
  end if;
  if length(btrim(coalesce(p_categoria, ''))) = 0 then
    raise exception 'La categoria è obbligatoria';
  end if;

  select * into v_attivo
  from public.budgets b
  where b.scope = p_scope
    and b.valido_a is null
    and lower(b.categoria) = lower(btrim(p_categoria))
    and (p_scope <> 'C' or b.group_id = p_group_id)
    and (p_scope <> 'P' or b.user_id  = p_user_id)
  limit 1;

  if found then
    -- nata in questo periodo: non ha mai governato un periodo chiuso
    if v_attivo.valido_da >= p_period_start then
      update public.budgets
         set tetto = p_tetto
       where id = v_attivo.id
      returning id into v_id;
      return v_id;
    end if;

    update public.budgets
       set valido_a = p_period_start - 1
     where id = v_attivo.id;
  end if;

  insert into public.budgets (scope, group_id, user_id, categoria, tetto, valido_da)
  values (
    p_scope,
    case when p_scope = 'C' then p_group_id end,
    case when p_scope = 'P' then p_user_id  end,
    btrim(p_categoria),
    p_tetto,
    p_period_start
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.set_budget(char, bigint, uuid, text, numeric, date) to authenticated;

-- ---------- Scrittura: togliere un tetto ----------
-- Mai DELETE: il tetto che valeva a settembre deve restare leggibile
-- guardando settembre. Si chiude e basta.
create or replace function public.clear_budget(
  p_scope        char(1),
  p_group_id     bigint,
  p_user_id      uuid,
  p_categoria    text,
  p_period_start date default date_trunc('month', current_date)::date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attivo public.budgets;
begin
  select * into v_attivo
  from public.budgets b
  where b.scope = p_scope
    and b.valido_a is null
    and lower(b.categoria) = lower(btrim(p_categoria))
    and (p_scope <> 'C' or b.group_id = p_group_id)
    and (p_scope <> 'P' or b.user_id  = p_user_id)
  limit 1;

  if not found then
    return;
  end if;

  -- mai esistito per un periodo chiuso: si può togliere del tutto
  if v_attivo.valido_da >= p_period_start then
    delete from public.budgets where id = v_attivo.id;
  else
    update public.budgets
       set valido_a = p_period_start - 1
     where id = v_attivo.id;
  end if;
end;
$$;

grant execute on function public.clear_budget(char, bigint, uuid, text, date) to authenticated;
