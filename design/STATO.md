# Stato del lavoro — punto di ripresa

**Ultimo aggiornamento: 26 settembre 2026.**
Questo è il documento da leggere per primo a inizio sessione. Dice dove siamo, cosa funziona, cosa manca e in che ordine riprendere.

| Documento | A cosa serve |
|---|---|
| **`STATO.md`** ← sei qui | Punto di ripresa: fatto, da fare, note operative |
| **`RLS-BASELINE.md`** | **Esito dei controlli del 19/09 e unica copia delle policy RLS attive.** Baseline per il confronto dopo il deploy. |
| `PRE-RILASCIO.md` | La procedura dei controlli sul database, via MCP e in sola lettura. **Eseguita il 19/09: cancello verde.** Da rifare prima di ogni nuovo passaggio. |
| `DB-APPLICAZIONE.md` | Come applicare le migrazioni, a mano o via MCP. **Eseguito il 19/09.** Contiene anche cosa comporta pianificare l'accantonamento automatico (OP-022). |
| **`COLLAUDO.md`** | **I sei casi di collaudo a schermo** (OP-021), con l'esito atteso e cosa significa se non torna. **Passati tutti il 26/09.** |
| **`REVISIONE.md`** | **Registro dei rilievi della revisione** (OP-021 + OP-032), chiusa il 26/09 in due giri: rilievi, cause, correzioni e prove. |
| `IMPLEMENTAZIONE.md` | Dettaglio di cosa è stato riscritto e perché |
| `SPEC-MODULI-NUOVI.md` | Specifica dei moduli che richiedono tabelle nuove |
| `DIREZIONE-A.md` | Specifica di prodotto: linguaggio, formule, vocabolario grafico |
| `AUDIT.md` | I 23 problemi del frontend originale (riferimento storico) |
| `mockups.html` | Il laboratorio dei mockup (direzioni A e B) |

---

## 1. In una riga

**Il frontend è completo e il database è allineato.** Tutti i moduli previsti sono implementati, e il **19/09/2026 le migrazioni sono state applicate**: budget, obiettivi, quote e conguagli, scontrini hanno le loro tabelle. Non ci sono più pagine che spiegano cosa manca.

👉 **Il giro `PRE-RILASCIO.md` → deploy → test è arrivato al terzo passo.**
Verifiche preventive verdi (`RLS-BASELINE.md`), deploy eseguito a mano dall'SQL editor, `VERIFICA_moduli_nuovi.sql` senza ❌.

> **Aggiornamento 26/09/2026.** OP-021 (collaudo) chiuso: sei casi su sei (`COLLAUDO.md`).
> **OP-032 (valutazione) chiuso con il secondo giro** — `REVISIONE.md §6`: le nove prove del §5.3
> tutte passate, tutte le schermate guardate in tema chiaro e scuro, Semplice e Avanzata, e a
> 390 px; **dodici rilievi nuovi** (RIL-014…RIL-025) corretti e provati, più una semplificazione
> della modalità Semplice schermata per schermata.
>
> ✅ **Chiusura la sera del 26/09**: applicate via MCP le migrazioni
> `20260101000700_recurring_first_occurrence.sql` (OP-044) e `20260101000800_report_filter_paid_by.sql`
> (OP-045), ciascuna provata con un caso costruito prima e verificata a database e a schermo
> (`REVISIONE.md §6.4`). OP-032, OP-044 e OP-045 chiusi.
>
> Sempre il 26/09, dopo la chiusura: **OP-042** (una sola chiamata a `get_budget_status` per
> apertura), **OP-043** («Annulla» ripristina la stessa spesa con quote e scontrino) e **OP-049**
> (installazione dell'app con un tocco, `docs/installazione-app.md`), tutti verificati.
> Il codice fino alla revisione è in git dal 26/09 (commit `ef01c44`); OP-042, OP-043 e OP-049
> sono ancora nell'albero di lavoro.
>
> ✅ **Sempre il 26/09, OP-030 e OP-031 chiusi** con `supabase/migrations/20260101000900_group_privacy.sql`,
> applicata via MCP e provata prima e dopo con `VERIFICA_group_privacy.sql` (21 prove), via REST dalla
> sessione di GruppoTest e a schermo. Erano più gravi di come erano scritti: un utente poteva
> riscrivere il proprio `group_id` ed entrare nel gruppo di un'altra famiglia, e
> `register_user_with_group` / `accept_invite` accettavano l'id di un utente qualsiasi. Dettaglio e
> nuova linea di base degli advisor (16/3/7/1) in `RLS-BASELINE.md` § «Delta 26/09».
> **Versione Beta 0.4.0 committata** (`238d837`, branch `revisione-op032`).
>
> 👉 **Da qui parte la prossima sessione:**
> 1. Merge su `main` e pubblicazione del frontend (la destinazione di deploy non è documentata: va scritta).
> 2. OP-048 — prova su telefono vero e PWA installata (il giro a 390 px era simulato), compresa una registrazione nuova con e senza invito.
> 3. OP-022 — pianificare l'accantonamento automatico, poi `AUTO_CONTRIBUTIONS_SCHEDULED = true`.

**Quello che manca è guardare l'app** — e il 19/09, a sessione conclusa, si è cominciato. *(Situazione al 19/09, superata dall'aggiornamento qui sopra.)*

