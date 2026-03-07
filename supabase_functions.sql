-- Function to get daily trend of expenses or income
-- Usage: select * from get_monthly_trend('shared', 123, null, '2024-01-01', '2024-01-31', 'spesa', ARRAY['Casa', 'Spesa'], ARRAY['Esselunga']);
create or replace function get_monthly_trend(
  p_scope text,
  p_group_id bigint,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_type text default 'spesa',
  p_ambito text[] default null,
  p_negozio text[] default null,
  p_ricorrente boolean default null,
  p_confermata boolean default null,
  p_filter_user_id uuid default null
)
returns table (
  period_date date,
  total numeric
)
language plpgsql
security invoker
as $$
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
      and (p_filter_user_id is null or user_id = p_filter_user_id)
    group by data_spesa
    order by data_spesa;
  end if;
end;
$$;

-- Function to get expenses breakdown by category (ambito)
-- Usage: select * from get_category_breakdown('shared', 123, null, '2024-01-01', '2024-01-31', 'spesa');
create or replace function get_category_breakdown(
  p_scope text,
  p_group_id bigint,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_type text default 'spesa',
  p_ambito text[] default null,
  p_negozio text[] default null,
  p_ricorrente boolean default null,
  p_confermata boolean default null,
  p_filter_user_id uuid default null
)
returns table (
  category text,
  total numeric,
  cnt bigint
)
language plpgsql
security invoker
as $$
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
        and (p_filter_user_id is null or user_id = p_filter_user_id)
    group by ambito
    order by total desc;
  end if;
end;
$$;

-- Function to get expenses breakdown by merchant (negozio)
-- Usage: select * from get_merchant_breakdown('shared', 123, null, '2024-01-01', '2024-01-31', 'spesa');
create or replace function get_merchant_breakdown(
  p_scope text,
  p_group_id bigint,
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_type text default 'spesa',
  p_ambito text[] default null,
  p_negozio text[] default null,
  p_ricorrente boolean default null,
  p_confermata boolean default null,
  p_filter_user_id uuid default null
)
returns table (
  merchant text,
  total numeric,
  cnt bigint
)
language plpgsql
security invoker
as $$
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
        and (p_filter_user_id is null or user_id = p_filter_user_id)
    group by negozio
    order by total desc
    limit 20; -- Limit to top 20
  end if;
end;
$$;

-- Function to get distinct filter values
create or replace function get_filter_values(
  p_scope text,
  p_group_id bigint,
  p_user_id uuid,
  p_field text, -- 'ambito' or 'negozio'
  p_type text default 'spesa'
)
returns table (
  value text
)
language plpgsql
security invoker
as $$
begin
  if p_scope = 'personal' then
    if p_field = 'ambito' then
      return query select distinct ambito from public.spese_personali 
      where user_id = p_user_id 
        and tipo_transazione = p_type 
        and deleted_at is null 
        and ambito is not null
      order by ambito;
    elsif p_field = 'negozio' then
      return query select distinct negozio from public.spese_personali 
      where user_id = p_user_id 
        and tipo_transazione = p_type 
        and deleted_at is null 
        and negozio is not null
      order by negozio;
    end if;
  else
    if p_field = 'ambito' then
      return query select distinct ambito from public.spese 
      where group_id = p_group_id 
        and tipo_transazione = p_type 
        and deleted_at is null 
        and ambito is not null
      order by ambito;
    elsif p_field = 'negozio' then
      return query select distinct negozio from public.spese 
      where group_id = p_group_id 
        and tipo_transazione = p_type 
        and deleted_at is null 
        and negozio is not null
      order by negozio;
    end if;
  end if;
end;
$$;
