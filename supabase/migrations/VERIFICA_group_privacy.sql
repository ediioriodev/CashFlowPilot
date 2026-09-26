-- =============================================================================
-- VERIFICA_group_privacy.sql — prova di OP-030 e OP-031
--
-- Un solo blocco DO che si fa passare, a turno, per un utente di GruppoTest
-- (authenticated) e per un visitatore senza accesso (anon), prova ogni lettura e
-- scrittura che la migrazione 900 deve impedire o permettere, e alla fine
-- ANNULLA TUTTO sollevando un'eccezione: il risultato è il testo dell'errore.
-- Nessuna riga resta scritta. Tocca solo utenti di GruppoTest (group_id 13) e
-- un utente fittizio creato e annullato nella stessa transazione.
--
-- Esito atteso dopo la migrazione 900: ogni voce «ok».
-- =============================================================================
do $$
declare
  v_edi  constant uuid := '4112e6c0-6714-4ffa-ab10-140c8a608461'; -- GruppoTest, admin
  v_manu constant uuid := 'a53ee617-aad1-43ca-adb1-5e44cc20b8b1'; -- GruppoTest, membro
  v_new  constant uuid := '00000000-0000-4000-8000-00000000c0de'; -- fittizio
  r jsonb := '{}'::jsonb;
  n int;
  j json;
  v_code text;
begin
  -- utente fittizio appena registrato, senza gruppo (annullato alla fine)
  insert into auth.users (id, aud, role, email, created_at, updated_at)
  values (v_new, 'authenticated', 'authenticated', 'verifica-op030@example.invalid', now(), now());

  -- ============ come Edi (authenticated) ============
  perform set_config('request.jwt.claims', json_build_object('sub', v_edi, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.users_group;
  r := r || jsonb_build_object('01 users_group visibili (atteso 2)', n, '01 esito', case when n = 2 then 'ok' else 'KO' end);

  select count(*) into n from public.groups_account;
  r := r || jsonb_build_object('02 groups_account visibili (atteso 1)', n, '02 esito', case when n = 1 then 'ok' else 'KO' end);

  begin
    perform push_token from public.users_group where user_id = v_edi;
    r := r || '{"03 push_token leggibile": "KO"}';
  exception when insufficient_privilege then
    r := r || '{"03 push_token leggibile": "ok (negato)"}';
  end;

  begin
    update public.users_group set group_id = 1 where user_id = v_edi;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('04 cambio del proprio group_id', case when n = 0 then 'ok (0 righe)' else 'KO' end);
  exception when insufficient_privilege then
    r := r || '{"04 cambio del proprio group_id": "ok (negato)"}';
  end;

  begin
    update public.groups_account set admin = v_edi where id = 13;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('05 riscrittura di admin', case when n = 0 then 'ok (0 righe)' else 'KO' end);
  exception when insufficient_privilege then
    r := r || '{"05 riscrittura di admin": "ok (negato)"}';
  end;

  begin
    -- valori letterali, come fa l'app: «push_token = push_token» leggerebbe la colonna
    update public.users_group set dark_mode = true, push_token = '{"endpoint":"verifica"}', view_mode = 'advanced' where user_id = v_edi;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('06 aggiornare le proprie impostazioni', case when n = 1 then 'ok' else 'KO' end);
  exception when others then
    r := r || jsonb_build_object('06 aggiornare le proprie impostazioni', 'KO: ' || sqlerrm);
  end;

  begin
    update public.groups_account set group_name = group_name where id = 13;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('07 rinominare il proprio gruppo', case when n = 1 then 'ok' else 'KO' end);
  exception when others then
    r := r || jsonb_build_object('07 rinominare il proprio gruppo', 'KO: ' || sqlerrm);
  end;

  j := public.create_invite(13, v_manu, null, 7);
  r := r || jsonb_build_object('08 create_invite a nome di un altro', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);

  j := public.create_invite(13, v_edi, null, 7);
  v_code := j->>'invite_code';
  r := r || jsonb_build_object('09 create_invite a proprio nome', case when (j->>'success')::boolean then 'ok' else 'KO: ' || coalesce(j->>'error', '') end);

  j := public.cancel_invite(v_code, v_manu);
  r := r || jsonb_build_object('10 cancel_invite a nome di un altro', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);

  select count(*) into n from public.spese where group_id = 13;
  r := r || jsonb_build_object('11 le spese del proprio gruppo si leggono ancora', case when n > 0 then 'ok' else 'KO' end);

  select count(*) into n from public.invites where invite_code = v_code;
  r := r || jsonb_build_object('12 gli inviti del proprio gruppo si leggono ancora', case when n = 1 then 'ok' else 'KO' end);

  reset role;

  -- ============ come visitatore senza accesso (anon) ============
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;

  begin
    select count(*) into n from public.users_group;
    r := r || jsonb_build_object('13 anon legge users_group', case when n = 0 then 'ok (0 righe)' else 'KO' end);
  exception when insufficient_privilege then
    r := r || '{"13 anon legge users_group": "ok (negato)"}';
  end;

  begin
    j := public.create_invite(13, v_edi, null, 7);
    r := r || jsonb_build_object('14 anon crea un invito', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);
  exception when insufficient_privilege then
    r := r || '{"14 anon crea un invito": "ok (negato)"}';
  end;

  begin
    j := public.register_user_with_group(v_manu, 'Gruppo intruso', 'X', null);
    r := r || jsonb_build_object('15 anon registra un utente già iscritto', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);
  exception when insufficient_privilege then
    r := r || '{"15 anon registra un utente già iscritto": "ok (negato)"}';
  end;

  begin
    j := public.accept_invite(v_code, v_manu, 'X', null);
    r := r || jsonb_build_object('16 anon fa accettare un invito a un utente già iscritto', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);
  exception when insufficient_privilege then
    r := r || '{"16 anon fa accettare un invito a un utente già iscritto": "ok (negato)"}';
  end;

  j := public.validate_invite(v_code);
  r := r || jsonb_build_object('17 anon valida un codice (serve alla registrazione)', case when (j->>'valid')::boolean then 'ok' else 'KO' end);

  j := public.accept_invite(v_code, v_new, 'Nuovo', 'Utente');
  r := r || jsonb_build_object('18 anon: utente appena registrato accetta l''invito', case when (j->>'success')::boolean then 'ok' else 'KO: ' || coalesce(j->>'error', '') end);

  j := public.register_user_with_group(v_new, 'Secondo gruppo', 'Nuovo', null);
  r := r || jsonb_build_object('19 lo stesso utente non entra in un secondo gruppo', case when (j->>'success')::boolean then 'KO' else 'ok (rifiutato)' end);

  reset role;

  -- ============ privilegi ============
  r := r || jsonb_build_object(
    '20 notify_new_expense chiusa ad anon e authenticated',
    case when not has_function_privilege('anon', 'public.notify_new_expense()', 'execute')
          and not has_function_privilege('authenticated', 'public.notify_new_expense()', 'execute')
         then 'ok' else 'KO' end,
    '21 create_invite e cancel_invite chiuse ad anon',
    case when not has_function_privilege('anon', 'public.create_invite(bigint, uuid, text, integer)', 'execute')
          and not has_function_privilege('anon', 'public.cancel_invite(text, uuid)', 'execute')
         then 'ok' else 'KO' end);

  raise exception 'ESITO (tutto annullato): %', jsonb_pretty(r);
end;
$$;
