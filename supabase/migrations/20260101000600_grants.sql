-- =============================================================
-- 07 · Privilegi di esecuzione — correzione post-deploy 19/09/2026
--
-- PERCHÉ ESISTE
-- I blocchi 00 e 02 contenevano già l'intenzione giusta:
--
--   revoke all on function public.current_group_id() from public;
--   grant execute on function public.current_group_id() to authenticated;
--
-- ma non ha funzionato, e vale la pena capire perché prima di
-- ripetere l'errore altrove. `revoke ... from public` toglie solo il
-- grant al pseudo-ruolo PUBLIC. Supabase però ha un
-- ALTER DEFAULT PRIVILEGES che assegna EXECUTE a anon, authenticated
-- e service_role su OGNI funzione creata in `public`: sono grant
-- espliciti, nominali, che una revoca a PUBLIC non tocca.
--
-- Risultato letto dagli advisor dopo il deploy: current_group_id,
-- is_group_admin e run_auto_contributions risultavano invocabili da
-- `anon`, cioè da chiunque, senza aver fatto accesso, via
-- /rest/v1/rpc/<nome>.
--
-- QUANTO È GRAVE, FUNZIONE PER FUNZIONE
-- - current_group_id() e is_group_admin(): innocue per l'anonimo.
--   Si basano su auth.uid(), che senza sessione è NULL: restituiscono
--   NULL e false. Si restringono per igiene e perché l'intenzione
--   dichiarata nella migrazione era «solo authenticated».
-- - run_auto_contributions(date): questa no. È SECURITY DEFINER,
--   non guarda auth.uid() e scrive in goal_contributions per TUTTI i
--   gruppi. La protezione contro i doppioni è per mese, ma il mese lo
--   decide il parametro: un chiamante anonimo poteva passare
--   p_today a piacere e infilare versamenti automatici in mesi
--   arbitrari, su obiettivi altrui. È l'unica falla vera del deploy.
--
-- ATTENZIONE a non restringere troppo: current_group_id() e
-- is_group_admin() sono chiamate DENTRO le policy RLS delle tabelle
-- nuove, e le espressioni delle policy girano con i privilegi di chi
-- interroga. Togliere EXECUTE ad `authenticated` farebbe fallire ogni
-- lettura di budgets, goals, expense_splits e settlements.
-- =============================================================

-- ---------- Funzioni di supporto: solo chi ha fatto accesso ----------
-- L'anonimo non ne ha bisogno: le policy che le usano sono tutte
-- `to authenticated`, quindi per `anon` non viene valutata nessuna
-- policy e nessuna chiamata parte.
revoke execute on function public.current_group_id()        from anon;
revoke execute on function public.is_group_admin(bigint)    from anon;

-- ---------- Accantonamento automatico: solo il job ----------
-- Non è un'operazione dell'utente: la invoca pg_cron o una Edge
-- Function con la service key. Nessuna schermata dell'app la chiama
-- (verificato su src/), quindi togliere authenticated non toglie
-- niente a nessuno.
--
-- ⚠️ `from public` NON è ridondante con `from anon, authenticated`, ed
-- è l'errore che questa riga ha già fatto una volta: il blocco 00
-- faceva `revoke all ... from public` sulle sue due funzioni, il
-- blocco 02 no. Quindi run_auto_contributions aveva DUE concessioni
-- sovrapposte — quelle nominali ad anon/authenticated e quella al
-- pseudo-ruolo PUBLIC, che in pg_proc.proacl si legge come `=X/postgres`,
-- senza nome davanti. Revocando solo le prime, la seconda continuava a
-- concedere execute a chiunque e has_function_privilege('anon', …)
-- restava true. Si tolgono tutte e tre.
revoke execute on function public.run_auto_contributions(date) from public, anon, authenticated;
grant  execute on function public.run_auto_contributions(date) to   service_role;

-- Stesso motivo, sulle due funzioni di trigger: anche loro nascono con
-- il grant a PUBLIC. Qui non c'è una falla — non sono SECURITY DEFINER
-- e chiamarle via RPC fallisce comunque («trigger functions can only be
-- called as triggers») — ma non hanno ragione di stare nella superficie
-- esposta da PostgREST.
revoke execute on function public.touch_updated_at()  from public, anon, authenticated;
revoke execute on function public.check_splits_sum()  from public, anon, authenticated;

-- ---------- search_path fissato sulle due funzioni trigger ----------
-- Le altre funzioni nuove lo avevano già (`set search_path = public`).
-- Queste due no, e comparivano come function_search_path_mutable negli
-- advisor. Sono funzioni di trigger: girano con il search_path di chi
-- scatena l'UPDATE, che è manipolabile.
alter function public.touch_updated_at()  set search_path = public;
alter function public.check_splits_sum()  set search_path = public;

-- ---------- Verifica, da rileggere dopo ----------
-- Attese: anon_puo = false su tutte e tre; auth_puo = true sulle due
-- funzioni di supporto e false su run_auto_contributions.
--
-- Guarda anche la colonna acl: non deve più comparire una voce che
-- inizia con `=X/`, cioè senza nome di ruolo. Quella è PUBLIC, ed è
-- il modo per accorgersi che una revoca nominale non è bastata.
--
--   select p.proname,
--          has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_puo,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_puo,
--          array_to_string(p.proacl, '  |  ')                        as acl
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('current_group_id','is_group_admin','run_auto_contributions')
--   order by p.proname;
