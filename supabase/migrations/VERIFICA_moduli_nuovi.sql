-- ==================================================================
-- VERIFICA DEI MODULI NUOVI — sole letture, rieseguibile
--
-- Da lanciare DOPO APPLICA_TUTTO.sql. Ogni blocco è indipendente:
-- si possono eseguire uno alla volta. Nessuna riga viene scritta.
--
-- Come si legge l'esito: la colonna `esito` dice OK o COSA MANCA.
-- Se un blocco non restituisce righe, quella cosa non esiste.
-- ==================================================================


-- ------------------------------------------------------------------
-- 1 · Ci sono tutte le tabelle e la vista?
-- Atteso: 5 righe, tutte con esito OK.
-- ------------------------------------------------------------------
with attese(nome, tipo) as (
  values ('budgets','tabella'), ('goals','tabella'), ('goal_contributions','tabella'),
         ('expense_splits','tabella'), ('settlements','tabella')
)
select a.nome,
       a.tipo,
       case when c.relname is null then '❌ MANCA' else '✅ OK' end as esito,
       coalesce(c.relrowsecurity, false)                            as rls_attiva
from attese a
left join pg_class c
       on c.relname = a.nome
      and c.relnamespace = 'public'::regnamespace
order by a.nome;

-- La vista goals_progress sta a parte: non ha RLS propria, eredita
-- quella di goals grazie a security_invoker.
select 'goals_progress' as oggetto,
       case when count(*) = 0 then '❌ MANCA' else '✅ OK' end as esito
from pg_views
where schemaname = 'public' and viewname = 'goals_progress';


-- ------------------------------------------------------------------
-- 2 · Ci sono tutte le funzioni, con la firma giusta?
-- Atteso: 8 righe con esito OK.
-- ------------------------------------------------------------------
with attese(nome) as (
  values ('current_group_id'), ('is_group_admin'), ('touch_updated_at'),
         ('get_budget_status'), ('set_budget'), ('clear_budget'),
         ('get_settlement'), ('get_settlement_totals'),
         ('run_auto_contributions'), ('check_splits_sum')
)
select a.nome,
       case when p.proname is null then '❌ MANCA' else '✅ OK' end as esito,
       pg_get_function_identity_arguments(p.oid)                    as argomenti,
       case p.prosecdef when true then 'definer' else 'invoker' end as sicurezza
from attese a
left join pg_proc p
       on p.proname = a.nome
      and p.pronamespace = 'public'::regnamespace
order by a.nome;

-- Attenzione a questa colonna `sicurezza`:
--   get_budget_status, get_settlement, get_settlement_totals, set_budget
--   e clear_budget DEVONO essere `invoker` — l'utente deve vedere solo
--   ciò che le policy su spese gli concedono.
--   current_group_id, is_group_admin e run_auto_contributions sono
--   `definer` di proposito.


-- ------------------------------------------------------------------
-- 3 · Le colonne nuove sulle tabelle esistenti
-- Atteso: 3 righe con esito OK.
-- ------------------------------------------------------------------
with attese(tabella, colonna) as (
  values ('spese','paid_by'), ('spese','receipt_path'), ('spese_personali','receipt_path')
)
select a.tabella,
       a.colonna,
       case when c.column_name is null then '❌ MANCA' else '✅ OK' end as esito,
       c.data_type
from attese a
left join information_schema.columns c
       on c.table_schema = 'public'
      and c.table_name = a.tabella
      and c.column_name = a.colonna
order by a.tabella, a.colonna;


-- ------------------------------------------------------------------
-- 4 · Il bucket degli scontrini è PRIVATO?
-- Atteso: 1 riga, public = false. Se fosse true, le foto degli
-- scontrini sarebbero leggibili da chiunque abbia l'URL.
-- ------------------------------------------------------------------
select id,
       public                                   as e_pubblico,
       case when public then '❌ È PUBBLICO — va messo privato' else '✅ OK, privato' end as esito,
       file_size_limit,
       allowed_mime_types
from storage.buckets
where id = 'receipts';

-- Le policy di Storage sul bucket
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'receipts%'
order by policyname;


