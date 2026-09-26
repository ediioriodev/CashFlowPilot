# Baseline del database — fotografia del 19/09/2026

> Esito dei controlli preventivi di **`PRE-RILASCIO.md`**, eseguiti via MCP in sola lettura
> il **19/09/2026** sul progetto `rxpbqwvnmaxjzlobgebc` (Cash Flow Pilot).
>
> **Questo file è l'unica copia delle policy RLS attive.** Non sono nel repository: vivono solo
> sul database. Se qualcuno le cambia dalla dashboard, questa fotografia diventa obsoleta senza
> che niente lo segnali — rieseguire il controllo B e aggiornare qui.

Serve a due cose: conciliare le policy nuove con quelle esistenti, e fare da **termine di
confronto dopo il deploy** (il delta degli advisor, non il loro valore assoluto).

---

## Identità del progetto (Passo 0)

| Cosa | Valore |
|---|---|
| Project ref | `rxpbqwvnmaxjzlobgebc` |
| API URL | `https://rxpbqwvnmaxjzlobgebc.supabase.co` |
| Coincide con `.env.local` | ✅ sì (`NEXT_PUBLIC_SUPABASE_URL`) |
| Database · versione | `postgres` · PostgreSQL 17.6 (aarch64) |
| Ruolo dell'MCP | `supabase_read_only_user` — **sola lettura** |
| Tabelle estranee (`ocrd`, `oitm`, `commesse`…) | ✅ assenti: **non** è Tefin Marine Hub |

Le dieci tabelle di `public`, tutte con RLS attiva (`relforcerowsecurity = false` su tutte):

| Tabella | Righe |
|---|---|
| `spese_personali` | 1.881 |
| `spese` | 951 |
| `notification_logs` | 338 |
| `ambito_spese_personali` | 17 |
| `reminders` | 11 |
| `users_group` | 10 |
| `groups_account` | 8 |
| `ambito_spese` | 8 |
| `invites` | 6 |
| `tipo_spesa` | 2 |

---

## Le policy RLS attive (controllo B)

### `spese`

| Azione | Policy | Ruoli | Condizione |
|---|---|---|---|
| SELECT | Gli utenti possono vedere solo le spese del proprio gruppo | `authenticated` | `group_id = (select group_id from users_group where user_id = auth.uid())` |
| INSERT | Gli utenti possono inserire le proprie spese | `public` | `auth.uid() = user_id` |
| UPDATE | Gli utenti possono aggiornare le proprie spese | `authenticated` | `exists (select 1 from users_group ug where ug.user_id = auth.uid() and ug.group_id = spese.group_id)` |
| DELETE | Gli utenti possono eliminare le proprie spese | `public` | `auth.uid() = user_id` |

Da notare, perché conta per le migrazioni:

- la SELECT usa una **sottoquery scalare senza `limit 1`**. È la stessa assunzione di
  `current_group_id()`, ma più fragile: con due gruppi per utente non restituirebbe un gruppo a
  caso — andrebbe in errore *«more than one row returned by a subquery»*. Il controllo A dice che
  oggi non succede;
- SELECT e UPDATE esprimono la stessa regola in due forme diverse (sottoquery scalare vs `exists`).
  Sotto «un utente, un gruppo» sono equivalenti;
- la DELETE è più restrittiva della UPDATE: si cancella solo ciò che si è inserito, mentre si
  modifica tutto il gruppo. L'app usa la cancellazione logica (`deleted_at` via UPDATE), quindi
  la asimmetria non si vede.

### `spese_personali`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | `spese_personali_select_own` | `(select auth.uid()) = user_id` |
| INSERT | `spese_personali_insert_own` | `(select auth.uid()) = user_id` |
| UPDATE | `spese_personali_update_own` | `(select auth.uid()) = user_id` |
| DELETE | — | **nessuna policy**: la cancellazione fisica è negata a tutti |

### `users_group`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | `Insert_users_group` | `true` |
| SELECT | `allow_authenticated_select_on_users_group` | `true` |
| UPDATE | `Update record personale` | `(select auth.uid()) = user_id` |

🚩 **Due policy SELECT a `true`**: ogni utente autenticato legge l'intera tabella, compresi i
`push_token` e le preferenze di tutti. La prima ha anche un nome fuorviante (si chiama
`Insert_…` ma è una SELECT). Vedi OP-030.