1. **OP-032 · la valutazione modulo per modulo** — **primo giro fatto** da web desktop su sei schermate: **tredici rilievi**, in **[`REVISIONE.md`](REVISIONE.md)** con causa verificata sul codice, **tutti corretti la sera del 19/09** (OP-033…OP-039). Fra questi i tre che falsavano il resto: le modali che perdevano il fuoco a ogni carattere, il colore del testo di ogni pulsante spento da una riga di CSS, e le quote di spesa che sparivano al salvataggio. **Restano le prove a schermo** (§5.3) e il resto del giro: cinque schermate, il tema chiaro, telefono e PWA.
2. **OP-021 · il collaudo** — sei casi in `COLLAUDO.md`, ora tutti scritti passo per passo con importi ed esiti attesi. **Passati i casi 1, 2 e 4**; il 3 in parte, con un'anomalia che ha portato a scoprire OP-039; **restano il 3 (due passi), il 5 e il 6** — quest'ultimo è la sola verifica possibile delle policy RLS e richiede un account in un **gruppo diverso**.

Finché il collaudo non è fatto, i quattro moduli nuovi sono «scritti e installati», non «provati». Dettaglio in §7.

---

## 2. Stato per modulo

| Modulo | Frontend | Database | Stato |
|---|---|---|---|
| Design system, layout, navigazione | ✅ | — | **In uso** |
| Oggi (`/`) | ✅ | — | **In uso** |
| Movimenti (`/spese`) | ✅ | — | **In uso** |
| Nuova spesa / modifica | ✅ | — | **In uso** |
| Analisi · Report · Promemoria | ✅ | — | **In uso** |
| Impostazioni, Profilo, Inviti, Auth | ✅ | — | **In uso** |
| Famiglia — chi ha anticipato, conguaglio | ✅ | — | **In uso** |
| Fisse e abbonamenti (`/ricorrenti`) | ✅ | — | **In uso** |
| Fondo comune (`paid_by`) | ✅ | ✅ applicata 16/09 | **In uso e verificata** |
| **Budget a buste** | ✅ | ✅ applicata 19/09 | **In uso, collaudata il 26/09** (OP-021) |
| **Obiettivi di risparmio** | ✅ | ✅ applicata 19/09 | **In uso, collaudata il 26/09**. L'accantonamento automatico non è ancora pianificato (OP-022) e la pagina lo dice |
| **Quote personalizzate + conguagli chiusi** | ✅ | ✅ applicata 19/09, corretta 26/09 (700) | **In uso, collaudata il 26/09** |
| **Scontrini** | ✅ | ✅ applicata 19/09 | **In uso, collaudata il 26/09**. Bucket privato, URL firmate da 5 minuti |
| **Modalità Semplice** | ✅ | ✅ `view_mode` 19/09 | **In uso.** Segue l'account (OP-024), il default è Semplice (OP-025), semplificata schermata per schermata il 26/09 (OP-047) |
| **Installazione in app** | ✅ | — | **In uso** (OP-049). Prova su telefono vero in OP-048 |

### La rete per i moduli non migrati resta, e va bene così

Ogni servizio riconosce «la tabella non c'è ancora» (`src/lib/moduleState.ts`) e la pagina mostra un riquadro che dice quale migrazione manca, invece di un errore o di una schermata vuota che sembra un guasto.

Da oggi quel ramo non scatta più in produzione, ma **non va tolto**: protegge chiunque punti l'app a un database non ancora migrato — un ambiente di sviluppo, una macchina nuova, un ripristino. Costa poche righe e trasforma un errore incomprensibile in una frase che dice cosa fare. È lo stesso trattamento che `familyService` riservava a `paid_by` prima del 16/09, e che è servito fino a ieri.

In più: la tile «Budget» in home compare solo se ci sono buste, quella «Obiettivi» solo se ci sono salvadanai. Senza, restano «Speso» e «Fisse» come prima.

