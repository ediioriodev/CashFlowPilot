# Applicare le migrazioni — istruzioni operative

> Serve perché l'app è **già pronta** per quattro moduli le cui tabelle non esistono ancora sul database.
> Finché non le applichi, le pagine esistono e dicono cosa manca: non danno errore e non si rompe niente.

## ✅ I controlli preventivi sono fatti — 19/09/2026, cancello verde

**`PRE-RILASCIO.md` è stato eseguito per intero**, dal Passo 0 alla K, e nessun bloccante è rosso. Esiti in **[`RLS-BASELINE.md`](RLS-BASELINE.md)**. In breve, le due cose che non si potevano saltare:

- **l'MCP punta al progetto giusto?** ✅ sì. `.mcp.json` di progetto → `rxpbqwvnmaxjzlobgebc`, che coincide con `.env.local`. Oscura quello globale (Tefin Marine Hub) dentro questa cartella;
- **le policy RLS già attive** ✅ lette e trascritte nel repository. Usano la stessa convenzione «un utente appartiene a un solo gruppo» che queste migrazioni assumono: niente da conciliare.

⚠️ **Ma l'MCP è `--read-only`**, quindi la strada via `apply_migration` qui sotto **non funziona così com'è**: vedi la nota nella sezione dedicata.

⚠️ **Il cancello verde vale per lo stato del 19/09.** Se si riconfigura l'MCP in scrittura, o se passa del tempo, i controlli bloccanti vanno rifatti subito prima del deploy: `PRE-RILASCIO.md` resta la procedura, non un documento archiviato.

---

## In due minuti — deploy manuale

1. Apri l'**SQL editor** di Supabase sul progetto CashFlowPilot.
2. Incolla tutto `supabase/migrations/APPLICA_TUTTO.sql` ed esegui **una volta**.
3. Incolla `supabase/migrations/VERIFICA_moduli_nuovi.sql` ed esegui: ogni blocco dice ✅ o ❌.
4. Apri l'app: `/budget`, `/obiettivi` e `/famiglia` smettono di mostrare l'avviso «non ancora attivo».

## Le altre due strade

**Da riga di comando**, sul PC che ha le credenziali del progetto:

```bash
supabase db push
```

applica i sei file con il prefisso timestamp. `APPLICA_TUTTO.sql` e i `VERIFICA_*.sql` non ce l'hanno, quindi il CLI li ignora: il bundle è pensato per il copia-incolla.

**Via MCP**, sei chiamate `apply_migration` nell'ordine 00 → 01 → 02 → 03 → 04 → 05, passando il contenuto di ciascun file. Richiede l'MCP **in scrittura** sul progetto giusto.

⚠️ **Oggi non lo è.** `.mcp.json` porta `--read-only` e l'MCP risponde come `supabase_read_only_user`: `apply_migration` viene rifiutato. Per usare questa strada servono tre passaggi, in quest'ordine:

1. togliere `"--read-only"` dagli `args` in `.mcp.json`;
2. **riavviare Claude Code** nella cartella — i server MCP si allacciano all'avvio, una modifica a caldo non ha effetto;
3. **rifare il Passo 0** di `PRE-RILASCIO.md` subito prima di scrivere. Non è una formalità: è l'unico momento in cui un MCP in scrittura viene puntato su un database, e il controllo costa una chiamata.

Finito il deploy, rimettere `--read-only`.

**Scegline una sola.** Sono comunque idempotenti, quindi se ne fai due non succede niente di male.

### La differenza che conta fra le tre

| | Registra la migrazione nello storico Supabase | Transazione unica |
|---|---|---|
| SQL editor (bundle) | ❌ no | ✅ sì |
| `supabase db push` | ✅ sì | una per file |
| MCP `apply_migration` | ✅ sì | una per file |

Incollare nell'SQL editor **non scrive** in `supabase_migrations.schema_migrations`: un `db push` futuro proverà a riapplicare tutto. Essendo idempotente non rompe niente, ma lo storico resta bugiardo. È già successo con `20260101000250_paid_by.sql`, applicata a mano il 16/09.

✅ **Verificato il 19/09 col controllo K: `list_migrations` è completamente vuoto.** Nemmeno `paid_by` risulta. Lo storico Supabase quindi non è «da preservare»: è già inservibile. Chi sceglie la strada manuale non rovina una situazione intatta, e chi sceglie il CLI o l'MCP non la ripara da sola — per riallinearla servirebbe un `supabase migration repair` a parte.

---

## Cosa viene applicato, e in che ordine

