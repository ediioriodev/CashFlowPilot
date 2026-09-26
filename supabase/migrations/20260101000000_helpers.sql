-- =============================================================
-- 00 · Funzioni di supporto condivise dai nuovi moduli
--
-- ATTENZIONE: rivedere queste policy insieme a quelle già attive
-- sulle tabelle esistenti (spese, spese_personali, users_group):
-- il repository non le contiene, quindi qui si assume la
-- convenzione "un utente appartiene a un solo gruppo".
-- =============================================================

-- Gruppo dell'utente autenticato. SECURITY DEFINER per poter leggere
-- users_group anche dalle policy delle nuove tabelle senza ricorsione.
create or replace function public.current_group_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select group_id
  from public.users_group
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_group_id() from public;
grant execute on function public.current_group_id() to authenticated;

-- True se l'utente autenticato è l'amministratore del gruppo indicato.
create or replace function public.is_group_admin(p_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups_account
    where id = p_group_id and admin = auth.uid()
  );
$$;

revoke all on function public.is_group_admin(bigint) from public;
grant execute on function public.is_group_admin(bigint) to authenticated;

-- Aggiorna updated_at su ogni UPDATE.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