-- ------------------------------------------------------------------
-- 5 · Le policy RLS delle tabelle nuove
-- Atteso: almeno una policy per tabella. Se una tabella ha RLS attiva
-- e ZERO policy, nessuno vede più niente di quella tabella.
-- ------------------------------------------------------------------
select tablename, count(*) as n_policy, string_agg(policyname, ', ' order by policyname) as policy
from pg_policies
where schemaname = 'public'
  and tablename in ('budgets','goals','goal_contributions','expense_splits','settlements')
group by tablename
order by tablename;


-- ------------------------------------------------------------------
-- 6 · L'indice che garantisce UN SOLO tetto attivo per categoria
-- Atteso: 1 riga. Senza, si possono creare due budget attivi sulla
-- stessa categoria e la busta compare due volte.
-- ------------------------------------------------------------------
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and indexname = 'budgets_attivo_unico';


-- ------------------------------------------------------------------
-- 7 · Prova sul campo — ESEGUI DA UTENTE AUTENTICATO
-- Nel SQL editor giri come postgres, quindi auth.uid() è NULL e
-- current_group_id() torna NULL: è normale che non esca niente.
-- Il vero collaudo è aprire l'app e guardare /budget e /famiglia.
--
-- Sostituisci <GROUP_ID> con l'id del tuo gruppo per provare le
-- funzioni di lettura a mano.
-- ------------------------------------------------------------------
-- select * from public.get_budget_status('C', <GROUP_ID>, null,
--          date_trunc('month', current_date)::date,
--          (date_trunc('month', current_date) + interval '1 month - 1 day')::date);

-- select * from public.get_settlement(<GROUP_ID>,
--          date_trunc('month', current_date)::date,
--          (date_trunc('month', current_date) + interval '1 month - 1 day')::date);

-- select * from public.get_settlement_totals(<GROUP_ID>,
--          date_trunc('month', current_date)::date,
--          (date_trunc('month', current_date) + interval '1 month - 1 day')::date);


-- ------------------------------------------------------------------
-- 8 · Fondo comune: quante spese storiche restano fuori dal conguaglio
-- paid_by NULL = fondo comune. Le spese anteriori al 16/09/2026 sono
-- tutte così: è voluto, non è un dato da correggere in blocco.
-- ------------------------------------------------------------------
select group_id,
       count(*) filter (where paid_by is null)     as fondo_comune,
       count(*) filter (where paid_by is not null) as anticipi,
       count(*)                                    as totale
from public.spese
where deleted_at is null and tipo_transazione = 'spesa'
group by group_id
order by group_id;


-- ------------------------------------------------------------------
-- 9 · L'accantonamento automatico è pianificato UNA volta al giorno?
-- run_auto_contributions() è idempotente per mese, quindi due
-- esecuzioni nello stesso giorno non versano due volte — ma due
-- pianificazioni restano un segnale di qualcosa fuori posto.
-- Se pg_cron non è installato questo blocco dà errore: ignoralo e
-- pianifica la chiamata dalla Edge Function send-reminders.
-- ------------------------------------------------------------------
-- select jobid, schedule, command, active
-- from cron.job
-- where command like '%run_auto_contributions%';


-- ------------------------------------------------------------------
-- 10 · La modalità segue l'account? (users_group.view_mode)
-- Atteso: la colonna esiste, con il vincolo che ammette solo
-- 'simple', 'advanced' o NULL.
-- ------------------------------------------------------------------
select 'users_group.view_mode' as oggetto,
       case when count(*) = 0 then '❌ MANCA' else '✅ OK' end as esito,
       max(data_type)                                         as tipo,
       max(is_nullable)                                       as ammette_null
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'users_group'
  and column_name  = 'view_mode';

select 'vincolo users_group_view_mode_check' as oggetto,
       case when count(*) = 0 then '❌ MANCA' else '✅ OK' end as esito
from pg_constraint
where conname = 'users_group_view_mode_check'
  and conrelid = 'public.users_group'::regclass;

-- Chi c'era prima della colonna deve risultare 'advanced', così il
-- default a Semplice (OP-025) non gli toglie blocchi. Atteso: zero
-- righe con view_mode NULL fra gli utenti esistenti al momento del
-- deploy. Righe NULL comparse DOPO sono legittime: sono persone nuove
-- che non hanno ancora scelto, e per loro vale Semplice.
select view_mode,
       count(*) as utenti
from public.users_group
group by view_mode
order by view_mode nulls last;