### `groups_account`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | `Insert_Group` | `true` |
| SELECT | `allow_authenticated_select_on_groups_account` | `true` |
| UPDATE | `Update gruppo proprio` | `id = (select group_id from users_group where user_id = auth.uid())` |

🚩 Stessa situazione: due SELECT a `true`, di cui una mal chiamata. Vedi OP-030.

### `ambito_spese`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | `select autenticati` | `true` |
| INSERT | `insert autenticati` | `true` |

Le categorie condivise non sono ristrette per gruppo, né in lettura né in inserimento —
nonostante la tabella abbia una FK `group_id`. UPDATE e DELETE non hanno policy.

### `ambito_spese_personali`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | `ambito_spese_personali_select_own` | `(select auth.uid()) = user_id` |
| INSERT | `ambito_spese_personali_insert_own` | `(select auth.uid()) = user_id` |

UPDATE e DELETE non hanno policy.

### `reminders`

| Azione | Policy | Condizione |
|---|---|---|
| SELECT | Users can view own and group reminders | `auth.uid() = user_id or (group_id is not null and is_personal = false and group_id in (select ug.group_id from users_group ug where ug.user_id = auth.uid()))` |
| INSERT | Users can insert own reminders | `auth.uid() = user_id` |
| UPDATE | Users can update own reminders | `auth.uid() = user_id` |
| DELETE | Users can delete own reminders | `auth.uid() = user_id` |

È l'unica tabella che usa la forma `group_id in (select …)`: regge anche se un giorno la
convenzione «un utente, un gruppo» cadesse. Le policy sono assegnate al ruolo `public` invece
che `authenticated`, ma `auth.uid()` è nullo per l'anonimo e quindi non passa nulla.

### Conclusione del controllo B

Le policy esistenti legano l'utente al gruppo **attraverso `users_group`, con la stessa
convenzione che `current_group_id()` incorpora**. Le tabelle nuove e quelle vecchie applicheranno
la stessa regola sugli stessi dati: nessuna conciliazione da fare prima del deploy.

Resta la verifica che nessuna lettura sfugga, dimostrabile solo a schermo — la prova con **due
utenti di gruppi diversi**, che è OP-021 e va fatta dopo il deploy.

---

## Schema (controllo C)

Tutti i tipi coincidono con `DB_Table_schema.sql`.

| Verifica | Esito |
|---|---|
| `groups_account.id` `bigint` · `admin` `uuid` | ✅ |
| `users_group.user_id` `uuid` · `group_id` `bigint` | ✅ |
| `spese`: `ambito`, `importo`, `confermata`, `data_spesa`, `deleted_at`, `is_recurring_parent`, `tipo_transazione`, `tipo_spesa`, `paid_by uuid` | ✅ tutte presenti |
| `spese_personali`: le stesse meno `paid_by` e `group_id` | ✅ |

`receipt_path` non esiste ancora su nessuna delle due: la aggiunge il blocco 04, come previsto.

## `paid_by` (controllo D)

| Cosa | Valore |
|---|---|
| Spese a fondo comune (`paid_by is null`) | 883 |
| Anticipi (`paid_by not null`) | 0 |
| Totale spese non cancellate | 883 |
| Indice `spese_paid_by_idx` | ✅ presente |

Coerente con l'atteso: tutte le spese sono anteriori all'introduzione della colonna. Non va
corretto in blocco (OP-028).

## Tabelle e funzioni nuove (controlli E ed F)

`budgets`, `goals`, `goal_contributions`, `expense_splits`, `settlements` → **assenti**.

`current_group_id`, `is_group_admin`, `touch_updated_at`, `get_budget_status`, `set_budget`,
`clear_budget`, `get_settlement`, `get_settlement_totals`, `run_auto_contributions`,
`check_splits_sum` → **assenti**.

Nessun `drop function` preventivo da fare, nessuna migrazione applicata a metà.

## Funzioni di lettura (controllo G)

**L'incognita è risolta: anche `get_spese_personali` usa `to_jsonb(s)`.**

```sql
CREATE OR REPLACE FUNCTION public.get_spese_personali(p_data_da date, p_data_a date, p_user_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE
AS $function$
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.data_spesa DESC), '[]'::jsonb)
  FROM public.spese_personali s
  WHERE s.deleted_at IS NULL
    AND s.data_spesa BETWEEN p_data_da AND p_data_a
    AND s.user_id = p_user_id;
$function$
```