---

## 3. Migrazioni

`supabase/migrations/`

| File | Applicata? |
|---|---|
| `20260101000250_paid_by.sql` | ✅ **Sì**, 16/09/2026 |
| `20260101000000_helpers.sql` | ✅ **Sì**, 19/09/2026 |
| `20260101000100_budgets.sql` | ✅ **Sì**, 19/09/2026 |
| `20260101000200_goals.sql` | ✅ **Sì**, 19/09/2026 |
| `20260101000300_splits_settlements.sql` | ✅ **Sì**, 19/09/2026 |
| `20260101000400_receipts.sql` | ✅ **Sì**, 19/09/2026 |
| `20260101000500_view_mode.sql` | ✅ **Sì**, 19/09/2026 — `users_group.view_mode` (OP-024) |
| `20260101000600_grants.sql` | ✅ **Sì**, 19/09/2026 — correzione dei privilegi, vedi sotto |
| `20260101000700_recurring_first_occurrence.sql` | ✅ **Sì**, 26/09/2026 via MCP — OP-044 |
| `20260101000800_report_filter_paid_by.sql` | ✅ **Sì**, 26/09/2026 via MCP — OP-045 |
| `20260101000900_group_privacy.sql` | ✅ **Sì**, 26/09/2026 via MCP — OP-030, OP-031 |
| `VERIFICA_group_privacy.sql` | Rieseguibile: 21 prove come utente di GruppoTest e come anonimo, annulla tutto alla fine |
| **`APPLICA_TUTTO.sql`** | Il pacchetto del 19/09: le prime otto in ordine, idempotente |
| `VERIFICA_moduli_nuovi.sql` | Sole letture, rieseguibile. Dieci blocchi |
| `VERIFICA_paid_by.sql` | Sole letture, rieseguibile |

Le prime otto sono state applicate a mano dall'SQL editor, quindi **lo storico Supabase non le conosce**: `list_migrations` elenca solo le tre del 26/09, applicate con `apply_migration`. Era già così per `paid_by` ed è una scelta, non una dimenticanza — vedi `DB-APPLICAZIONE.md`.

### La correzione dei privilegi del 19/09

Gli advisor, riletti subito dopo il deploy, hanno segnalato tre funzioni nuove invocabili da `anon`. I blocchi 00 e 02 contenevano già `revoke all ... from public`, ma non basta: Supabase ha un `alter default privileges` che assegna `execute` ad `anon` e `authenticated` su **ogni** funzione creata in `public`, con grant nominali che una revoca a `PUBLIC` non tocca.

Due erano innocue (`current_group_id`, `is_group_admin`: si basano su `auth.uid()`, che senza sessione è `NULL`). Una no: **`run_auto_contributions(date)`** è `SECURITY DEFINER`, non guarda chi la chiama e scrive in `goal_contributions` per tutti i gruppi. La protezione contro i doppioni è per mese, ma il mese arriva dal parametro — quindi un chiamante anonimo poteva variare `p_today` e infilare versamenti in mesi arbitrari su obiettivi altrui.

Il blocco 07 revoca i tre accessi e concede `run_auto_contributions` al solo `service_role`. Nessuna schermata dell'app chiamava quelle funzioni (sono usate dentro le policy), quindi non si è tolto niente a nessuno.

**La lezione, per le migrazioni future**, e va letta per intero perché ci si è cascati **due volte nello stesso giorno**: per chiudere una funzione servono **entrambe** le revoche.

Una funzione nasce con `execute` concesso al pseudo-ruolo **`PUBLIC`** (default di Postgres) **e** ai ruoli `anon`/`authenticated`/`service_role` per nome (default privileges di Supabase). Sono cose diverse e sovrapposte:

- le migrazioni originali facevano `revoke ... from public` → toglievano solo la prima, i grant nominali restavano;
- la prima stesura del blocco 07 faceva `revoke ... from anon, authenticated` → toglieva solo le seconde, e su `run_auto_contributions` restava `PUBLIC`, che concede a chiunque. I grant nominali erano spariti, ma `has_function_privilege('anon', …)` restava `true`.

La forma corretta è `revoke execute ... from public, anon, authenticated`, poi si concede a chi deve. Il modo veloce di accorgersene è guardare `pg_proc.proacl`: **una voce che inizia con `=X/`**, senza nome di ruolo davanti, è `PUBLIC` che ha ancora accesso.

Tutto il ragionamento, con la query di controllo e lo stato finale dei privilegi, è in `RLS-BASELINE.md` § «Delta post-deploy».

