-- ==================================================================
-- CASH FLOW PILOT · MODULI NUOVI — PACCHETTO UNICO DA APPLICARE
--
-- Generato da supabase/migrations/. Contiene, NELL'ORDINE GIUSTO:
--
--   00  helpers          current_group_id(), is_group_admin(), touch_updated_at()
--   01  budgets          budget a buste + get_budget_status/set_budget/clear_budget
--   02  goals            obiettivi, versamenti, goals_progress, run_auto_contributions
--   03  paid_by          GIÀ APPLICATA il 16/09/2026 — qui è un no-op idempotente
--   04  splits_settlem.  quote per spesa, conguagli chiusi, get_settlement
--   05  receipts         bucket privato + colonne receipt_path
--   06  view_mode        users_group.view_mode: la modalità segue l'account
--   07  grants           revoca ad anon le funzioni di supporto + il job
--
-- COME SI APPLICA — una delle due, non tutte e due
--   a) SQL editor di Supabase: incolla QUESTO file intero, esegui una volta
--   b) Supabase CLI: `supabase db push`, che applica i SETTE file separati
--      di questa cartella (questo bundle non ha il prefisso timestamp,
--      quindi il CLI lo ignora: è pensato per il copia-incolla)
--
-- È idempotente: rieseguirlo non rompe niente e non duplica dati.
-- Le tabelle già esistenti non vengono toccate, tranne due ALTER TABLE
-- ADD COLUMN IF NOT EXISTS su `spese` e `spese_personali`.
--
-- L'ORDINE CONTA: budgets, goals e splits usano current_group_id() e
-- is_group_admin(), definite nel blocco 00. Applicarne uno da solo
-- senza il 00 fallisce.
--
-- DOPO L'APPLICAZIONE esegui VERIFICA_moduli_nuovi.sql (sole letture).
--
-- ✅  Le policy RLS già attive sono state lette dal database il
--     19/09/2026 e trascritte in design/RLS-BASELINE.md. Usano la
--     stessa convenzione "un utente appartiene a un solo gruppo" che
--     queste nuove assumono: niente da conciliare prima di applicare.
-- ==================================================================

begin;



-- ==================================================================
-- ▼ 20260101000000_helpers.sql
-- ==================================================================

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


-- ==================================================================
-- ▼ 20260101000100_budgets.sql
-- ==================================================================

-- =============================================================
-- 01 · BUDGET A BUSTE
-- Un tetto mensile per categoria, con storico: cambiare il tetto
-- non deve riscrivere il passato, quindi si versiona per periodo
-- (valido_da / valido_a) invece di aggiornare la riga in place.
-- =============================================================

create table if not exists public.budgets (
  id          bigint generated always as identity primary key,

  -- 'C' = gruppo, 'P' = personale. Stessa convenzione di spese.tipo_spesa.
  scope       char(1)      not null check (scope in ('C', 'P')),
  group_id    bigint       references public.groups_account(id) on delete cascade,
  user_id     uuid         references auth.users(id)            on delete cascade,

  categoria   text         not null,
  tetto       numeric(12,2) not null check (tetto > 0),

  -- periodo di validità del tetto; valido_a null = ancora in vigore
  valido_da   date         not null default date_trunc('month', current_date)::date,
  valido_a    date,

  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),

  constraint budgets_owner_coerente check (
    (scope = 'C' and group_id is not null and user_id is null) or
    (scope = 'P' and user_id  is not null and group_id is null)
  ),
  constraint budgets_periodo_valido check (valido_a is null or valido_a >= valido_da)
);

-- Un solo tetto attivo per categoria e portafoglio.
create unique index if not exists budgets_attivo_unico
  on public.budgets (scope, coalesce(group_id, 0), coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(categoria))
  where valido_a is null;

create index if not exists budgets_lookup
  on public.budgets (scope, group_id, user_id, valido_da desc);

drop trigger if exists budgets_touch on public.budgets;
create trigger budgets_touch before update on public.budgets
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.budgets enable row level security;

drop policy if exists budgets_select on public.budgets;
create policy budgets_select on public.budgets
  for select to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_insert on public.budgets;