`get_spese_condivise` è identica sulla tabella `spese`, filtrando per `p_group_id`.

Conseguenze: `receipt_path` arriverà al frontend **su entrambe le tabelle** appena la colonna
esiste, senza toccare le funzioni. La graffetta comparirà anche sulle spese personali (chiude
OP-023). Entrambe sono `SECURITY INVOKER`, quindi la RLS si applica a chi chiama — è ciò che il
collaudo post-deploy pretende.

Una sbavatura senza effetti: `get_spese_condivise` dichiara `p_group_id integer` mentre
`spese.group_id` è `bigint`. Il confronto passa per cast implicito.

## Storage (controllo H)

**Nessun bucket** in `storage.buckets` e **nessuna policy** su `storage.objects`.
Il blocco 04 crea `receipts` da zero: niente `public = true` preesistente da correggere.

## `pg_cron` (controllo I)

✅ **Installato**, versione **1.6.4**, schema `pg_catalog`. Esiste già un job che usa lo stesso
schema di chiamata che servirebbe a `run_auto_contributions()`:

| jobid | schedule | nome | attivo |
|---|---|---|---|
| 1 | `0 * * * *` | `send-pending-expenses-notifications` | ✅ |

Chiama la Edge Function via `extensions.http_post` leggendo URL e service key da
`current_setting('app.supabase_url')` / `current_setting('app.service_role_key')`. È il modello
da copiare per OP-022.

Edge Function attive: `send-reminders` (v10, `verify_jwt: false`),
`send-pending-expenses-notifications` (v9), `send-new-expense-notification` (v7),
`quick-worker` (v2).

## Baseline advisor (controllo J)

Da confrontare **solo come delta** dopo il deploy.

### Security — 4 avvisi, tutti `WARN`

| Avviso | Conteggio | Sostanza |
|---|---|---|
| `function_search_path_mutable` | 21 | `search_path` non fissato. Comprende le due funzioni di lettura. |
| `anon_security_definer_function_executable` | 6 | `accept_invite`, `cancel_invite`, `create_invite`, `notify_new_expense`, `register_user_with_group`, `validate_invite` invocabili da **`anon`** via `/rest/v1/rpc/…`. Vedi OP-031. |
| `authenticated_security_definer_function_executable` | 6 | le stesse sei, da `authenticated`. |
| `auth_leaked_password_protection` | 1 | controllo HaveIBeenPwned disattivato. |

### Performance

| Avviso | Livello | Conteggio |
|---|---|---|
| `auth_rls_initplan` | WARN | 12 — policy che rivalutano `auth.uid()` per riga (`spese` ×3, `reminders` ×4, `invites` ×3, `notification_logs`, `groups_account`) |
| `multiple_permissive_policies` | WARN | 2 — le SELECT doppie su `users_group` e `groups_account` |
| `unindexed_foreign_keys` | INFO | 13 — comprese `users_group.user_id` e `.group_id`, usate da ogni policy |
| `unused_index` | INFO | 6 — fra cui `spese_paid_by_idx`, mai usato perché nessuna spesa ha `paid_by` |

## Storico delle migrazioni (controllo K)

`list_migrations` → **vuoto**. Supabase non considera applicata nessuna migrazione, nemmeno
`20260101000250_paid_by` che sul database c'è. Conferma quanto previsto in
`DB-APPLICAZIONE.md`: lo storico è già disallineato e la scelta del metodo di deploy non può
appoggiarsi a esso.

---

## Il cancello: **verde**