⚠️ Le tre migrazioni dei moduli nuovi dipendono da `current_group_id()` e `is_group_admin()`, definite in `20260101000000_helpers.sql`: va applicata per prima. `APPLICA_TUTTO.sql` mette già tutto nell'ordine giusto.

✅ Le policy RLS già attive sulle tabelle esistenti **ora sono nel repository**: lette dal database il 19/09 e trascritte in `RLS-BASELINE.md`. Usano la stessa convenzione «un utente, un gruppo» di `current_group_id()`, quindi non c'è niente da conciliare prima di applicare. Resta da provare **con due utenti di gruppi diversi** dopo il deploy: è l'unico modo di vedere se fanno davvero quello che dicono.

### Correzioni fatte al SQL il 17/09

Il SQL scritto in precedenza aveva tre problemi, tutti corretti **prima** di qualsiasi applicazione:

1. **`get_settlement` inventava debiti retroattivi.** Faceva `coalesce(s.paid_by, s.user_id)`: con `paid_by NULL` (= fondo comune) ricadeva su «chi ha inserito la spesa», e siccome tutte le spese anteriori al 16/09 hanno `paid_by NULL`, avrebbe attribuito mesi di spesa comune a chi le aveva battute a tastiera. Ora considera **solo** gli anticipi (`paid_by is not null`).
2. **Mancava una lettura dei totali.** Aggiunta `get_settlement_totals()`: totale, quota da fondo comune, quota anticipata.
3. **Il versionamento del tetto non era atomico.** Cambiare un budget è «chiudi la versione in corso, aprine una nuova»: dal client, fra i due passi l'indice unico parziale lasciava la categoria senza tetto attivo. E due versioni che coprono lo stesso periodo facevano comparire la stessa busta **due volte** in `get_budget_status`. Aggiunte `set_budget()` e `clear_budget()`, che fanno tutto lato database con la regola: versione nata in questo periodo → si aggiorna in place; versione più vecchia → si chiude il giorno prima dell'inizio del periodo.

---

## 4. Cose del database che vanno sapute

**`get_spese_condivise` serializza l'intera riga**

```sql
SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.data_spesa DESC), '[]'::jsonb)
FROM public.spese s WHERE ...
```

Conseguenza pratica: **ogni colonna aggiunta a `spese` arriva al frontend da sola**, senza toccare la funzione. È il motivo per cui `paid_by` ha funzionato subito, e per cui `receipt_path` funzionerà allo stesso modo.
La funzione **non** filtra `is_recurring_parent` né `tipo_spesa`: lo fa il client (`src/lib/finance.ts` e `/spese`).

✅ **Anche `get_spese_personali` fa così.** Il corpo non è nel repository, ma è stato letto dal database il 19/09 ed è identico a quello sopra sulla tabella `spese_personali` (trascritto in `RLS-BASELINE.md`). Quindi `receipt_path` arriverà al frontend su entrambe le tabelle e la graffetta comparirà anche sulle spese personali: nessun intervento previsto.

Entrambe sono `SECURITY INVOKER`, quindi la RLS si applica a chi chiama — che è ciò che il blocco 2 di `VERIFICA_moduli_nuovi.sql` pretende.

**`paid_by` sta solo su `spese`, non su `spese_personali`** — una spesa personale non si divide con nessuno.

**Semantica di `paid_by`**
- `NULL` → fondo comune (default): la spesa è già di tutti, **non entra nel conguaglio**
- `uuid` → quel membro ha anticipato: il conguaglio glielo restituisce

Le spese precedenti al 16/09/2026 hanno tutte `NULL`. È voluto: non sappiamo chi avesse pagato, e "fondo comune" è l'unica interpretazione che non inventa debiti retroattivi.

**Quote: zero righe = parti uguali.** Una spesa senza righe in `expense_splits` si divide in parti uguali. Non è un caso da gestire, è il default: per questo non serve migrare nessun dato esistente.

**Verificare l'output di una funzione, non la firma.** Ispezionare `pg_proc.proargnames` per capire se una funzione restituisce una colonna funziona solo con `RETURNS TABLE`. Con `RETURNS jsonb` quei nomi sono i parametri di ingresso e il risultato è privo di significato.

---

## 5. Note operative

**Variabili d'ambiente**
`.env.local` è obbligatorio e non è nel repository (`.gitignore` ha `.env*`, con eccezione `!.env.example`). Se manca, `supabaseClient.ts` lancia un errore che dice quali variabili mancano e cosa fare.

