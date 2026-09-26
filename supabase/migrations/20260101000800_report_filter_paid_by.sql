-- ============================================================
-- 08 · Il Report filtra per chi ha PAGATO (OP-045)
--
-- Le tre RPC del Report ricevono p_filter_user_id dal filtro
-- «Chi ha pagato», ma lo confrontavano con spese.user_id, cioè con chi
-- ha INSERITO la spesa. Da qui il confronto è con spese.paid_by
-- (colonna introdotta da 20260101000250_paid_by.sql): NULL = fondo
-- comune, che quindi non compare filtrando per un membro.
--
-- Solo il ramo di gruppo: spese_personali non ha paid_by e lì il filtro
-- non è offerto. Stesse firme, stessi privilegi; il resto del corpo è
-- identico alla definizione in produzione al 26/09/2026.
-- L'unico chiamante è src/services/statsService.ts.
-- ============================================================

begin;

CREATE OR REPLACE FUNCTION public.get_category_breakdown(p_scope text, p_group_id bigint, p_user_id uuid, p_start_date date, p_end_date date, p_type text DEFAULT 'spesa'::text, p_ambito text[] DEFAULT NULL::text[], p_negozio text[] DEFAULT NULL::text[], p_ricorrente boolean DEFAULT NULL::boolean, p_confermata boolean DEFAULT NULL::boolean, p_filter_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(category text, total numeric, cnt bigint)
 LANGUAGE plpgsql
AS $function$
begin
  if p_scope = 'personal' then
    return query
    select
      ambito as category,
      sum(importo) as total,
      count(*) as cnt
    from public.spese_personali
    where user_id = p_user_id
        and data_spesa between p_start_date and p_end_date
        and tipo_transazione = p_type
        and deleted_at is null
        and (p_ambito is null or ambito = ANY(p_ambito))
        and (p_negozio is null or negozio = ANY(p_negozio))
        and (p_ricorrente is null or ricorrente = p_ricorrente)
        and (p_confermata is null or confermata = p_confermata)
    group by ambito
    order by total desc;
  else
    return query
    select
      ambito as category,
      sum(importo) as total,
      count(*) as cnt
    from public.spese
    where group_id = p_group_id
        and data_spesa between p_start_date and p_end_date
        and tipo_transazione = p_type
        and deleted_at is null
        and (p_ambito is null or ambito = ANY(p_ambito))
        and (p_negozio is null or negozio = ANY(p_negozio))
        and (p_ricorrente is null or ricorrente = p_ricorrente)
        and (p_confermata is null or confermata = p_confermata)
        and (p_filter_user_id is null or paid_by = p_filter_user_id)
    group by ambito
    order by total desc;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_merchant_breakdown(p_scope text, p_group_id bigint, p_user_id uuid, p_start_date date, p_end_date date, p_type text DEFAULT 'spesa'::text, p_ambito text[] DEFAULT NULL::text[], p_negozio text[] DEFAULT NULL::text[], p_ricorrente boolean DEFAULT NULL::boolean, p_confermata boolean DEFAULT NULL::boolean, p_filter_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(merchant text, total numeric, cnt bigint)
 LANGUAGE plpgsql
AS $function$
begin
  if p_scope = 'personal' then
    return query
    select
      negozio as merchant,
      sum(importo) as total,
      count(*) as cnt
    from public.spese_personali
    where user_id = p_user_id
        and data_spesa between p_start_date and p_end_date
        and tipo_transazione = p_type
        and deleted_at is null
        and (p_ambito is null or ambito = ANY(p_ambito))
        and (p_negozio is null or negozio = ANY(p_negozio))
        and (p_ricorrente is null or ricorrente = p_ricorrente)
        and (p_confermata is null or confermata = p_confermata)
    group by negozio
    order by total desc
    limit 20; -- Limit to top 20
  else
    return query
    select
      negozio as merchant,
      sum(importo) as total,
      count(*) as cnt
    from public.spese
    where group_id = p_group_id
        and data_spesa between p_start_date and p_end_date
        and tipo_transazione = p_type
        and deleted_at is null
        and (p_ambito is null or ambito = ANY(p_ambito))
        and (p_negozio is null or negozio = ANY(p_negozio))
        and (p_ricorrente is null or ricorrente = p_ricorrente)
        and (p_confermata is null or confermata = p_confermata)
        and (p_filter_user_id is null or paid_by = p_filter_user_id)
    group by negozio
    order by total desc
    limit 20; -- Limit to top 20
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_trend(p_scope text, p_group_id bigint, p_user_id uuid, p_start_date date, p_end_date date, p_type text DEFAULT 'spesa'::text, p_ambito text[] DEFAULT NULL::text[], p_negozio text[] DEFAULT NULL::text[], p_ricorrente boolean DEFAULT NULL::boolean, p_confermata boolean DEFAULT NULL::boolean, p_filter_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(period_date date, total numeric)
 LANGUAGE plpgsql
AS $function$
begin
  if p_scope = 'personal' then
    return query
    select
      data_spesa,
      sum(importo) as total
    from public.spese_personali
    where user_id = p_user_id
      and data_spesa between p_start_date and p_end_date
      and tipo_transazione = p_type
      and deleted_at is null
      and (p_ambito is null or ambito = ANY(p_ambito))
      and (p_negozio is null or negozio = ANY(p_negozio))
      and (p_ricorrente is null or ricorrente = p_ricorrente)
      and (p_confermata is null or confermata = p_confermata)
    group by data_spesa
    order by data_spesa;
  else
    return query
    select
      data_spesa,
      sum(importo) as total
    from public.spese
    where group_id = p_group_id
      and data_spesa between p_start_date and p_end_date
      and tipo_transazione = p_type
      and deleted_at is null
      and (p_ambito is null or ambito = ANY(p_ambito))
      and (p_negozio is null or negozio = ANY(p_negozio))
      and (p_ricorrente is null or ricorrente = p_ricorrente)
      and (p_confermata is null or confermata = p_confermata)
      and (p_filter_user_id is null or paid_by = p_filter_user_id)
    group by data_spesa
    order by data_spesa;
  end if;
end;
$function$;

commit;
