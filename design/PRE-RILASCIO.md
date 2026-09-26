# Controlli preventivi sul database — da fare PRIMA del rilascio

> ## ✅ Eseguiti il 19/09/2026 — cancello **verde**
>
> Tutti i controlli, dal Passo 0 alla K, sono stati eseguiti via MCP in sola lettura.
> **Nessun bloccante rosso: il deploy può partire.**
> Gli esiti, le policy RLS lette e la baseline degli advisor sono in **[`RLS-BASELINE.md`](RLS-BASELINE.md)**.
>
> Due riserve non bloccanti emerse dai controlli: l'MCP è in **sola lettura** (condiziona il
> metodo di deploy, vedi sotto) e restano due letture RLS troppo larghe più sei funzioni
> `SECURITY DEFINER` aperte all'anonimo — preesistenti, ora a verbale come OP-030 e OP-031.
>
> Questo documento resta la **procedura**: va rieseguito prima di ogni nuovo passaggio sul
> database, e comunque subito prima del deploy se si sblocca l'MCP in scrittura.

Ordine: **1) questi controlli → 2) deploy → 3) test**. Se un controllo è rosso, il deploy non parte: si sistema prima.

Servono a una cosa sola: **verificare che il database reale sia quello che il codice dà per scontato**. Le migrazioni sono scritte contro un'idea dello schema; questi controlli confermano che quell'idea corrisponda alla realtà, prima di scriverci sopra.

Sono **tutti in sola lettura**. Nessuno di questi passi modifica niente.

---

## Perché esiste questo documento

Due cose concrete, non ipotesi. **Entrambe risolte il 19/09/2026**, ma il documento resta:
sono le ragioni per cui i controlli vanno rifatti e non dati per buoni.

1. ~~**L'MCP di questo PC punta al progetto sbagliato.**~~ L'unico server Supabase configurato (scope globale, `~/.claude.json`) puntava a `--project-ref iemhpcqivihfgvbggvso`, cioè **Tefin Marine Hub**, il gestionale aziendale: da questa cartella un `apply_migration` distratto atterrava su un database di produzione che non c'entra niente con CashFlowPilot.
   **Oggi non è più così**: l'MCP `supabase-cloud` risponde su `rxpbqwvnmaxjzlobgebc`, che coincide con `.env.local` (OP-019 chiuso). Resta da verificare **a ogni sessione**, perché è una configurazione di macchina e non del repository — è esattamente ciò che fa il Passo 0.
2. ~~**Le policy RLS attive non sono nel repository.**~~ Vivevano solo sul database. Le migrazioni nuove assumono la convenzione «un utente appartiene a un solo gruppo»: se quella reale fosse diversa, non fallirebbe niente all'applicazione — semplicemente qualcuno vedrebbe righe che non dovrebbe, e lo si scoprirebbe mesi dopo.
   **Ora sono trascritte in [`RLS-BASELINE.md`](RLS-BASELINE.md)** e la convenzione è confermata (OP-018 chiuso). La copia sul database resta però l'originale: se cambia dalla dashboard, il file non se ne accorge.

---

## Passo 0 · L'MCP punta al progetto giusto?

**Nessun altro controllo ha senso se questo è rosso.**

> **Stato al 19/09/2026: ✅ verde, per la strada *b* qui sotto.**
> Esiste `.mcp.json` nella radice del progetto, con server `supabase-cloud`,
> `--project-ref rxpbqwvnmaxjzlobgebc` e `--read-only`. Oscura quello globale solo dentro questa
> cartella, come previsto. Il file **non è versionato** (`.gitignore` riga 52): su un altro PC va
> ricreato, ed è il motivo per cui questo passo va rifatto a ogni sessione.
> Il token `SUPABASE_ACCESS_TOKEN` arriva dall'ambiente, non dal file.

| Verifica | Come | Atteso |
|---|---|---|
| URL del progetto | MCP `get_project_url` | Deve coincidere con `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` |
| Le tabelle sono quelle giuste | MCP `list_tables` schema `public` | Devi vedere `spese`, `spese_personali`, `users_group`, `groups_account`, `ambito_spese`, `reminders` |

🚨 **Se compaiono `ocrd`, `oitm`, `commesse`, `consuntivatore`, `tsh1` sei su Tefin Marine Hub. Fermati.**
È la tripwire più utile che abbiamo: quelle tabelle non esistono in CashFlowPilot e si riconoscono a colpo d'occhio.

### Se l'MCP è quello sbagliato, due strade