⚠️ **Mai scrivere dentro `.env.local`.** Per verificare una build servono valori fittizi: vanno passati inline, non scritti su file.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="dummy"
npm run build
```

(Il 16/09 un `> .env.local` per una verifica di build ha sovrascritto il file reale dell'utente, che ha dovuto ricreare le chiavi. Con le variabili inline non succede.)

**La build va lanciata da PowerShell, non da Git Bash.** Sotto Git Bash la conversione automatica dei percorsi MSYS manda in confusione webpack (`mkdir 'E:\'`, `mkdir '\\?'`) e la build fallisce senza che ci sia niente di rotto nel codice.

**Artefatti PWA**
`npm run build` rigenera `public/sw.js`, `public/workbox-*.js` e un `public/worker-<hash>.js` nuovo. Sono versionati: dopo una build di verifica vanno ripristinati, altrimenti sporcano il diff.

```bash
git checkout -- public/
rm -f $(git status --short public/ | awk '$1=="??"{print $2}')
```

**Comandi di verifica**

```bash
./node_modules/.bin/tsc --noEmit                    # tipi
./node_modules/.bin/eslint src --ext .ts,.tsx       # lint
# build: da PowerShell, con le variabili inline (sopra)
```

Atteso: tipi puliti, **build 20 route**, lint pulito sui file riscritti. Restano warning preesistenti in `src/services/*`, `src/app/inviti`, `src/app/register`, `src/components/DebugLog.tsx` (`no-explicit-any` nei catch, entità non escapate): non introdotti da questo lavoro.

**Il repository di questo PC non è quello GitHub previsto per il progetto.** Non fare commit né push senza indicazione esplicita.

**Git segnala «dubious ownership»** su `E:/Dev/CashFlowPilot` (il disco appartiene a un SID diverso dall'utente AzureAD). Si risolve una volta per tutte con:

```bash
git config --global --add safe.directory E:/Dev/CashFlowPilot
```

**Il progetto vive su un disco esterno.** Il 17/09 si è scollegato durante una build: Next ha risposto con errori che sembravano bug (`Cannot find module …/altro/page.tsx` su un file esistente). Se compaiono errori di percorso assurdi, prima di cercare la causa nel codice controlla che l'unità sia ancora montata.

---

## 6. Rumore in console che NON è un bug

| Messaggio | Cos'è |
|---|---|
| `Cannot read properties of undefined (reading 'startTime')` in `reportAllChanges` | Il `web-vitals` minificato che Next carica in sviluppo. Si rompe quando Fast Refresh rimonta la pagina mentre arriva un `PerformanceEntry`. Solo in dev, nessun effetto. Sparisce con `npm run build && npm start`. |
| `was preloaded using link preload but not used` | In dev Next inietta il CSS via JS per l'hot-reload, quindi il preload non viene consumato. |
| Ogni messaggio attribuito a `DebugLog.tsx:46` | `DebugLog` sostituisce `console.log/error/warn` e `window.onerror`: si perde l'attribuzione del file di origine. Vedi §8. |

---

## 7. Da fare — in ordine

> **Aggiornamento 26/09/2026.** Le priorità 0 e 1 qui sotto sono **fatte**: collaudo OP-021 sei
> casi su sei, revisione OP-032 chiusa in due giri. Restano come storico. L'ordine attuale è in §1.
>
> **Il giro era: verifiche → deploy → test.** I primi due passi sono fatti il 19/09. Quello che resta è il terzo, ed è il più lungo: guardare l'app.

### ✅ Fatto · Controlli preventivi sul database, via MCP — 19/09/2026

**Cancello verde: nessun bloccante.** Tutti i controlli, dal Passo 0 alla K, eseguiti via MCP in sola lettura. Esiti per esteso in **`RLS-BASELINE.md`**; la procedura resta in `PRE-RILASCIO.md` e va rifatta prima di ogni nuovo passaggio sul database.

Le tre cose che valeva la pena sapere, e che ora sappiamo:

- **Passo 0** — l'MCP punta a `rxpbqwvnmaxjzlobgebc`, che coincide con `.env.local`. È stato creato un `.mcp.json` di progetto che oscura quello globale dentro questa cartella. Nessuna tabella di Tefin Marine Hub in vista. **Ma è `--read-only`**, e non è versionato: va rifatto su ogni macchina e riverificato ogni sessione.
- **B** — le policy RLS esistenti legano l'utente al gruppo con **la stessa convenzione** che `current_group_id()` incorpora: niente da conciliare prima del deploy. Ora sono trascritte nel repository.
- **G** — `get_spese_personali` **usa `to_jsonb`** come la sua gemella: `receipt_path` arriverà al frontend su entrambe le tabelle senza toccare nulla, graffetta compresa.

Due riserve preesistenti sono finite a verbale come punti nuovi: **OP-030** (due SELECT a `true` su `users_group` e `groups_account`: ogni utente autenticato legge le anagrafiche e i `push_token` di tutti) e **OP-031** (sei funzioni `SECURITY DEFINER` invocabili da `anon`). Nessuna delle due è introdotta dalle migrazioni nuove e nessuna blocca il deploy.

### ✅ Fatto · Deploy delle migrazioni — 19/09/2026

Applicato a mano dall'SQL editor, con `APPLICA_TUTTO.sql`: una transazione sola, nessun MCP in scrittura. L'MCP di progetto è rimasto `--read-only` per tutto il tempo, che era il punto.

Il bundle è cresciuto a **otto blocchi**: ai sei previsti si sono aggiunti il 06 (`view_mode`, serviva a OP-024 e conveniva farlo nello stesso passaggio invece che in un secondo deploy) e il 07 (correzione dei privilegi, §3).

Un inciampo, per memoria: il primo tentativo è fallito con *syntax error at or near "$"*. Causa non nel SQL ma nello script che aveva assemblato il bundle, dove `String.replace()` aveva interpretato i `$$` del dollar-quoting come sequenza di escape. La transazione ha annullato tutto e non è rimasto niente a metà — che è esattamente il motivo per cui il bundle sta dentro `begin; … commit;`.

### Priorità 0 · Guardare l'app ← **da qui parte la prossima sessione**

> **Il 19/09, a sessione conclusa, è stato fatto il primo giro di OP-032** — l'app guardata a
> schermo da web desktop su sei pagine — ed è stato eseguito in parte il collaudo. Ne sono usciti
> **tredici rilievi**, tutti in **[`REVISIONE.md`](REVISIONE.md)** con la causa verificata sul
> codice, e **tutti corretti la sera stessa** (OP-033…OP-039, chiusi).
>
> Compilano, passano lint e build. **Nessuno li ha ancora guardati.**

**1. Le nove prove a schermo** — `REVISIONE.md §5.3`. Le tre che contano più delle altre:

| Prova | Perché |
|---|---|
| Scrivere `400` di seguito in «Nuova busta», senza rientrare nel campo | Era il difetto che rendeva inutilizzabili le modali |
| **In tema chiaro**, guardare «Aggiungi spesa» e gli altri pulsanti primari | Una riga di CSS spegneva il colore del testo di **ogni** pulsante, in entrambi i temi |
| Dividere una spesa 70/30, riaprirla, cambiare solo la nota e salvare | Le quote non si vedevano e sparivano al salvataggio: il dato che dice chi deve quanto |

**2. Il collaudo**, che è un'altra cosa e resta in piedi: [`COLLAUDO.md`](COLLAUDO.md), casi **3** (i due passi
finali), **5** (modalità: serve un secondo dispositivo) e **6** (due utenti di **gruppi
diversi** — GruppoTest non basta, i suoi due utenti stanno nello stesso gruppo). Tutti e sei i
casi sono ora scritti passo per passo, con importi ed esiti attesi.

