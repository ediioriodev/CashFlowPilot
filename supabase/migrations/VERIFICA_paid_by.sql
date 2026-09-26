-- =============================================================
-- VERIFICA dopo 20260101000250_paid_by.sql
-- Solo letture: non modificano nulla.
-- =============================================================

-- 1. La colonna c'è?
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'spese' and column_name = 'paid_by';
-- Atteso: una riga, uuid, YES


-- 2. La funzione di lettura restituisce davvero paid_by?
--
--    Questa è la verifica che conta: guarda l'OUTPUT, non la firma.
--    (Ispezionare pg_proc.proargnames non serve: per una funzione che
--    RETURNS jsonb quei nomi sono solo i parametri di ingresso.)
select (public.get_spese_condivise('2000-01-01'::date, '2100-01-01'::date, g.id) -> 0) ? 'paid_by'
       as contiene_paid_by
from public.groups_account g
limit 1;
--
--    true  → tutto a posto, nessuna modifica da fare.
--            È il caso quando la funzione usa to_jsonb(s) o select s.*:
--            serializza l'intera riga, quindi le colonne nuove entrano da sole.
--    false → la funzione elenca le colonne una per una: va aggiunta paid_by
--            alla select (e alla "returns table", se dichiarata). Stampa la
--            definizione con il blocco 3 prima di riscriverla.
--            Se invece la definizione contiene già paid_by, è solo un piano
--            in cache su una connessione aperta prima dell'ALTER TABLE:
--            basta riconnettersi.
--
--    NB: get_spese_personali NON deve avere paid_by. La colonna esiste solo
--        su "spese": una spesa personale non si divide con nessuno.


-- 3. Definizione attuale, una riga per riga (nella griglia dei risultati
--    la cella unica verrebbe troncata).
select t.ordinality as riga, t.linea
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral unnest(string_to_array(pg_get_functiondef(p.oid), E'\n'))
     with ordinality as t(linea, ordinality)
where n.nspname = 'public'
  and p.proname = 'get_spese_condivise'
order by t.ordinality;


-- 4. Quante spese sono da fondo comune e quante anticipate, per gruppo.
--    Utile per capire se il conguaglio in /famiglia ha qualcosa da mostrare.
select group_id,
       count(*) filter (where paid_by is null)     as da_fondo_comune,
       count(*) filter (where paid_by is not null) as anticipate
from public.spese
where deleted_at is null
  and tipo_transazione = 'spesa'
  and coalesce(is_recurring_parent, false) = false
group by group_id
order by group_id;
