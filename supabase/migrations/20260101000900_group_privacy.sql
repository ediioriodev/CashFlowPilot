-- =============================================================================
-- 20260101000900_group_privacy.sql — OP-030 e OP-031
--
-- OP-030 · users_group e groups_account erano leggibili per intero da ogni
--   utente autenticato (due SELECT a «true» per tabella, una chiamata Insert_…).
--   In più, scavando:
--   - la policy UPDATE di users_group controllava solo user_id: un utente poteva
--     riscrivere il proprio group_id ed entrare nel gruppo di un'altra famiglia;
--   - la policy UPDATE di groups_account lasciava a ogni membro riscrivere admin;
--   - push_token era leggibile da chiunque potesse leggere la riga.
--   Ora: si legge solo il proprio gruppo; push_token non è leggibile dal client
--   (lo usano solo le Edge Function con service_role); si aggiornano solo le
--   colonne che l'app scrive davvero; niente per anon.
--
-- OP-031 · sei funzioni SECURITY DEFINER eseguibili da anon. Tre si fidavano di
--   un id utente passato dal client:
--   - register_user_with_group(p_user_id) creava un gruppo e una riga
--     users_group per un utente qualsiasi, anche già iscritto altrove;
--   - accept_invite(p_user_id) aggiungeva un utente qualsiasi a un gruppo;
--   - create_invite(p_invited_by) e cancel_invite(p_user_id) credevano sulla
--     parola a chi diceva di essere.
--   Ora:
--   - notify_new_expense: funzione di trigger, nessuno la chiama via RPC;
--   - create_invite, cancel_invite: solo authenticated, e l'id deve essere
--     auth.uid();
--   - register_user_with_group, accept_invite: restano eseguibili da anon
--     perché con la conferma dell'email signUp non apre una sessione, ma
--     accettano solo un account appena creato (meno di un giorno), che non
--     appartiene ancora a nessun gruppo e, se c'è una sessione, è quello della
--     sessione;
--   - validate_invite: resta pubblica per costruzione (mostra il gruppo prima
--     della registrazione), rivela solo nome del gruppo e di chi invita a chi
--     ha già il codice.
--   Tutte e sei con search_path fisso.
--
-- Regola di convenzione (RG-11) resa vincolo: un utente, un gruppo.
-- Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Un utente, un gruppo
-- ---------------------------------------------------------------------------
create unique index if not exists users_group_user_id_key on public.users_group (user_id);

-- ---------------------------------------------------------------------------
-- OP-030 · policy
-- ---------------------------------------------------------------------------
drop policy if exists "Insert_users_group" on public.users_group;
drop policy if exists "allow_authenticated_select_on_users_group" on public.users_group;
drop policy if exists "Membri del proprio gruppo" on public.users_group;
create policy "Membri del proprio gruppo" on public.users_group
  for select to authenticated
  using (user_id = (select auth.uid()) or group_id = (select public.current_group_id()));

drop policy if exists "Insert_Group" on public.groups_account;
drop policy if exists "allow_authenticated_select_on_groups_account" on public.groups_account;
drop policy if exists "Il proprio gruppo" on public.groups_account;
create policy "Il proprio gruppo" on public.groups_account
  for select to authenticated
  using (id = (select public.current_group_id()));

-- ---------------------------------------------------------------------------
-- OP-030 · privilegi di tabella e di colonna
-- ---------------------------------------------------------------------------
revoke all on public.users_group    from anon, authenticated;
revoke all on public.groups_account from anon, authenticated;

-- Tutto tranne push_token, che il client scrive ma non rilegge mai.
grant select (id, user_id, group_id, first_name, last_name, created_at,
              notification_time, notifications_enabled, dark_mode, del_confirm,
              show_shared_expenses, show_personal_expenses, custom_period_active,
              custom_period_start_day, recurring_notifications_enabled, view_mode)
  on public.users_group to authenticated;

-- Niente id, user_id, group_id, created_at: il gruppo non si cambia da qui.
grant update (first_name, last_name, notification_time, push_token,
              notifications_enabled, dark_mode, del_confirm,
              show_shared_expenses, show_personal_expenses, custom_period_active,
              custom_period_start_day, recurring_notifications_enabled, view_mode)
  on public.users_group to authenticated;

-- Il nome del gruppo sì, l'amministratore no.
grant select on public.groups_account to authenticated;
grant update (group_name) on public.groups_account to authenticated;

-- ---------------------------------------------------------------------------
-- OP-031 · funzioni
-- ---------------------------------------------------------------------------

-- Controllo comune a registrazione e accettazione dell'invito.
create or replace function public.can_join_group(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return 'Utente non indicato';
  end if;
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return 'Non puoi registrare un altro utente';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.created_at > now() - interval '1 day'
  ) then
    return 'Registrazione non valida o scaduta';
  end if;
  if exists (select 1 from public.users_group where user_id = p_user_id) then
    return 'Questo account fa già parte di un gruppo';
  end if;
  return null;
end;
$$;
revoke execute on function public.can_join_group(uuid) from public, anon, authenticated;

create or replace function public.register_user_with_group(
  p_user_id uuid,
  p_group_name character varying,
  p_first_name character varying,
  p_last_name character varying default null::character varying)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id bigint;
  v_err text;