**3. Il giro di revisione non è finito**: restano Spese, Famiglia, Promemoria, Altro e
Impostazioni, **tutto il tema chiaro** — mai esaminato, perché il difetto dei pulsanti lo rendeva
inutile — e le prove su telefono e PWA installata.

### Priorità 1 · Collaudo e valutazione dei moduli

> Due lavori distinti, che conviene fare insieme modulo per modulo. **OP-032 ha avuto il suo
> primo giro il 19/09** (§Priorità 0); **OP-021 non è ancora stato eseguito**:
>
> - **OP-021 · collaudo** — i moduli nuovi fanno quello che devono? Sei casi in `COLLAUDO.md`.
> - **OP-032 · valutazione** — raggio più ampio, su **tutti** i moduli e su tre assi:
>   **funzionalità** (fa quello che serve), **correttezza del dato** (i numeri tornano fra
>   schermate diverse e con il database), **chiarezza** (il numero mostrato è quello che serve a
>   decidere, e si capisce senza spiegazioni).
>
> Il terzo asse è quello che il collaudo tecnico non tocca: un modulo può passare tutti i casi di
> `COLLAUDO.md` e continuare a mostrare il numero sbagliato per la domanda che l'utente si sta
> facendo. È il criterio di `DIREZIONE-A`, ed è l'unico che richiede di guardare le schermate
> invece dei dati.

Le verifiche automatiche sono già fatte, il 19/09:

