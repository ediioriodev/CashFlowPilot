-- =============================================================================
-- 20260101001000_schedule_auto_contributions.sql — OP-022
--
-- L'accantonamento automatico degli obiettivi aveva la funzione ma non
-- l'orologio: run_auto_contributions() non la chiamava nessuno. Qui:
--
-- 1. La funzione guarda la data nel fuso di Roma (pg_cron gira in UTC) e fa
--    scattare un auto_giorno oltre la fine del mese l'ultimo giorno del mese.
--    Oggi è solo una protezione: goals_auto_giorno_check e l'interfaccia
--    limitano già il giorno a 1-28, quindi ogni mese lo contiene.
--    Resto invariato: un versamento automatico per obiettivo al mese,
--    obiettivi di gruppo attribuiti all'amministratore, idempotente.
-- 2. Un job pg_cron la chiama ogni giorno alle 04:00 UTC (06:00 in estate,
--    05:00 in inverno). Gira come postgres: nessuna service key.
--
-- Niente recupero dei giorni passati: un versamento mancato prima di questa
-- migrazione resta mancato, di proposito (non si inventano movimenti).
-- Idempotente.
-- =============================================================================

create or replace function public.run_auto_contributions(
  p_today date default (now() at time zone 'Europe/Rome')::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_day smallint := extract(day from p_today)::smallint;
  v_last_day boolean := p_today = (date_trunc('month', p_today) + interval '1 month - 1 day')::date;
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
    and (g.auto_giorno = v_day or (v_last_day and g.auto_giorno > v_day))
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

-- Privilegi come dal blocco 07: solo service_role (e il proprietario).
revoke execute on function public.run_auto_contributions(date) from public, anon, authenticated;
grant  execute on function public.run_auto_contributions(date) to service_role;

-- Il job: tolto se esiste, poi ricreato.
select cron.unschedule(jobid) from cron.job where jobname = 'accantonamenti-automatici';
select cron.schedule(
  'accantonamenti-automatici',
  '0 4 * * *',
  $job$select public.run_auto_contributions((now() at time zone 'Europe/Rome')::date)$job$
);