| # | File | Cosa introduce |
|---|---|---|
| 00 | `20260101000000_helpers.sql` | `current_group_id()`, `is_group_admin()`, `touch_updated_at()` |
| 01 | `20260101000100_budgets.sql` | `budgets` + `get_budget_status()` · `set_budget()` · `clear_budget()` |
| 02 | `20260101000200_goals.sql` | `goals`, `goal_contributions`, vista `goals_progress`, `run_auto_contributions()` |
| 03 | `20260101000250_paid_by.sql` | **già applicata il 16/09/2026** — riapplicarla è un no-op |
| 04 | `20260101000300_splits_settlements.sql` | `expense_splits`, `settlements`, `get_settlement()`, `get_settlement_totals()` |
| 05 | `20260101000400_receipts.sql` | bucket privato `receipts` + colonne `receipt_path` |
| 06 | `20260101000500_view_mode.sql` | `users_group.view_mode`: la modalità Semplice/Avanzata segue l'account (OP-024) |
| 07 | `20260101000600_grants.sql` | revoca ad `anon` le funzioni di supporto e il job (correzione post-deploy) |

**L'ordine conta.** I blocchi 01, 02 e 04 usano `current_group_id()` e `is_group_admin()`, definite nel blocco 00. Applicarne uno da solo, senza il 00, fallisce con *function does not exist*.

Sulle tabelle esistenti si toccano quattro cose, tutte con `add column if not exists`:
`spese.paid_by`, `spese.receipt_path`, `spese_personali.receipt_path`, `users_group.view_mode`.
L'unico dato riscritto è `view_mode`, portato a `'advanced'` sugli utenti che esistevano al momento del deploy — e solo su quelli, una volta sola.

---

## Le tre cose da sapere prima

### 1. Le policy RLS esistenti — lette il 19/09

Le policy già attive su `spese`, `spese_personali` e `users_group` vivono solo sul database. Quelle nuove assumono la convenzione **«un utente appartiene a un solo gruppo»**, che è ciò che `current_group_id()` implementa con un `limit 1`.

✅ Sono state lette e trascritte in **[`RLS-BASELINE.md`](RLS-BASELINE.md)**: seguono la stessa convenzione, quindi non c'era niente da conciliare. Resta valido il modo di accorgersene se un giorno divergessero — il sintomo **non** è un errore all'applicazione, è un utente che vede righe che non dovrebbe, o che non vede le sue. Si scopre solo provando con **due utenti di gruppi diversi**, che è OP-021.

### 2. Il fondo comune non si tocca

`paid_by IS NULL` significa **pagato dal fondo comune**: la spesa è già di tutti e non entra nel conguaglio. Tutte le spese anteriori al 16/09/2026 sono così.

La prima versione di `get_settlement` faceva `coalesce(paid_by, user_id)`: avrebbe attribuito ogni spesa storica a chi l'aveva **inserita**, inventando debiti retroattivi fra i membri. È stata corretta prima della consegna — se ti trovassi fra le mani una copia vecchia di quel file, buttala.

Il blocco 8 di `VERIFICA_moduli_nuovi.sql` conta quante spese sono a fondo comune e quante sono anticipi: prima dell'applicazione devono risultare quasi tutte a fondo comune.

### 3. L'accantonamento automatico va pianificato — OP-022

> ✅ **Fatto il 26/09/2026** con `20260101001000_schedule_auto_contributions.sql`: job pg_cron
> `accantonamenti-automatici` ogni giorno alle 04:00 UTC, data calcolata nel fuso di Roma. Il giorno
> è già limitato a 1-28 (`goals_auto_giorno_check`), quindi il caso di febbraio descritto sotto non si
> presenta. Per spegnerlo: `select cron.unschedule('accantonamenti-automatici');` e
> `AUTO_CONTRIBUTIONS_SCHEDULED = false` in `src/lib/moduleState.ts`.

**Che cos'è.** Un obiettivo di risparmio può avere due campi: `auto_importo` (quanto mettere da parte) e `auto_giorno` (in che giorno del mese). Sono una promessa che qualcuno deve mantenere: il database non ha un orologio proprio, quindi finché nessuno chiama `run_auto_contributions()` quei due campi restano numeri scritti e basta, e il salvadanaio non si riempie.

**Cosa fa esattamente.** Una `insert ... select` sola. Per ogni obiettivo non archiviato che ha `auto_importo` valorizzato e `auto_giorno` uguale al giorno del mese della data ricevuta, inserisce un versamento da `auto_importo` in `goal_contributions`, marcato `automatico = true`, **saltando** gli obiettivi che hanno già un versamento automatico in quel mese. Restituisce quante righe ha scritto.

**Cosa comporta, in concreto:**