create policy budgets_insert on public.budgets
  for insert to authenticated
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_update on public.budgets;
create policy budgets_update on public.budgets
  for update to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  )
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists budgets_delete on public.budgets;
create policy budgets_delete on public.budgets
  for delete to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id() and public.is_group_admin(group_id))
  );

-- ---------- Lettura: stato dei budget in un periodo ----------
-- Restituisce, per ogni categoria con un tetto attivo nel periodo:
-- il tetto, lo speso reale (confermato e già avvenuto) e lo speso
-- previsto (tutto il periodo). È la stessa distinzione reale/previsto
-- usata dal resto dell'app: vedi src/lib/finance.ts.
create or replace function public.get_budget_status(
  p_scope     char(1),
  p_group_id  bigint,
  p_user_id   uuid,
  p_start     date,
  p_end       date
)
returns table (
  categoria     text,
  tetto         numeric,
  speso_reale   numeric,
  speso_previsto numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with tetti as (
    select b.categoria, b.tetto
    from public.budgets b
    where b.scope = p_scope
      and (p_scope <> 'C' or b.group_id = p_group_id)
      and (p_scope <> 'P' or b.user_id  = p_user_id)
      and b.valido_da <= p_end
      and (b.valido_a is null or b.valido_a >= p_start)
  ),
  movimenti as (
    select s.ambito as categoria,
           s.importo,
           s.confermata,
           s.data_spesa
    from public.spese s
    where p_scope = 'C'
      and s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.data_spesa between p_start and p_end
    union all
    select sp.ambito, sp.importo, sp.confermata, sp.data_spesa
    from public.spese_personali sp
    where p_scope = 'P'
      and sp.user_id = p_user_id
      and sp.tipo_transazione = 'spesa'
      and sp.deleted_at is null
      and coalesce(sp.is_recurring_parent, false) = false
      and sp.data_spesa between p_start and p_end
  )
  select t.categoria,
         t.tetto,
         coalesce(sum(m.importo) filter (
           where m.confermata and m.data_spesa <= current_date
         ), 0) as speso_reale,
         coalesce(sum(m.importo), 0) as speso_previsto
  from tetti t
  left join movimenti m on lower(m.categoria) = lower(t.categoria)
  group by t.categoria, t.tetto
  order by t.tetto desc;
$$;

grant execute on function public.get_budget_status(char, bigint, uuid, date, date) to authenticated;

comment on table public.budgets is
  'Tetti di spesa per categoria, versionati per periodo. Il frontend legge lo stato con get_budget_status().';

-- ---------- Scrittura: versionare un tetto ----------
-- Cambiare un tetto è due operazioni (chiudi la versione in corso,
-- aprine una nuova) che devono riuscire o fallire insieme: in mezzo
-- l'indice unico parziale lascerebbe la categoria senza tetto attivo.
--
-- Regola di versionamento, per non ritrovarsi due versioni che
-- coprono lo stesso periodo (get_budget_status le restituirebbe
-- entrambe, e la stessa busta comparirebbe due volte):
--
--   versione attiva nata IN questo periodo  → si aggiorna in place
--   versione attiva nata PRIMA              → si chiude il giorno
--                                             prima dell'inizio del
--                                             periodo e se ne apre una
--                                             nuova che parte da lì
--
-- p_period_start è l'inizio del periodo corrente dell'app, che con i
-- periodi personalizzati non è il primo del mese.
create or replace function public.set_budget(
  p_scope        char(1),
  p_group_id     bigint,
  p_user_id      uuid,
  p_categoria    text,
  p_tetto        numeric,
  p_period_start date default date_trunc('month', current_date)::date
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attivo   public.budgets;
  v_id       bigint;
begin
  if p_tetto is null or p_tetto <= 0 then
    raise exception 'Il tetto deve essere maggiore di zero';
  end if;
  if length(btrim(coalesce(p_categoria, ''))) = 0 then
    raise exception 'La categoria è obbligatoria';
  end if;

  select * into v_attivo
  from public.budgets b
  where b.scope = p_scope
    and b.valido_a is null
    and lower(b.categoria) = lower(btrim(p_categoria))
    and (p_scope <> 'C' or b.group_id = p_group_id)
    and (p_scope <> 'P' or b.user_id  = p_user_id)
  limit 1;

  if found then
    -- nata in questo periodo: non ha mai governato un periodo chiuso
    if v_attivo.valido_da >= p_period_start then
      update public.budgets
         set tetto = p_tetto
       where id = v_attivo.id
      returning id into v_id;
      return v_id;
    end if;

    update public.budgets
       set valido_a = p_period_start - 1
     where id = v_attivo.id;
  end if;

  insert into public.budgets (scope, group_id, user_id, categoria, tetto, valido_da)
  values (
    p_scope,
    case when p_scope = 'C' then p_group_id end,
    case when p_scope = 'P' then p_user_id  end,
    btrim(p_categoria),
    p_tetto,
    p_period_start
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.set_budget(char, bigint, uuid, text, numeric, date) to authenticated;

-- ---------- Scrittura: togliere un tetto ----------
-- Mai DELETE: il tetto che valeva a settembre deve restare leggibile
-- guardando settembre. Si chiude e basta.
create or replace function public.clear_budget(
  p_scope        char(1),
  p_group_id     bigint,
  p_user_id      uuid,
  p_categoria    text,
  p_period_start date default date_trunc('month', current_date)::date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attivo public.budgets;
begin
  select * into v_attivo
  from public.budgets b
  where b.scope = p_scope
    and b.valido_a is null
    and lower(b.categoria) = lower(btrim(p_categoria))
    and (p_scope <> 'C' or b.group_id = p_group_id)
    and (p_scope <> 'P' or b.user_id  = p_user_id)
  limit 1;

  if not found then
    return;
  end if;

  -- mai esistito per un periodo chiuso: si può togliere del tutto
  if v_attivo.valido_da >= p_period_start then
    delete from public.budgets where id = v_attivo.id;
  else
    update public.budgets
       set valido_a = p_period_start - 1
     where id = v_attivo.id;
  end if;
end;
$$;

grant execute on function public.clear_budget(char, bigint, uuid, text, date) to authenticated;


-- ==================================================================
-- ▼ 20260101000200_goals.sql
-- ==================================================================

-- =============================================================
-- 02 · OBIETTIVI DI RISPARMIO (salvadanai)
-- Due tabelle: l'obiettivo e i versamenti. Il saldo non si tiene
-- in una colonna (si disallinea): si somma dai versamenti.
-- =============================================================

create table if not exists public.goals (
  id            bigint generated always as identity primary key,

  scope         char(1)       not null check (scope in ('C', 'P')),
  group_id      bigint        references public.groups_account(id) on delete cascade,
  user_id       uuid          references auth.users(id)            on delete cascade,

  nome          text          not null check (length(btrim(nome)) > 0),
  -- nome dell'icona lucide usata dal frontend (plane, shield, car, …)
  icona         text          not null default 'piggy-bank',
  target        numeric(12,2) not null check (target > 0),
  data_obiettivo date,

  -- accantonamento automatico: quanto e in che giorno del mese
  auto_importo  numeric(12,2) check (auto_importo is null or auto_importo > 0),
  auto_giorno   smallint      check (auto_giorno between 1 and 28),

  archiviato    boolean       not null default false,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),

  constraint goals_owner_coerente check (
    (scope = 'C' and group_id is not null and user_id is null) or
    (scope = 'P' and user_id  is not null and group_id is null)
  ),
  constraint goals_auto_completo check (
    (auto_importo is null and auto_giorno is null) or
    (auto_importo is not null and auto_giorno is not null)
  )
);

create index if not exists goals_lookup on public.goals (scope, group_id, user_id, archiviato);

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- ---------- Versamenti ----------
create table if not exists public.goal_contributions (
  id         bigint generated always as identity primary key,
  goal_id    bigint        not null references public.goals(id) on delete cascade,
  user_id    uuid          not null references auth.users(id),
  -- negativo = prelievo dal salvadanaio
  importo    numeric(12,2) not null check (importo <> 0),
  data       date          not null default current_date,
  nota       text,
  -- true se generato dall'accantonamento automatico
  automatico boolean       not null default false,
  created_at timestamptz   not null default now()
);

create index if not exists goal_contributions_goal on public.goal_contributions (goal_id, data desc);

-- ---------- RLS ----------
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

drop policy if exists goals_rw on public.goals;
create policy goals_rw on public.goals
  for all to authenticated
  using (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  )
  with check (
    (scope = 'P' and user_id = auth.uid()) or
    (scope = 'C' and group_id = public.current_group_id())
  );

drop policy if exists goal_contributions_rw on public.goal_contributions;
create policy goal_contributions_rw on public.goal_contributions
  for all to authenticated
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id
        and ((g.scope = 'P' and g.user_id = auth.uid())
          or (g.scope = 'C' and g.group_id = public.current_group_id()))
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.goals g
      where g.id = goal_id
        and ((g.scope = 'P' and g.user_id = auth.uid())
          or (g.scope = 'C' and g.group_id = public.current_group_id()))
    )
  );

-- ---------- Lettura: obiettivi con progresso ----------
create or replace view public.goals_progress
with (security_invoker = true) as
select
  g.*,
  coalesce(c.accantonato, 0)                                   as accantonato,
  greatest(g.target - coalesce(c.accantonato, 0), 0)           as mancante,
  least(round(coalesce(c.accantonato, 0) / g.target * 100), 100) as percentuale,
  c.ultimo_versamento,
  -- mesi stimati al traguardo con l'accantonamento automatico corrente
  case
    when g.auto_importo is null or g.auto_importo <= 0 then null
    else ceil(greatest(g.target - coalesce(c.accantonato, 0), 0) / g.auto_importo)
  end                                                           as mesi_stimati
from public.goals g
left join lateral (
  select sum(gc.importo) as accantonato, max(gc.data) as ultimo_versamento
  from public.goal_contributions gc
  where gc.goal_id = g.id
) c on true;

comment on view public.goals_progress is
  'Obiettivi con accantonato, mancante, percentuale e mesi stimati. Il saldo è sempre derivato dai versamenti.';

-- ---------- Accantonamento automatico ----------
-- Da richiamare una volta al giorno (pg_cron oppure la Edge Function
-- send-reminders già presente). Idempotente: non versa due volte lo
-- stesso mese sullo stesso obiettivo.
create or replace function public.run_auto_contributions(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
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
    and g.auto_giorno = extract(day from p_today)::smallint
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

comment on function public.run_auto_contributions(date) is
  'Esegue gli accantonamenti automatici del giorno. Idempotente per mese.';


-- ==================================================================
-- ▼ 20260101000250_paid_by.sql
-- ==================================================================

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


-- ==================================================================
-- ▼ 20260101000300_splits_settlements.sql
-- ==================================================================

-- =============================================================
-- 03 · CHI HA PAGATO, QUOTE PERSONALIZZATE E CONGUAGLI
--
-- Oggi il frontend (src/services/familyService.ts) calcola il
-- conguaglio da spese.user_id, che però è "chi ha inserito", non
-- "chi ha pagato", e assume sempre la divisione in parti uguali.
-- Questa migrazione separa le due cose e rende i conguagli chiudibili.
-- =============================================================

-- ---------- 3.1 Chi ha pagato davvero ----------
-- Già introdotta da 20260101000250_paid_by.sql, che è applicabile da sola.
-- Qui la ripetiamo in forma idempotente per chi parte da zero.
--   paid_by IS NULL = fondo comune (non entra nel conguaglio)
--   paid_by = uuid  = anticipo personale
alter table public.spese
  add column if not exists paid_by uuid references auth.users(id);

create index if not exists spese_paid_by_idx
  on public.spese (group_id, paid_by, data_spesa)
  where paid_by is not null;

-- ---------- 3.2 Quote personalizzate ----------
-- Se una spesa non ha righe in expense_splits vale la divisione in
-- parti uguali fra i membri del gruppo: nessuna migrazione dei dati.
create table if not exists public.expense_splits (
  id         bigint generated always as identity primary key,
  spesa_id   bigint        not null references public.spese(id) on delete cascade,
  user_id    uuid          not null references auth.users(id),
  quota      numeric(12,2) not null check (quota >= 0),
  created_at timestamptz   not null default now(),
  unique (spesa_id, user_id)
);

create index if not exists expense_splits_spesa on public.expense_splits (spesa_id);

-- La somma delle quote deve coincidere con l'importo della spesa.
create or replace function public.check_splits_sum()
returns trigger
language plpgsql
as $$
declare
  v_spesa_id bigint := coalesce(new.spesa_id, old.spesa_id);
  v_importo  numeric;
  v_somma    numeric;
begin
  select importo into v_importo from public.spese where id = v_spesa_id;
  select coalesce(sum(quota), 0) into v_somma from public.expense_splits where spesa_id = v_spesa_id;

  -- 0 righe = torna alla divisione in parti uguali: è uno stato valido.
  if v_somma > 0 and abs(v_somma - v_importo) > 0.01 then
    raise exception 'Le quote (%) non coincidono con l''importo della spesa (%)', v_somma, v_importo;
  end if;
  return null;
end;
$$;

drop trigger if exists expense_splits_sum on public.expense_splits;
create constraint trigger expense_splits_sum
  after insert or update or delete on public.expense_splits
  deferrable initially deferred
  for each row execute function public.check_splits_sum();

-- ---------- 3.3 Conguagli chiusi ----------
create table if not exists public.settlements (
  id           bigint generated always as identity primary key,
  group_id     bigint      not null references public.groups_account(id) on delete cascade,
  period_start date        not null,
  period_end   date        not null,
  -- fotografia dei trasferimenti al momento della chiusura:
  -- [{ "from": uuid, "to": uuid, "amount": 123.45 }, …]
  dettaglio    jsonb       not null,
  totale       numeric(12,2) not null default 0,
  closed_by    uuid        not null references auth.users(id),
  closed_at    timestamptz not null default now(),
  constraint settlements_periodo_valido check (period_end >= period_start),
  unique (group_id, period_start, period_end)
);

create index if not exists settlements_group on public.settlements (group_id, period_end desc);

-- ---------- RLS ----------
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

drop policy if exists expense_splits_rw on public.expense_splits;
create policy expense_splits_rw on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and s.group_id = public.current_group_id()
    )
  )
  with check (
    exists (
      select 1 from public.spese s
      where s.id = spesa_id and s.group_id = public.current_group_id()
    )
  );

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (group_id = public.current_group_id());

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (group_id = public.current_group_id() and closed_by = auth.uid());