**a) Da un altro PC** che ha già l'MCP di CashFlowPilot: è la strada senza configurazione.

**b) Configurare qui un MCP di progetto.** Va creato `.mcp.json` nella cartella del progetto **con lo stesso nome** `supabase-cloud`: a parità di nome lo scope `project` ha precedenza su quello globale e lo **oscura** dentro questa sola directory, lasciandolo intatto per tutti gli altri progetti. Con un nome diverso convivrebbero entrambi — e il database aziendale resterebbe raggiungibile da qui, che è esattamente ciò che vogliamo evitare.

```json
{
  "mcpServers": {
    "supabase-cloud": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@supabase/mcp-server-supabase@0.12.0",
               "--project-ref", "<ref-di-cashflowpilot>",
               "--read-only"],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}" }
    }
  }
}
```

Note pratiche:
- il **project-ref non è un segreto** (sta nell'URL pubblico), il **token sì**: va tenuto fuori dal file, che è pensato per essere versionato;
- `--read-only` è quello che serve per questi controlli. Per il deploy via MCP va tolto — decisione consapevole, non un dettaglio;
- i server MCP si allacciano all'avvio: dopo aver creato il file **serve riavviare Claude Code** nella cartella, e al primo avvio c'è un'approvazione una tantum;
- `.gitignore` non copre `.mcp.json` per default: qui è stato aggiunto (riga 52), quindi il file resta locale e va ricreato su ogni macchina.

**Stato: fatta la strada b.** Resta aperto solo il `--read-only`, da rimuovere se si sceglie il deploy via MCP — vedi la nota nel «cancello» e in `DB-APPLICAZIONE.md`.

---

## I controlli

Tutti da eseguire con MCP `execute_sql`, salvo dove indicato. Segna l'esito: serve come baseline per il confronto dopo il deploy.

### A · La convenzione «un utente, un gruppo» regge?

È l'assunzione che `current_group_id()` incorpora con un `limit 1`. Se cade, quella funzione restituisce **un gruppo a caso fra i suoi** e tutte le policy nuove diventano imprevedibili.

```sql
select user_id, count(*) as gruppi
from public.users_group
where user_id is not null
group by user_id
having count(*) > 1;
```

**Atteso: zero righe.** Se ne esce anche una sola, `current_group_id()` va ripensata prima di applicare qualsiasi cosa.

```sql
-- utenti senza gruppo: devono vedere NIENTE, non TUTTO
select count(*) as utenti_senza_gruppo
from auth.users u
where not exists (select 1 from public.users_group g where g.user_id = u.id);
```

### B · Le policy RLS esistenti — **il controllo che vale di più**

```sql
select tablename, policyname, cmd, permissive, roles,
       qual        as condizione_lettura,
       with_check  as condizione_scrittura
from pg_policies
where schemaname = 'public'
  and tablename in ('spese','spese_personali','users_group','groups_account',
                    'ambito_spese','ambito_spese_personali','reminders')
order by tablename, policyname;
```

```sql
-- e RLS è davvero attiva su quelle tabelle?
select relname as tabella, relrowsecurity as rls_attiva, relforcerowsecurity as forzata
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('spese','spese_personali','users_group','groups_account','ambito_spese')
order by relname;
```

**Cosa guardare**: come fanno queste policy a legare l'utente al gruppo. Se usano una sottoquery su `users_group` con una logica diversa da `current_group_id()`, le tabelle nuove e quelle vecchie applicheranno due regole diverse sugli stessi dati. Da leggere davvero, non da spuntare.

**Salva l'output.** È l'unica copia che esiste di queste policy: il repository non le contiene.

### C · Lo schema è quello che il codice assume?

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('spese','spese_personali','users_group','groups_account')
order by table_name, ordinal_position;
```

Atteso, come da `DB_Table_schema.sql`:

| Cosa | Atteso |
|---|---|
| `groups_account.id` | `bigint` · `admin` `uuid` |
| `users_group.user_id` | `uuid` · `group_id` `bigint` |
| `spese` | `ambito`, `importo`, `confermata`, `data_spesa`, `deleted_at`, `is_recurring_parent`, `tipo_transazione`, `tipo_spesa`, **`paid_by uuid`** |
| `spese_personali` | le stesse meno `paid_by` e `group_id` |

Se i tipi non coincidono (per esempio `group_id` `integer` invece di `bigint`) le foreign key delle tabelle nuove falliscono.

### D · `paid_by` è davvero applicata, e com'è messa?

```sql
select count(*) filter (where paid_by is null)     as fondo_comune,
       count(*) filter (where paid_by is not null) as anticipi,
       count(*)                                    as totale
from public.spese
where deleted_at is null and tipo_transazione = 'spesa';
```

**Atteso: quasi tutte a fondo comune**, perché le spese anteriori al 16/09/2026 hanno tutte `paid_by NULL`. È voluto e non va corretto in blocco.

```sql
select indexname from pg_indexes
where schemaname = 'public' and indexname = 'spese_paid_by_idx';
```

### E · Le tabelle nuove NON esistono già

```sql
select relname from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('budgets','goals','goal_contributions','expense_splits','settlements');
```

**Atteso: zero righe.** Se ne esce qualcuna, qualcuno ha già applicato una parte delle migrazioni: fermarsi e capire cosa c'è prima di rieseguire. Il pacchetto è idempotente, ma una tabella creata a mano con colonne diverse non lo è.

### F · Le funzioni non esistono già con un'altra firma

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as argomenti,
       pg_get_function_result(p.oid)             as ritorna
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('current_group_id','is_group_admin','touch_updated_at',
                    'get_budget_status','set_budget','clear_budget',
                    'get_settlement','get_settlement_totals',
                    'run_auto_contributions','check_splits_sum')
order by p.proname;
```

**Atteso: zero righe.** Conta perché `create or replace function` **non può cambiare il tipo di ritorno** di una funzione esistente: se una di queste c'è già con una firma diversa, la migrazione fallisce con *cannot change return type*. Si risolve con un `drop function` mirato prima — ma va saputo adesso, non a metà applicazione.

### G · Il corpo delle funzioni di lettura

```sql
select proname, pg_get_functiondef(oid) as definizione
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('get_spese_condivise','get_spese_personali');
```

**Cosa cercare: `to_jsonb(`.**

`get_spese_condivise` la usa, ed è il motivo per cui `paid_by` è arrivata al frontend senza toccare niente — e per cui `receipt_path` arriverà allo stesso modo.

Di `get_spese_personali` non si conosceva il corpo, perché non è nel repository. **Verificato il
19/09: usa `to_jsonb(s)` anche lei.** Quindi `receipt_path` arriverà al frontend su entrambe le
tabelle appena la colonna esiste, la graffetta comparirà anche sulle spese personali e non serve
aggiungere niente alla `select` (chiude OP-023). Il corpo è trascritto in
[`RLS-BASELINE.md`](RLS-BASELINE.md).

### H · Storage: il bucket non c'è già

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets;

select policyname, cmd, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

**Atteso: nessun bucket `receipts`.** Se esistesse già, verificare che sia `public = false`: un bucket pubblico rende ogni scontrino leggibile da chiunque abbia l'URL, e la migrazione con `on conflict do update` **non** corregge il flag `public`.

### I · `pg_cron` è disponibile?

MCP `list_extensions`, cercare `pg_cron` e la colonna *installed*.

Serve per pianificare `run_auto_contributions()` una volta al giorno. Se non c'è, il job va nella Edge Function `send-reminders` — verificabile con MCP `list_edge_functions`.

Non è bloccante: senza il job gli obiettivi funzionano, i versamenti automatici si fanno a mano.

### J · Baseline degli advisor

MCP `get_advisors` con `type: "security"` e poi `type: "performance"`.

**Salva l'esito così com'è.** Serve per il confronto dopo il deploy: senza una fotografia del prima, non si distingue un problema nuovo da uno che c'era già. Aspettarsi già ora qualche segnalazione preesistente.

### K · Storico delle migrazioni registrate

MCP `list_migrations`.

Dice quali migrazioni Supabase considera applicate. Probabilmente `20260101000250_paid_by` **non** risulterà: se è stata applicata incollandola nell'SQL editor, la tabella `supabase_migrations.schema_migrations` non lo sa. Non è un problema — è un'informazione che serve per decidere come fare il deploy (vedi sotto).

---

## Il cancello: si passa o no?

| Controllo | Bloccante? | Se è rosso | Esito 19/09/2026 |
|---|---|---|---|
| 0 · MCP sul progetto giusto | 🔴 **Sì** | Non si tocca niente. Configura o usa l'altro PC. | ✅ `rxpbqwvnmaxjzlobgebc` |
| A · Un utente, un gruppo | 🔴 **Sì** | `current_group_id()` va ripensata prima. | ✅ 10 su 10, nessun orfano |
| B · Policy RLS esistenti | 🔴 **Sì** | Da leggere e conciliare con le nuove. | ✅ compatibili, trascritte |
| C · Tipi delle colonne | 🔴 **Sì** | Le foreign key fallirebbero. | ✅ conformi |
| E · Tabelle nuove assenti | 🔴 **Sì** | Capire cosa c'è già e perché. | ✅ assenti |
| F · Funzioni assenti | 🔴 **Sì** | `drop function` mirato prima di applicare. | ✅ assenti |
| D · `paid_by` presente | 🟡 No | Se manca, il blocco 03 la crea comunque. | ✅ colonna e indice presenti |
| G · Corpo di `get_spese_personali` | 🟡 No | Si sistema dopo, tocca solo la graffetta. | ✅ usa `to_jsonb`: niente da fare |
| H · Bucket assente | 🟡 No | Se c'è, controlla che sia privato. | ✅ nessun bucket |
| I · `pg_cron` | 🟢 No | Alternativa: Edge Function. | ✅ installato 1.6.4 |
| J · Advisor | 🟢 No | È una baseline, non un esito. | ✅ registrata |
| K · Migrazioni registrate | 🟢 No | Informativo, orienta il metodo di deploy. | ✅ vuoto, come previsto |

Esiti per esteso, query per query, in **[`RLS-BASELINE.md`](RLS-BASELINE.md)**.

---

## Passo successivo · Il deploy

**Da decidere insieme**, non deciso qui. Le due strade non sono equivalenti:

### a) Manuale — incollare `APPLICA_TUTTO.sql` nell'SQL editor

- ✅ Non richiede MCP in scrittura: zero rischio di colpire il progetto sbagliato
- ✅ Tutto in una transazione sola (`begin; … commit;`): o passa tutto o non resta niente a metà
- ❌ Supabase **non registra** le migrazioni in `supabase_migrations.schema_migrations`. Un `supabase db push` futuro proverà a riapplicarle: sono idempotenti, quindi non rompe, ma lo storico resta bugiardo

### b) Via MCP — sei chiamate `apply_migration`, una per file, nell'ordine

- ✅ Le migrazioni **vengono registrate**: lo storico resta allineato e `db push` futuro si comporta bene
- ✅ Ogni passo è isolato: se il terzo fallisce si sa esattamente dove
- ❌ Richiede l'MCP **in scrittura** sul progetto giusto: va tolto `--read-only` e va verificato il Passo 0 un'altra volta, subito prima
- ❌ Ogni file è una transazione a sé: un fallimento a metà lascia applicati quelli precedenti (recuperabile, ma è uno stato in più da gestire)

**Nota**: qualunque strada, l'ordine non è negoziabile — `00 helpers` per primo, poi 01, 02, 03, 04, 05.

## Passo successivo · Il test

Solo dopo un deploy riuscito, in quest'ordine:

1. **`VERIFICA_moduli_nuovi.sql`** — nove blocchi, tutti devono dire ✅. Due da non saltare: il bucket `receipts` **privato** (blocco 4) e le funzioni di lettura **invoker** e non definer (blocco 2).
2. **Advisor, di nuovo** — MCP `get_advisors` security e performance, confrontati con la baseline del controllo J. Interessa solo il *delta*.
3. **Tipi TypeScript** (facoltativo) — MCP `generate_typescript_types` per confrontare le interfacce scritte a mano nei service con lo schema reale.
4. **Collaudo a schermo** — la lista è in `STATO.md §7`, priorità 3. I cinque casi che contano davvero, compreso il test con **due utenti di gruppi diversi**: è l'unico modo per vedere se le policy RLS fanno quello che devono.

---

## Riassunto per la prossima sessione

> ~~Passo 0 (identità MCP) → controlli A-K → cancello~~ **fatti il 19/09, verdi** →
> **deploy (metodo da decidere)** ← si riparte da qui → `VERIFICA_moduli_nuovi.sql` → advisor
> (delta rispetto alla baseline in `RLS-BASELINE.md`) → collaudo a schermo.

La prima decisione da prendere è il **metodo di deploy**, e non è più neutra: l'MCP oggi è in
sola lettura, quindi la strada *b* costa una modifica a `.mcp.json` più un nuovo Passo 0.
Se si sceglie *b*, i controlli bloccanti vanno rifatti subito prima — il cancello verde di oggi
vale per lo stato di oggi, non per un MCP riconfigurato in scrittura.

Stato generale: **`STATO.md`**. Come si applica: **`DB-APPLICAZIONE.md`**.
