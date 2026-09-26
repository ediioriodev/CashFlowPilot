-- =============================================================
-- 06 · Modalità Semplice / Avanzata legata all'account
--
-- Prima la preferenza viveva solo in localStorage: cambiava per
-- dispositivo, non per persona. Chi usava l'app dal telefono e dal
-- computer si trovava due modalità diverse senza capire perché.
--
-- La colonna è NULLABLE di proposito, e il NULL ha un significato
-- preciso: "questa persona non ha ancora scelto". Serve a distinguere
-- chi vuole Avanzata da chi non si è mai espresso, che è la sola
-- informazione che permette di cambiare il default senza togliere
-- blocchi a chi già li vedeva (vedi OP-025).
-- =============================================================

alter table public.users_group
  add column if not exists view_mode text;

-- Il vincolo si aggiunge a parte: `add column if not exists` non
-- riapplica un check su una colonna che esisteva già.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_group_view_mode_check'
      and conrelid = 'public.users_group'::regclass
  ) then
    alter table public.users_group
      add constraint users_group_view_mode_check
      check (view_mode is null or view_mode in ('simple','advanced'));
  end if;
end $$;

comment on column public.users_group.view_mode is
  'Modalità scelta dall''utente: simple | advanced. NULL = non ha ancora scelto, vale il default dell''app.';

-- Chi c'era prima di questa colonna ha sempre visto Avanzata: glielo
-- si scrive esplicitamente, così il passaggio del default a Semplice
-- (OP-025) riguarda solo chi arriva dopo. Senza questa riga il cambio
-- di default farebbe sparire blocchi a chi li usa ogni giorno.
--
-- La seconda condizione serve all'idempotenza, e non è pignoleria:
-- `where view_mode is null` da solo non basta, perché chi si registra
-- DOPO questa migrazione nasce con NULL — cioè "scelga l'app per me",
-- che d'ora in poi vuol dire Semplice. Rieseguire il bundle lo
-- ribalterebbe ad Avanzata senza che nessuno l'abbia chiesto.
-- Con il `not exists` il travaso avviene solo la prima volta, quando
-- nessuno ha ancora un valore: dalla seconda in poi è un no-op.
update public.users_group
   set view_mode = 'advanced'
 where view_mode is null
   and not exists (
     select 1 from public.users_group where view_mode is not null
   );

-- Nessuna policy nuova: `view_mode` sta su users_group, già coperta da
-- "Update record personale" (auth.uid() = user_id) in scrittura e dalle
-- SELECT esistenti in lettura. Vedi design/RLS-BASELINE.md.