| Controllo | Bloccante | Esito |
|---|---|---|
| 0 · MCP sul progetto giusto | 🔴 | ✅ `rxpbqwvnmaxjzlobgebc`, coincide con `.env.local` |
| A · Un utente, un gruppo | 🔴 | ✅ 10 utenti, 10 righe, nessun duplicato, nessun orfano |
| B · Policy RLS esistenti | 🔴 | ✅ lette, compatibili con `current_group_id()`, salvate qui |
| C · Tipi delle colonne | 🔴 | ✅ tutti conformi |
| E · Tabelle nuove assenti | 🔴 | ✅ zero righe |
| F · Funzioni assenti | 🔴 | ✅ zero righe |
| D · `paid_by` presente | 🟡 | ✅ colonna e indice presenti, 883 a fondo comune |
| G · Corpo di `get_spese_personali` | 🟡 | ✅ usa `to_jsonb`: nessun intervento |
| H · Bucket assente | 🟡 | ✅ nessun bucket |
| I · `pg_cron` | 🟢 | ✅ installato 1.6.4, con un job già attivo da cui copiare |
| J · Advisor | 🟢 | ✅ baseline registrata qui sopra |
| K · Migrazioni registrate | 🟢 | ✅ vuoto, come previsto |

**Nessun controllo rosso: il deploy può partire.** Due riserve che non fermano il cancello ma
vanno decise prima di scegliere il metodo:

1. **L'MCP è in sola lettura** (`supabase_read_only_user`). La strada *b* di
   `DB-APPLICAZIONE.md` — sei `apply_migration` — non è percorribile così com'è: va rimosso
   `--read-only` e il Passo 0 va rifatto subito prima. Senza quella modifica resta la strada
   *a*, manuale.
2. **Due letture troppo larghe** su `users_group` e `groups_account` (OP-030) e **sei funzioni
   `SECURITY DEFINER` aperte all'anonimo** (OP-031). Preesistenti, non introdotte dalle
   migrazioni nuove, ma ora sono a verbale.

---

# Delta post-deploy — 19/09/2026, sera

Le migrazioni sono state applicate. Questa è la parte per cui la baseline qui sopra esisteva:
il confronto. Interessa **solo ciò che è cambiato**, non il valore assoluto.

## Security

Misurato dopo il blocco 07 corretto, non previsto.

| Avviso | Prima | Dopo il deploy | Dopo il blocco 07 | Delta |
|---|---|---|---|---|
| `function_search_path_mutable` | 21 | 23 | **21** | **0** |
| `anon_security_definer_function_executable` | 6 | 9 | **6** | **0** |
| `authenticated_security_definer_…` | 6 | 9 | **8** | **+2** |
| `auth_leaked_password_protection` | 1 | 1 | **1** | 0 |

**Il delta non è zero: restano +2**, e sono voluti. Sono `current_group_id()` e
`is_group_admin()`, che restano eseguibili da `authenticated` perché **le policy RLS delle
tabelle nuove le chiamano**, e le espressioni delle policy girano con i privilegi di chi
interroga. Revocarle chiuderebbe l'avviso e insieme ogni lettura di `budgets`, `goals`,
`expense_splits` e `settlements`.

Sono innocue nel merito: si basano su `auth.uid()`, quindi un utente autenticato che le chiami
via RPC ottiene il proprio gruppo — che già conosce — oppure `false`. `is_group_admin` non
permette nemmeno di enumerare i gruppi altrui, perché per un gruppo di cui non si è
amministratori risponde `false` sia che esista sia che non esista.

**Questo +2 è la nuova linea di base**: da qui in avanti è il valore atteso, non un residuo da
smaltire. Un terzo avviso di questa famiglia, in futuro, sarà una regressione vera.

## La falla vera, e perché non si vedeva

`run_auto_contributions(date)` è `SECURITY DEFINER`, **non guarda `auth.uid()`** e scrive in
`goal_contributions` per tutti i gruppi. La protezione contro i doppioni è per mese, ma il mese
arriva dal parametro `p_today`: un chiamante anonimo poteva variarlo e infilare versamenti
automatici in mesi arbitrari, su obiettivi altrui, via `/rest/v1/rpc/run_auto_contributions`.

Le altre due — `current_group_id()` e `is_group_admin()` — erano esposte allo stesso modo ma
innocue: si basano su `auth.uid()`, che senza sessione è `NULL`, quindi restituivano `NULL` e
`false`.

## La lezione: `revoke ... from public` non protegge da `anon`

Vale la pena scriverla per esteso, perché ci si è cascati **due volte nello stesso giorno**.

Supabase ha un `alter default privileges` che assegna `execute` ad `anon`, `authenticated` e
`service_role` su **ogni** funzione creata in `public`. Sono grant **nominali**. Inoltre una
funzione nasce, per default Postgres, con `execute` concesso anche al pseudo-ruolo **`PUBLIC`**.