-- Un conguaglio chiuso è un fatto storico: non si modifica.
-- Se serve correggerlo, lo elimina l'amministratore e si richiude.
drop policy if exists settlements_delete on public.settlements;
create policy settlements_delete on public.settlements
  for delete to authenticated
  using (group_id = public.current_group_id() and public.is_group_admin(group_id));

-- ---------- Lettura: conguaglio del periodo ----------
-- Regole, nell'ordine in cui contano:
--
--   1. FONDO COMUNE (paid_by IS NULL) → la spesa NON entra nel conguaglio.
--      È la semantica decisa con 20260101000250_paid_by.sql e già in
--      produzione: le spese anteriori al 16/09/2026 hanno tutte paid_by
--      NULL e non devono generare debiti retroattivi. Per questo qui NON
--      si fa coalesce(paid_by, user_id): user_id è "chi ha inserito", non
--      "chi ha pagato".
--   2. QUOTE: se la spesa ha righe in expense_splits valgono quelle,
--      altrimenti parti uguali fra i membri del gruppo.
--   3. CONGUAGLI CHIUSI: le spese che cadono in un periodo già chiuso
--      (public.settlements) restano fuori dal calcolo.
create or replace function public.get_settlement(
  p_group_id bigint,
  p_start    date,
  p_end      date
)
returns table (
  user_id  uuid,
  pagato   numeric,
  dovuto   numeric,
  saldo    numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with membri as (
    select ug.user_id
    from public.users_group ug
    where ug.group_id = p_group_id and ug.user_id is not null
  ),
  n_membri as (
    select greatest(count(*), 1) as n from membri
  ),
  -- solo gli ANTICIPI: il fondo comune è già di tutti
  anticipi as (
    select s.id, s.importo, s.paid_by as pagante
    from public.spese s
    where s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.confermata
      and s.paid_by is not null
      and s.data_spesa between p_start and p_end
      and s.data_spesa <= current_date
      and not exists (
        select 1 from public.settlements st
        where st.group_id = p_group_id
          and s.data_spesa between st.period_start and st.period_end
      )
  ),
  pagato as (
    select m.user_id, coalesce(sum(a.importo), 0) as tot
    from membri m
    left join anticipi a on a.pagante = m.user_id
    group by m.user_id
  ),
  dovuto as (
    select m.user_id,
           coalesce(sum(
             coalesce(
               (select es.quota
                  from public.expense_splits es
                 where es.spesa_id = a.id and es.user_id = m.user_id),
               case
                 when exists (select 1 from public.expense_splits es2 where es2.spesa_id = a.id)
                   then 0
                 else a.importo / (select n from n_membri)
               end
             )
           ), 0) as tot
    from membri m
    left join anticipi a on true
    group by m.user_id
  )
  select p.user_id,
         round(p.tot, 2)         as pagato,
         round(d.tot, 2)         as dovuto,
         round(p.tot - d.tot, 2) as saldo
  from pagato p
  join dovuto d using (user_id)
  order by 4 desc;
$$;

grant execute on function public.get_settlement(bigint, date, date) to authenticated;

comment on function public.get_settlement(bigint, date, date) is
  'Conguaglio del periodo: solo anticipi (paid_by non nullo), quote da expense_splits o parti uguali, esclusi i periodi già chiusi in settlements.';

-- ---------- Lettura: totali del periodo ----------
-- Serve alla pagina /famiglia per dire quanto è uscito in tutto, quanto
-- dal fondo comune e quanto è stato anticipato. Sono gli stessi filtri
-- di get_settlement, senza il calcolo delle quote.
create or replace function public.get_settlement_totals(
  p_group_id bigint,
  p_start    date,
  p_end      date
)
returns table (
  totale       numeric,
  fondo_comune numeric,
  anticipato   numeric,
  n_spese      integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with spese_periodo as (
    select s.importo, s.paid_by
    from public.spese s
    where s.group_id = p_group_id
      and s.tipo_transazione = 'spesa'
      and s.deleted_at is null
      and coalesce(s.is_recurring_parent, false) = false
      and s.confermata
      and s.data_spesa between p_start and p_end
      and s.data_spesa <= current_date
      and not exists (
        select 1 from public.settlements st
        where st.group_id = p_group_id
          and s.data_spesa between st.period_start and st.period_end
      )
  )
  select round(coalesce(sum(importo), 0), 2)                                          as totale,
         round(coalesce(sum(importo) filter (where paid_by is null), 0), 2)           as fondo_comune,
         round(coalesce(sum(importo) filter (where paid_by is not null), 0), 2)       as anticipato,
         count(*)::integer                                                            as n_spese
  from spese_periodo;
$$;

grant execute on function public.get_settlement_totals(bigint, date, date) to authenticated;


-- ==================================================================
-- ▼ 20260101000400_receipts.sql
-- ==================================================================

-- =============================================================
-- 04 · SCONTRINI
-- Un file per movimento, in Supabase Storage. Sul DB resta solo
-- il percorso: i binari non vanno in tabella.
--
-- Convenzione del percorso: <group_id|user_id>/<spesa_id>.<ext>
-- La prima cartella è ciò su cui si appoggiano le policy.
-- =============================================================

alter table public.spese
  add column if not exists receipt_path text;

alter table public.spese_personali
  add column if not exists receipt_path text;

comment on column public.spese.receipt_path is
  'Percorso nel bucket "receipts". Formato: <group_id>/<spesa_id>.<ext>';

-- ---------- Bucket privato ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Policy sugli oggetti ----------
-- Prima cartella = group_id del gruppo dell'utente, oppure il suo uuid
-- per le spese personali.
drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = public.current_group_id()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );


-- ==================================================================
-- ▼ 20260101000500_view_mode.sql
-- ==================================================================

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

-- ==================================================================
-- ▼ 20260101000600_grants.sql
-- ==================================================================

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

commit;

-- Fine. Ora esegui VERIFICA_moduli_nuovi.sql.
