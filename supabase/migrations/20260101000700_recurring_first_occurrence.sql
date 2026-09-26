-- ============================================================
-- 07 · La prima rata delle ricorrenti torna nei conti (OP-044)
--
-- Una spesa ricorrente si salva come una riga "capostipite"
-- (is_recurring_parent = true) più le occorrenze successive
-- (recurring_parent_id = capostipite): expenseService.createExpense
-- genera le figlie a partire dalla data SUCCESSIVA. La capostipite
-- è quindi la PRIMA occorrenza, non un modello.
--
-- Le tre funzioni qui sotto la escludevano, e con lei la prima rata
-- di ogni ricorrente spariva da budget e conguaglio. Verificato il
-- 26/09/2026: nessuna figlia cade nella stessa data della sua
-- capostipite, quindi contarla non crea doppioni.
--
-- Stesse firme: create or replace conserva i privilegi del blocco 07.
-- Idempotente: si può rieseguire.
-- ============================================================

begin;

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
      and s.data_spesa between p_start and p_end
    union all
    select sp.ambito, sp.importo, sp.confermata, sp.data_spesa
    from public.spese_personali sp
    where p_scope = 'P'
      and sp.user_id = p_user_id
      and sp.tipo_transazione = 'spesa'
      and sp.deleted_at is null
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

commit;