Sono due cose diverse e sovrapposte, e si leggono entrambe in `pg_proc.proacl`:

```
=X/postgres            ← PUBLIC: nessun nome davanti all'uguale
anon=X/postgres        ← grant nominale ad anon
authenticated=X/postgres
```

Da qui i due errori:

1. **Nelle migrazioni originali** (blocchi 00 e 02): `revoke all ... from public` toglie solo la
   prima riga. I grant nominali restano, e `anon` continua a poter chiamare.
2. **Nella prima stesura del blocco 07**: `revoke execute ... from anon, authenticated` toglie
   solo le righe nominali. Su `run_auto_contributions` restava `PUBLIC`, che concede a
   chiunque — quindi `has_function_privilege('anon', …)` restava `true` pur non essendoci più
   alcuna riga `anon=X`. Le altre due funzioni sembravano a posto solo perché il blocco 00 aveva
   già rimosso il loro `PUBLIC`.

**La regola**: per chiudere davvero una funzione servono entrambe le revoche —
`from public, anon, authenticated` — e poi si concede a chi deve. Il modo veloce di accorgersene
è guardare `proacl`: se c'è una voce che **inizia con `=X/`**, `PUBLIC` ha ancora accesso, per
quanti ruoli nominali si siano revocati.

```sql
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_puo,
       array_to_string(p.proacl, '  |  ')               as acl
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.proname;
```

## Stato finale dei privilegi

Verificato sul database dopo la riesecuzione del blocco 07. Nessuna delle cinque ha più una
voce `=X/` in `proacl`: `PUBLIC` è stato rimosso ovunque.

| Funzione | `anon` | `authenticated` | `service_role` | Perché |
|---|---|---|---|---|
| `current_group_id()` | ❌ | ✅ | ✅ | Chiamata dentro le policy RLS: le espressioni girano coi privilegi di chi interroga, toglierla ad `authenticated` bloccherebbe ogni lettura delle tabelle nuove. |
| `is_group_admin(bigint)` | ❌ | ✅ | ✅ | Idem, per le `delete` sui budget di gruppo. |
| `run_auto_contributions(date)` | ❌ | ❌ | ✅ | Non è un'operazione dell'utente: la invoca il job. Nessuna schermata la chiama. |
| `touch_updated_at()` | ❌ | ❌ | ✅ | Funzione di trigger. |
| `check_splits_sum()` | ❌ | ❌ | ✅ | Funzione di trigger. |

⚠️ **Sulle due funzioni di trigger**: revocare `execute` **non** impedisce ai trigger di
scattare. PostgreSQL verifica il privilegio sulla funzione al momento del `create trigger`, non
a ogni attivazione — è il motivo per cui togliere le funzioni di trigger dalla superficie
esposta da PostgREST è una pratica normale e non una mutilazione.

Resta l'unica affermazione di questo documento **non verificata sul database**, perché l'MCP è in
sola lettura e servirebbe una scrittura per provarla. Si conferma in un minuto al primo caso del
collaudo: creare una busta e **cambiarle il tetto** esercita `touch_updated_at`, salvare quote
non uguali esercita `check_splits_sum`. Se entrambe passano, il punto è chiuso.


---

# Delta 26/09/2026 — OP-030 e OP-031

Migrazione `supabase/migrations/20260101000900_group_privacy.sql`, applicata via MCP
(`apply_migration`, versione `group_privacy`). Prova: `VERIFICA_group_privacy.sql`.

## Cosa c'era davvero

Rilette sul database prima di toccare niente, le due tabelle erano messe peggio di come le
descriveva il controllo B:

| Tabella | Policy | Problema |
|---|---|---|
| `users_group` | `Insert_users_group` (SELECT, `true`), `allow_authenticated_select_on_users_group` (SELECT, `true`) | Ogni autenticato leggeva tutte le righe, `push_token` compreso |
| `users_group` | `Update record personale` (`auth.uid() = user_id`) | Nessun limite di colonna: **un utente poteva riscrivere il proprio `group_id` ed entrare nel gruppo di un'altra famiglia**. Provato prima della correzione (annullato) |
| `groups_account` | `Insert_Group`, `allow_authenticated_select_on_groups_account` (SELECT, `true`) | Elenco di tutti i gruppi e dei loro amministratori |
| `groups_account` | `Update gruppo proprio` | Ogni membro poteva riscrivere `admin` |