1. ✅ **`VERIFICA_moduli_nuovi.sql`** — dieci blocchi, nessun ❌. Bucket `receipts` **privato**, funzioni di lettura **invoker**, `view_mode` su tutti e dieci gli utenti.
2. ✅ **Advisor riletti** e confrontati con `RLS-BASELINE.md`: il delta ha fatto emergere la falla sui privilegi, corretta col blocco 07 in due passaggi (§3). A correzione avvenuta il delta è **+2**, non zero, e sono voluti: `current_group_id()` e `is_group_admin()` restano eseguibili da `authenticated` perché **le policy RLS le chiamano**, e le espressioni delle policy girano coi privilegi di chi interroga. Chiuderle chiuderebbe anche ogni lettura delle tabelle nuove. **+2 è la nuova linea di base**: un terzo avviso di quella famiglia sarà una regressione.
3. Facoltativo, quando capita: MCP `generate_typescript_types` per confrontare le interfacce scritte a mano nei service con lo schema reale.

Resta il collaudo a schermo, che ha un documento tutto suo: **[`COLLAUDO.md`](COLLAUDO.md)**. Sei casi, ognuno con cosa fare, cosa deve succedere e **cosa significa se non succede** — quest'ultima è la parte utile, perché trasforma un esito sbagliato in un indizio su dove guardare.

In sintesi: versionamento del tetto · accantonamento che cala il disponibile · quote non uguali e conguaglio chiuso · scontrini su spese condivise **e personali** · modalità Semplice/Avanzata legata all'account.

E soprattutto il caso 6: **due utenti di gruppi diversi**. È l'unico che mette alla prova le policy RLS, e un errore lì non dà sintomi finché qualcuno non vede i dati di qualcun altro. Serve un secondo account registrato creando un **gruppo nuovo**, non accettando un invito.
Stima: **mezza giornata**.

### Priorità 2 · Le decisioni ancora aperte
✅ **Le due sulla modalità sono chiuse il 19/09** (OP-024 e OP-025), e si sono chiuse insieme perché l'una sbloccava l'altra: il default è passato a **Semplice** come vuole `DIREZIONE-A §4` solo perché la migrazione 06 ha prima scritto `view_mode = 'advanced'` su chi c'era già. Senza quel travaso, cambiare la costante avrebbe fatto sparire blocchi a chi li usa ogni giorno — che era l'obiezione che teneva ferma la decisione.

La modalità ora **segue l'account**: `ModeContext` legge `users_group.view_mode` al login con lo stesso meccanismo che `ThemeContext` usa per `dark_mode`, e `localStorage` resta come copia locale per dipingere la schermata giusta prima che risponda il database. `NULL` significa «non ha ancora scelto» e lascia vincere il default.

Da verificare a schermo: `COLLAUDO.md` caso 5.

Restano aperte le decisioni di lingua (§Priorità 4) e i due debiti minori del §8.

### Priorità 3 · Pianificare `run_auto_contributions()` — OP-022
Serve perché l'accantonamento automatico degli obiettivi funzioni da solo. Dettagli in `DB-APPLICAZIONE.md`.
Finché non la pianifichi gli obiettivi funzionano lo stesso: i versamenti si fanno a mano dall'app.

`pg_cron` è **installato** (1.6.4). La strada più corta non è copiare il job esistente, ma chiamare la funzione direttamente — il job che c'è passa da `extensions.http_post` solo perché la sua logica vive in una Edge Function, mentre questa sta già sul database:

```sql
select cron.schedule('accantonamenti-automatici', '0 6 * * *',
                     $select public.run_auto_contributions()$);
```

Gira come `postgres`, proprietario della funzione: nessuna service key, nessun giro per HTTP.

⚠️ **Va chiamata ogni giorno, non ogni mese**, e un giorno saltato non si recupera: il filtro è sul giorno esatto del mese. E `auto_giorno` fra 29 e 31 non scatta mai a febbraio. Cosa fa, cosa comporta e i casi limite sono in **`DB-APPLICAZIONE.md`**, sezione «L'accantonamento automatico va pianificato».

### Priorità 4 · I nomi ancora aperti
`DIREZIONE-A §10`: come chiamare il numero principale, conguaglio mensile o progressivo, accantonamento virtuale o reale.

---

## 8. Piccoli debiti, da valutare

