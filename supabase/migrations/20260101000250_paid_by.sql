-- =============================================================
-- CHI HA PAGATO — fondo comune vs anticipo personale
--
-- spese.user_id è "chi ha inserito il movimento", che non coincide
-- con "chi ha tirato fuori i soldi". Serve una colonna dedicata.
--
--   paid_by IS NULL  →  pagato dal FONDO COMUNE (impostazione di default):
--                       la spesa è già di tutti, non entra nel conguaglio.
--   paid_by = uuid   →  quel membro ha ANTICIPATO di tasca propria:
--                       entra nel conguaglio.
--
-- Le righe già esistenti restano NULL: non sappiamo chi abbia pagato,
-- e "fondo comune" è l'interpretazione che non inventa debiti.
--
-- Applicabile da sola, prima delle altre migrazioni.
-- =============================================================

alter table public.spese
  add column if not exists paid_by uuid references auth.users(id);

comment on column public.spese.paid_by is
  'Chi ha anticipato di tasca propria. NULL = pagato dal fondo comune del gruppo.';

-- Il conguaglio filtra per gruppo + pagante + data.
create index if not exists spese_paid_by_idx
  on public.spese (group_id, paid_by, data_spesa)
  where paid_by is not null;

-- ---------------------------------------------------------------
-- Lettura: nessuna modifica necessaria su questo progetto.
-- get_spese_condivise serializza l'intera riga con to_jsonb(s),
-- quindi paid_by entra nel risultato automaticamente.
-- Verificato con supabase/migrations/VERIFICA_paid_by.sql (blocco 2).
--
-- Se un domani quella funzione dovesse elencare le colonne una per
-- una, andrebbe aggiunta s.paid_by alla select (e alla returns table).
-- ---------------------------------------------------------------