E fra le funzioni `SECURITY DEFINER` aperte ad `anon`, tre credevano all'id passato dal client:
`register_user_with_group(p_user_id)` creava un gruppo e una riga `users_group` per un utente
qualsiasi (provato su un account di GruppoTest, annullato), `accept_invite(p_user_id)` aggiungeva
chiunque a un gruppo, `create_invite(p_invited_by)` e `cancel_invite(p_user_id)` si fidavano
dell'identità dichiarata. Non c'era nemmeno un vincolo di unicità su `users_group.user_id`.

## Cosa c'è ora

**Policy**

| Tabella | Policy | Condizione |
|---|---|---|
| `users_group` | `Membri del proprio gruppo` (SELECT, authenticated) | `user_id = auth.uid() or group_id = current_group_id()` |
| `users_group` | `Update record personale` | invariata |
| `groups_account` | `Il proprio gruppo` (SELECT, authenticated) | `id = current_group_id()` |
| `groups_account` | `Update gruppo proprio` | invariata |

**Privilegi di tabella e di colonna** — `anon`: nessuno. `authenticated`:

- `users_group`: SELECT su tutte le colonne **tranne `push_token`**; UPDATE solo su nome, cognome,
  impostazioni, `push_token` e `view_mode` — non su `id`, `user_id`, `group_id`, `created_at`.
  Il client scrive `push_token` ma non lo rilegge mai; le Edge Function lo leggono con `service_role`.
- `groups_account`: SELECT; UPDATE solo su `group_name`.

**Vincolo** — `users_group_user_id_key`, indice unico su `users_group.user_id`: RG-11
(«un utente, un gruppo») non è più solo una convenzione.

**Funzioni**

| Funzione | anon | authenticated | Controllo aggiunto |
|---|---|---|---|
| `notify_new_expense` | ✗ | ✗ | È un trigger: il permesso si controlla alla creazione del trigger, non a ogni scatto |
| `create_invite` | ✗ | ✓ | `p_invited_by = auth.uid()` |
| `cancel_invite` | ✗ | ✓ | `p_user_id = auth.uid()` |
| `register_user_with_group` | ✓ | ✓ | `can_join_group()` |
| `accept_invite` | ✓ | ✓ | `can_join_group()` |
| `validate_invite` | ✓ | ✓ | nessuno: mostra nome del gruppo e di chi invita a chi ha il codice |
| `can_join_group` (nuova) | ✗ | ✗ | usata dalle due sopra |

`can_join_group(p_user_id)` accetta solo un account creato da **meno di un giorno**, che **non
appartiene ancora a nessun gruppo** e, se c'è una sessione, è **quello della sessione**.
Registrazione e accettazione restano aperte ad `anon` perché con la conferma dell'email
`signUp` non apre una sessione. Tutte con `search_path = public`.

## Prove

`VERIFICA_group_privacy.sql`, prima e dopo. Prima: KO su lettura di tutti gli utenti (10) e
gruppi (8), `push_token`, cambio del proprio `group_id`, invito creato a nome di un altro,
registrazione di un utente già iscritto. Dopo: **21 su 21 ok**. Via REST dalla sessione di
GruppoTest: `users_group` → 2 righe, `groups_account` → 1, `push_token` → 403, PATCH di
`group_id` → 403; da anonimo: `users_group` → 401, `create_invite` → 401,
`register_user_with_group` su un iscritto → «Registrazione non valida o scaduta».
A schermo: Famiglia, Inviti (creato e annullato), cambio di modalità salvato, Profilo; console pulita.

## Nuova linea di base degli advisor security

| Avviso | 19/09 | 26/09 | Nota |
|---|---|---|---|
| `function_search_path_mutable` | 21 | 16 | Restano funzioni `SECURITY INVOKER`: debito minore |
| `anon_security_definer_function_executable` | 6 | 3 | `accept_invite`, `register_user_with_group`, `validate_invite`: volute |
| `authenticated_security_definer_function_executable` | 8 | 7 | Comprende `current_group_id` e `is_group_admin`, che le policy chiamano |
| `auth_leaked_password_protection` | 1 | 1 | Impostazione di Auth, non di schema |

Un avviso in più di queste famiglie, dopo un deploy, è una regressione.