begin
  v_err := public.can_join_group(p_user_id);
  if v_err is not null then
    return json_build_object('success', false, 'error', v_err);
  end if;

  insert into public.groups_account (group_name, admin)
  values (p_group_name, p_user_id)
  returning id into v_group_id;

  insert into public.users_group (user_id, group_id, first_name, last_name)
  values (p_user_id, v_group_id, p_first_name, p_last_name);

  return json_build_object('success', true, 'group_id', v_group_id);
exception
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.accept_invite(
  p_invite_code text,
  p_user_id uuid,
  p_first_name text,
  p_last_name text default null::text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_err text;
begin
  v_err := public.can_join_group(p_user_id);
  if v_err is not null then
    return json_build_object('success', false, 'error', v_err);
  end if;

  select * into v_invite from public.invites where invite_code = p_invite_code;

  if not found then
    return json_build_object('success', false, 'error', 'Codice invito non valido');
  end if;

  if v_invite.status != 'pending' then
    return json_build_object('success', false, 'error', 'Questo invito è già stato utilizzato o è scaduto');
  end if;

  if v_invite.expires_at < now() then
    update public.invites set status = 'expired', updated_at = now() where id = v_invite.id;
    return json_build_object('success', false, 'error', 'Questo invito è scaduto');
  end if;

  insert into public.users_group (user_id, group_id, first_name, last_name)
  values (p_user_id, v_invite.group_id, p_first_name, p_last_name);

  update public.invites
     set status = 'accepted', accepted_by = p_user_id, accepted_at = now(), updated_at = now()
   where id = v_invite.id;

  return json_build_object(
    'success', true,
    'group_id', v_invite.group_id,
    'message', 'Invito accettato con successo'
  );
end;
$$;

create or replace function public.create_invite(
  p_group_id bigint,
  p_invited_by uuid,
  p_invited_email text default null::text,
  p_expires_in_days integer default 7)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_expires_at timestamp with time zone;
  v_invite_id bigint;
  v_max_attempts integer := 10;
  v_attempt integer := 0;
begin
  if auth.uid() is null or p_invited_by is distinct from auth.uid() then
    return json_build_object('success', false, 'error', 'Non hai i permessi per creare questo invito');
  end if;

  if not exists (
    select 1 from public.users_group
    where user_id = p_invited_by and group_id = p_group_id
  ) then
    return json_build_object('success', false, 'error', 'Non sei membro di questo gruppo');
  end if;

  loop
    v_invite_code := public.generate_invite_code();
    v_attempt := v_attempt + 1;
    if not exists (select 1 from public.invites where invite_code = v_invite_code) then
      exit;
    end if;
    if v_attempt >= v_max_attempts then
      return json_build_object('success', false, 'error', 'Impossibile generare codice invito univoco');
    end if;
  end loop;

  v_expires_at := now() + (p_expires_in_days || ' days')::interval;

  insert into public.invites (group_id, invited_by, invite_code, invited_email, expires_at)
  values (p_group_id, p_invited_by, v_invite_code, p_invited_email, v_expires_at)
  returning id into v_invite_id;

  return json_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'invite_code', v_invite_code,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.cancel_invite(p_invite_code text, p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    return json_build_object('success', false, 'error', 'Non hai i permessi per cancellare questo invito');
  end if;

  select * into v_invite from public.invites where invite_code = p_invite_code;

  if not found then
    return json_build_object('success', false, 'error', 'Invito non trovato');
  end if;

  if v_invite.invited_by != p_user_id and not exists (
    select 1 from public.groups_account
    where id = v_invite.group_id and admin = p_user_id
  ) then
    return json_build_object('success', false, 'error', 'Non hai i permessi per cancellare questo invito');
  end if;

  update public.invites set status = 'cancelled', updated_at = now() where id = v_invite.id;

  return json_build_object('success', true, 'message', 'Invito cancellato con successo');
end;
$$;

alter function public.validate_invite(text) set search_path = public;
alter function public.notify_new_expense() set search_path = public;

-- Privilegi: per chiudere una funzione servono entrambe le revoche, a PUBLIC e
-- ai ruoli per nome (STATO.md §3, «La correzione dei privilegi del 19/09»).
revoke execute on function public.notify_new_expense() from public, anon, authenticated;

revoke execute on function public.create_invite(bigint, uuid, text, integer) from public, anon, authenticated;
grant  execute on function public.create_invite(bigint, uuid, text, integer) to authenticated;

revoke execute on function public.cancel_invite(text, uuid) from public, anon, authenticated;
grant  execute on function public.cancel_invite(text, uuid) to authenticated;

revoke execute on function public.register_user_with_group(uuid, character varying, character varying, character varying) from public, anon, authenticated;
grant  execute on function public.register_user_with_group(uuid, character varying, character varying, character varying) to anon, authenticated;

revoke execute on function public.accept_invite(text, uuid, text, text) from public, anon, authenticated;
grant  execute on function public.accept_invite(text, uuid, text, text) to anon, authenticated;

revoke execute on function public.validate_invite(text) from public, anon, authenticated;
grant  execute on function public.validate_invite(text) to anon, authenticated;
