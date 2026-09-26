-- =============================================================
-- 03 · CHI HA PAGATO, QUOTE PERSONALIZZATE E CONGUAGLI
--
-- Oggi il frontend (src/services/familyService.ts) calcola il
-- conguaglio da spese.user_id, che però è "chi ha inserito", non
-- "chi ha pagato", e assume sempre la divisione in parti uguali.
-- Questa migrazione separa le due cose e rende i conguagli chiudibili.
-- =============================================================

-- ---------- 3.1 Chi ha pagato davvero ----------
-- Già introdotta da 20260101000250_paid_by.sql, che è applicabile da sola.
-- Qui la ripetiamo in forma idempotente per chi parte da zero.
--   paid_by IS NULL = fondo comune (non entra nel conguaglio)
--   paid_by = uuid  = anticipo personale
alter table public.spese
  add column if not exists paid_by uuid references auth.users(id);

create index if not exists spese_paid_by_idx
  on public.spese (group_id, paid_by, data_spesa)
  where paid_by is not null;

-- ---------- 3.2 Quote personalizzate ----------
-- Se una spesa non ha righe in expense_splits vale la divisione in
-- parti uguali fra i membri del gruppo: nessuna migrazione dei dati.
create table if not exists public.expense_splits (
  id         bigint generated always as identity primary key,
  spesa_id   bigint        not null references public.spese(id) on delete cascade,
  user_id    uuid          not null references auth.users(id),
  quota      numeric(12,2) not null check (quota >= 0),
  created_at timestamptz   not null default now(),
  unique (spesa_id, user_id)
);

create index if not exists expense_splits_spesa on public.expense_splits (spesa_id);

-- La somma delle quote deve coincidere con l'importo della spesa.
create or replace function public.check_splits_sum()
returns trigger
language plpgsql
as $$
declare
  v_spesa_id bigint := coalesce(new.spesa_id, old.spesa_id);
  v_importo  numeric;
  v_somma    numeric;
begin
  select importo into v_importo from public.spese where id = v_spesa_id;
  select coalesce(sum(quota), 0) into v_somma from public.expense_splits where spesa_id = v_spesa_id;

  -- 0 righe = torna alla divisione in parti uguali: è uno stato valido.
  if v_somma > 0 and abs(v_somma - v_importo) > 0.01 then
    raise exception 'Le quote (%) non coincidono con l''importo della spesa (%)', v_somma, v_importo;
  end if;
  return null;
end;
$$;

drop trigger if exists expense_splits_sum on public.expense_splits;
create constraint trigger expense_splits_sum
  after insert or update or delete on public.expense_splits
  deferrable initially deferred
  for each row execute function public.check_splits_sum();

-- ---------- 3.3 Conguagli chiusi ----------
create table if not exists public.settlements (
  id           bigint generated always as identity primary key,
  group_id     bigint      not null references public.groups_account(id) on delete cascade,
  period_start date        not null,
  period_end   date        not null,
  -- fotografia dei trasferimenti al momento della chiusura:
  -- [{ "from": uuid, "to": uuid, "amount": 123.45 }, …]
  dettaglio    jsonb       not null,
  totale       numeric(12,2) not null default 0,
  closed_by    uuid        not null references auth.users(id),
  closed_at    timestamptz not null default now(),
  constraint settlements_periodo_valido check (period_end >= period_start),
  unique (group_id, period_start, period_end)
);

create index if not exists settlements_group on public.settlements (group_id, period_end desc);

-- ---------- RLS ----------
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

drop policy if exists expense_splits_rw on public.expense_splits;
create policy expense_splits_rw on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and s.group_id = public.current_group_id()
    )
  )
  with check (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and s.group_id = public.current_group_id()
    )
  );

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (group_id = public.current_group_id());

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (group_id = public.current_group_id() and closed_by = auth.uid());

-- Un conguaglio chiuso è un fatto storico: non si modifica.
-- Se serve correggerlo, lo elimina l'amministratore e si richiude.
drop policy if exists settlements_delete on public.settlements;
create policy settlements_delete on public.settlements
  for delete to authenticated
  using (group_id = public.current_group_id() and public.is_group_admin(group_id));