- **`DebugLog`** (`src/components/DebugLog.tsx`, montato in `layout.tsx` solo in dev) sostituisce i metodi di `console`: ogni messaggio dell'app risulta originato da `DebugLog.tsx:46` invece che dal file vero. Da decidere se toglierlo o farlo loggare senza sostituire `console`.
- **Warning ESLint preesistenti** nei service (`no-explicit-any` nei catch) e in `register`/`inviti` (entità non escapate). Mai toccati: sistemabili in un passaggio dedicato.
- **La tabella dati in Analisi resta visibile anche in Semplice.** `DIREZIONE-A §4` la elencava fra le cose da Avanzata, ma è l'alternativa testuale del grafico per gli screen reader: nasconderla sarebbe una regressione di accessibilità. È già dentro un `<details>`, quindi non pesa visivamente. Deviazione voluta.
- **Il selettore di periodo resta visibile in Semplice** su Movimenti, dove `DIREZIONE-A §4` lo dava come cosa da Avanzata: è navigazione condivisa con tutte le altre pagine, nasconderlo su una sola avrebbe spostato il «dove si trova», che è la regola che la modalità non deve violare.
- **`/famiglia`** mostra un avviso se `paid_by` non esiste a DB. Ora la colonna c'è: l'avviso non comparirà più, ma il codice di fallback in `familyService` resta e va bene lasciarlo (costa poco e protegge un ambiente non ancora migrato). Vale anche per il calcolo del conguaglio: se `get_settlement` non c'è, si ricade sul calcolo locale in parti uguali.
- **Spese storiche** tutte a fondo comune: se alcune erano anticipi reali, si correggono dalla modale di modifica una per una.
- **MCP di progetto configurato il 19/09, in sola lettura.** `.mcp.json` nella radice definisce un server `supabase-cloud` su `rxpbqwvnmaxjzlobgebc` con `--read-only`: a parità di nome oscura quello globale (Tefin Marine Hub) **solo dentro questa cartella**, e il database aziendale non è più raggiungibile da qui. Due conseguenze da ricordare: il file **non è versionato** (`.gitignore` riga 52), quindi su un altro PC va ricreato e il Passo 0 va rifatto; e in sola lettura **non si può fare `apply_migration`**, quindi il deploy via MCP richiede prima di togliere quel flag.
- ✅ *Chiuso il 26/09, migrazione 900.* **Due letture RLS più larghe del necessario** (OP-030): `users_group` e `groups_account` hanno ciascuna due policy SELECT a `true`, quindi ogni utente autenticato legge nomi, preferenze e `push_token` di tutti, e l'elenco di tutti i gruppi. Preesistente, non introdotta dalle migrazioni nuove.
- ✅ *Chiuso il 26/09, migrazione 900.* **Sei funzioni `SECURITY DEFINER` invocabili da `anon`** (OP-031): `accept_invite`, `cancel_invite`, `create_invite`, `notify_new_expense`, `register_user_with_group`, `validate_invite`, tutte raggiungibili via `/rest/v1/rpc/…` senza aver fatto accesso. Alcune lo devono essere per forza (registrazione, validazione dell'invito), altre no. Segnalato dagli advisor, baseline in `RLS-BASELINE.md`.

---

## 9. Decisioni prese, da non rimettere in discussione senza motivo

- **Un numero in cima**: «Puoi spendere» = saldo reale − impegnato − **accantonato**. Calcolo prudente, non conta le entrate ancora attese.
- **I soldi accantonati escono dal disponibile.** Senza questa riga l'obiettivo di risparmio sarebbe decorativo.
- **Pieno = reale, tratteggiato = previsto.** Unica convenzione grafica, valida per gauge, barre e linea.
- **Un solo periodo** per tutta l'app (`PeriodContext`), non uno per pagina.
- **Colore mai da solo**: gli stati hanno sempre icona o parola accanto. Vale anche per i tre stati del budget: *In linea · Quasi finito · Superato*.
- **Il `+` è un'azione, non una tab.** La barra mobile ha 4 destinazioni con icona *e* testo.
- **Budget ha preso il posto di Analisi** nella barra in basso: il tetto è la domanda di ogni giorno, l'analisi si guarda ogni tanto e sta sotto «Altro».
- **Fondo comune di default** nel portafoglio condiviso: non si inventano debiti se nessuno dichiara di aver anticipato.
- **Parti uguali di default** nelle quote: zero righe in `expense_splits`, nessuna migrazione di dati, nessun caso speciale.
- **Un tetto non si cancella, si chiude.** Mai `DELETE` su `budgets`: il tetto che valeva a settembre deve restare leggibile guardando settembre.
- **Un conguaglio chiuso è un fatto storico**: si riapre, non si modifica.
- **Il bucket degli scontrini è privato**, sempre URL firmate, compressione lato client prima del caricamento.
- **Semplice/Avanzata cambia quanto si vede, mai dove si trova.** Stesso markup, due classi CSS, nessun ramo di codice duplicato.
- **Token semantici, mai colori Tailwind grezzi** nei componenti (`bg-surface`, non `bg-white dark:bg-gray-900`).