| | |
|---|---|
| **Se non la pianifichi** | Nulla si rompe. Gli obiettivi funzionano, i progressi si vedono, ma i versamenti vanno fatti a mano dall'app. È lo stato di oggi. |
| **Va chiamata ogni giorno, non ogni mese** | Il filtro è `auto_giorno = giorno di p_today`. Una pianificazione mensile colpirebbe un giorno fisso e ignorerebbe tutti gli obiettivi regolati su un giorno diverso. |
| **Chiamarla due volte in un giorno non fa danni** | Il `not exists` sul mese la rende idempotente: la seconda esecuzione scrive zero righe. Due job pianificati restano comunque un segnale di qualcosa fuori posto. |
| **Un giorno saltato si perde** | Il confronto è sul giorno esatto. Se il job non parte il 15, l'obiettivo regolato sul 15 **non recupera**: quel mese resta senza versamento. Non c'è logica di recupero. |
| **`auto_giorno` da 29 a 31 è una trappola** | A febbraio quei giorni non esistono e il versamento non parte mai. Se serve «fine mese», per ora la scelta sicura è 28. |
| **Chi risulta aver versato** | Per un obiettivo personale è il suo proprietario. Per un obiettivo di gruppo è `groups_account.admin`, non chi l'ha creato: nei versamenti automatici comparirà sempre l'amministratore. Non incide sul conguaglio, che guarda `spese`, non `goal_contributions`. |

**Come pianificarla.** `pg_cron` è installato (1.6.4, verificato il 19/09), quindi la strada più corta è un job che chiama la funzione direttamente:

```sql
select cron.schedule(
  'accantonamenti-automatici',
  '0 6 * * *',                        -- ogni giorno alle 06:00 UTC
  $$select public.run_auto_contributions()$$
);
```

Gira come `postgres`, che è il proprietario della funzione: non serve la service key e non serve passare da HTTP. È più diretta del job già presente (`send-pending-expenses-notifications`), che deve usare `extensions.http_post` solo perché la sua logica vive in una Edge Function.

⚠️ **Dal 19/09 la funzione non è più invocabile da `anon` e `authenticated`** (blocco 07 del bundle): era `SECURITY DEFINER` e scriveva su tutti i gruppi senza guardare chi chiamava. Se in futuro la pianifichi da una Edge Function invece che da `pg_cron`, quella deve usare la **service key**, non la chiave pubblica — altrimenti riceve *permission denied*.

Per controllare cosa è pianificato:

```sql
select jobid, schedule, jobname, active from cron.job order by jobid;
```

---

## Dopo: la lista di controllo

- [ ] `VERIFICA_moduli_nuovi.sql` non mostra nessun ❌
- [ ] Il bucket `receipts` risulta **privato** (blocco 4). Se fosse pubblico, ogni scontrino sarebbe leggibile da chiunque abbia l'URL
- [ ] `get_budget_status`, `get_settlement`, `get_settlement_totals`, `set_budget`, `clear_budget` sono **invoker** (blocco 2), non definer
- [ ] Prova con **due utenti di gruppi diversi**: ognuno vede solo i propri budget, obiettivi e conguagli
- [ ] `current_group_id()` per un utente senza gruppo torna `null` → nessuna riga visibile, **non tutte**
- [ ] In app: crea una busta, versa su un obiettivo, allega uno scontrino, chiudi un conguaglio
- [ ] `run_auto_contributions` pianificata una volta al giorno, non due

---

## Se qualcosa va storto

Tutto il pacchetto gira dentro `begin; … commit;`: se un blocco fallisce non resta niente a metà, e puoi rieseguirlo dopo aver sistemato.

**«function current_group_id does not exist»** → hai applicato un blocco senza il 00. Riesegui il bundle intero.

**Un conguaglio chiuso per errore** → si elimina da `settlements` (solo l'amministratore del gruppo), e in app c'è il pulsante «Riapri il conguaglio». Le spese di quel periodo tornano nel calcolo.

**Un tetto sbagliato** → non serve toccare il database: `clear_budget` chiude la versione attiva senza cancellare lo storico, ed è ciò che fa il pulsante «Togli il tetto».

**Vuoi tornare indietro del tutto** → le tabelle nuove sono isolate, nessuna tabella esistente dipende da loro:

```sql
drop table if exists public.expense_splits, public.settlements,
                     public.goal_contributions cascade;
drop view  if exists public.goals_progress;
drop table if exists public.goals, public.budgets cascade;
-- le colonne aggiunte si possono lasciare: non danno fastidio a nessuno
-- alter table public.spese drop column if exists receipt_path;
```

⚠️ **`spese.paid_by` non si tocca**: è in produzione dal 16/09/2026 e l'app la usa.