-- ---------- Lettura: conguaglio del periodo ----------
-- Regole, nell'ordine in cui contano:
--
--   1. FONDO COMUNE (paid_by IS NULL) → la spesa NON entra nel conguaglio.
--      È la semantica decisa con 20260101000250_paid_by.sql e già in
--      produzione: le spese anteriori al 16/09/2026 hanno tutte paid_by
--      NULL e non devono generare debiti retroattivi. Per questo qui NON
--      si fa coalesce(paid_by, user_id): user_id è "chi ha inserito", non
--      "chi ha pagato".
--   2. QUOTE: se la spesa ha righe in expense_splits valgono quelle,
--      altrimenti parti uguali fra i membri del gruppo.
--   3. CONGUAGLI CHIUSI: le spese che cadono in un periodo già chiuso
--      (public.settlements) restano fuori dal calcolo.
create or replace function public.get_settlement(
  p_group_id bigint,
  p_start    date,
  p_end      date
)
returns table (
  user_id  uuid,
  pagato   numeric,
  dovuto   numeric,
  saldo    numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with membri as (
    select ug.user_id
    from public.users_group ug
    where ug.group_id = p_group_id and ug.user_id is not null
  ),
  n_membri as (
    select greatest(count(*), 1) as n from membri
  ),
  -- solo gli ANTICIPI: il fondo comune è già di tutti
  anticipi as (
    select s.id, s.importo, s.paid_by as pagante
    from public.spese s
    where s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.confermata
      and s.paid_by is not null
      and s.data_spesa between p_start and p_end
      and s.data_spesa <= current_date
      and not exists (
        select 1 from public.settlements st
        where st.group_id = p_group_id
          and s.data_spesa between st.period_start and st.period_end
      )
  ),
  pagato as (
    select m.user_id, coalesce(sum(a.importo), 0) as tot
    from membri m
    left join anticipi a on a.pagante = m.user_id
    group by m.user_id
  ),
  dovuto as (
    select m.user_id,
           coalesce(sum(
             coalesce(
               (select es.quota
                  from public.expense_splits es
                 where es.spesa_id = a.id and es.user_id = m.user_id),
               case
                 when exists (select 1 from public.expense_splits es2 where es2.spesa_id = a.id)
                   then 0
                 else a.importo / (select n from n_membri)
               end
             )
           ), 0) as tot
    from membri m
    left join anticipi a on true
    group by m.user_id
  )
  select p.user_id,
         round(p.tot, 2)         as pagato,
         round(d.tot, 2)         as dovuto,
         round(p.tot - d.tot, 2) as saldo
  from pagato p
  join dovuto d using (user_id)
  order by 4 desc;
$$;

grant execute on function public.get_settlement(bigint, date, date) to authenticated;

comment on function public.get_settlement(bigint, date, date) is
  'Conguaglio del periodo: solo anticipi (paid_by non nullo), quote da expense_splits o parti uguali, esclusi i periodi già chiusi in settlements.';

-- ---------- Lettura: totali del periodo ----------
-- Serve alla pagina /famiglia per dire quanto è uscito in tutto, quanto
-- dal fondo comune e quanto è stato anticipato. Sono gli stessi filtri
-- di get_settlement, senza il calcolo delle quote.
create or replace function public.get_settlement_totals(
  p_group_id bigint,
  p_start    date,
  p_end      date
)
returns table (
  totale       numeric,
  fondo_comune numeric,
  anticipato   numeric,
  n_spese      integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with spese_periodo as (
    select s.importo, s.paid_by
    from public.spese s
    where s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.confermata
      and s.data_spesa between p_start and p_end
      and s.data_spesa <= current_date
      and not exists (
        select 1 from public.settlements st
        where st.group_id = p_group_id
          and s.data_spesa between st.period_start and st.period_end
      )
  )
  select round(coalesce(sum(importo), 0), 2)                                          as totale,
         round(coalesce(sum(importo) filter (where paid_by is null), 0), 2)           as fondo_comune,
         round(coalesce(sum(importo) filter (where paid_by is not null), 0), 2)       as anticipato,
         count(*)::integer                                                            as n_spese
  from spese_periodo;
$$;

grant execute on function public.get_settlement_totals(bigint, date, date) to authenticated;
