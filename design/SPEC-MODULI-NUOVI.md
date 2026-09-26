# Moduli che richiedono nuove strutture dati — specifica

> **Aggiornamento 17/09/2026 — questa specifica è stata implementata per intero.**
> Il frontend di tutti e quattro i moduli è scritto e compila; quello che manca è **applicare le migrazioni al database**: vedi **`DB-APPLICAZIONE.md`**.
> Il documento resta come specifica di riferimento — dice *perché* le cose sono fatte così. Per *com'è andata a finire* vedi `IMPLEMENTAZIONE.md §8-15`.

| Modulo | Migrazione | Frontend | Database |
|---|---|---|---|
| ~~Chi ha pagato / fondo comune~~ | `20260101000250_paid_by.sql` | ✅ | ✅ **applicata 16/09/2026** |
| Budget a buste | `20260101000100_budgets.sql` | ✅ scritto | ⏳ **da applicare** |
| Obiettivi di risparmio | `20260101000200_goals.sql` | ✅ scritto | ⏳ **da applicare** |
| Quote personalizzate e conguagli chiusi | `20260101000300_splits_settlements.sql` | ✅ scritto | ⏳ **da applicare** |
| Scontrini | `20260101000400_receipts.sql` | ✅ scritto | ⏳ **da applicare** |

Finché le migrazioni non ci sono, ogni pagina riconosce «la tabella non esiste ancora» e lo dice, invece di dare errore: `src/lib/moduleState.ts`.

> **Prima di applicare**: le migrazioni assumono la convenzione «un utente appartiene a un solo gruppo» e definiscono `current_group_id()` e `is_group_admin()` in `20260101000000_helpers.sql`. Le policy RLS già attive sulle tabelle esistenti non sono nel repository: vanno riviste insieme a queste.
> Applicazione: incollare `supabase/migrations/APPLICA_TUTTO.sql` nell'SQL editor, oppure `supabase db push`. Istruzioni complete in `DB-APPLICAZIONE.md`.

## Cosa è stato aggiunto al SQL rispetto a questa specifica

Tre cose, scoperte scrivendo il frontend e corrette **prima** di qualsiasi applicazione:

- **`get_settlement` inventava debiti retroattivi.** Faceva `coalesce(paid_by, user_id)`, cioè con `paid_by NULL` (= fondo comune) ricadeva su «chi ha inserito la spesa». Riscritta: solo gli anticipi.
- **`get_settlement_totals()`**, che qui non era prevista: serve a `/famiglia` per dire quanto è uscito dal fondo comune e quanto è stato anticipato.
- **`set_budget()` e `clear_budget()`**: il versionamento del tetto descritto al §1 non è atomico se fatto dal client, e due versioni sovrapposte facevano comparire la stessa busta due volte.

---

## 1. Budget a buste

### Perché serve una tabella
`ambito_spese` contiene solo il nome della categoria. Non esiste un posto dove scrivere «Spesa: massimo 500 € al mese». Serve `budgets`.

### Backend — già scritto
`public.budgets`: `scope` (C/P), `group_id` **oppure** `user_id`, `categoria`, `tetto`, `valido_da`/`valido_a`.

Il tetto è **versionato per periodo**: alzare il budget di novembre non deve riscrivere ottobre. Un indice unico parziale (`where valido_a is null`) garantisce un solo tetto attivo per categoria.

Lettura: `get_budget_status(scope, group_id, user_id, start, end)` → per ogni categoria `tetto`, `speso_reale`, `speso_previsto`, con la stessa distinzione reale/previsto di `src/lib/finance.ts`.

### Frontend

**`src/services/budgetService.ts`**
```ts
export interface BudgetStatus {
  categoria: string; tetto: number; spesoReale: number; spesoPrevisto: number;
  percentuale: number;               // spesoReale / tetto * 100
  residuo: number;                   // tetto - spesoReale
  stato: "ok" | "attenzione" | "superato";
}
// getStatus(range, scope)  → rpc('get_budget_status', …)
// upsert(categoria, tetto) → chiude il tetto attivo (valido_a = ieri) e ne inserisce uno nuovo
// remove(categoria)        → valido_a = oggi (mai DELETE: serve lo storico)
```
Soglie: `ok` < 85 %, `attenzione` 85–100 %, `superato` > 100 %. Sempre **icona + parola**, mai solo colore.

**`src/app/budget/page.tsx`** — due blocchi:
1. anello totale + `ProgressTrack` con `markAt={periodProgress(range)}` — la tacca «dove dovresti essere oggi»;
2. griglia di `Ring` (una per busta, 3 colonne su mobile, 6 su desktop) → tocco apre il dettaglio.
Barra laterale su desktop: elenco `CatRow`, categorie senza tetto, `Bars` del cumulato.

**`src/app/budget/[categoria]/page.tsx`** — il dettaglio on demand: `Gauge` della categoria, `Bars` settimanali, elenco movimenti (filtra `usePeriodExpenses()` per `ambito`), pulsante «Modifica il tetto».

**Innesti nell'app esistente**
- `src/app/page.tsx`: la tile «Speso» diventa «Budget» con l'anello della percentuale usata.
- `src/app/spese/nuova/page.tsx`: sotto la griglia categorie c'è già lo spazio (`Field help`) per «Budget Spesa: restano 87,50 € di 500,00 €».
- `src/components/layout/nav.ts`: aggiungere `{ href: "/budget", label: "Budget", icon: Target }` a `PRIMARY_NAV` **e** sostituire `/analisi` con `/budget` in `BOTTOM_NAV` (Analisi passa sotto «Altro»).

**Stimato**: 1 service, 2 pagine, 3 innesti. ~1,5 giornate.
**✅ Fatto il 17/09.** In più rispetto alla specifica: `set_budget()` e `clear_budget()` lato database, perché il versionamento del tetto dal client non è atomico.

---

## 2. Obiettivi di risparmio

### Backend — già scritto
`public.goals` (nome, icona, target, data, accantonamento automatico) + `public.goal_contributions` (versamenti e prelievi).

Il saldo **non è una colonna**: si disallineerebbe. La vista `goals_progress` lo somma dai versamenti e calcola `mancante`, `percentuale`, `mesi_stimati`.
`run_auto_contributions(date)` esegue gli accantonamenti automatici del giorno, idempotente per mese — va richiamata una volta al giorno da `pg_cron` o dalla Edge Function `send-reminders` già presente.

### Frontend

**`src/services/goalService.ts`** — `list(scope)`, `create(goal)`, `contribute(goalId, importo, nota)`, `archive(goalId)`.

**`src/app/obiettivi/page.tsx`** — anello totale + elenco `CatRow` con mini-anello per obiettivo; a lato la card «Accantonamento automatico» e `Bars` della crescita del risparmio.

**Il punto che fa funzionare il modulo**
I soldi accantonati devono **uscire da «Puoi spendere»**, altrimenti l'obiettivo è decorativo. In `src/lib/finance.ts`:

```ts
export function buildOverview(transactions, range, today, accantonato = 0): Overview {
  …
  const libero = saldoReale - impegnato - accantonato;
```
e in `usePeriodExpenses` si passa la somma dei contributi del periodo. La spiegazione nel modale «Come si calcola» guadagna una riga: *Messo da parte negli obiettivi − X €*.

**Stimato**: 1 service, 1 pagina, 1 modifica a `finance.ts`, 1 job. ~1,5 giornate.
**✅ Fatto il 17/09**, job escluso: `run_auto_contributions()` esiste ma va ancora pianificata (vedi `DB-APPLICAZIONE.md`). Senza, gli obiettivi funzionano lo stesso: i versamenti si fanno a mano.

---

## 3. Chi ha pagato, quote e conguagli

### ✅ Fatto: fondo comune vs anticipo

`20260101000250_paid_by.sql` — **applicata il 16/09/2026** — aggiunge `spese.paid_by`:

- `NULL` → **fondo comune** (impostazione di default): la spesa è già di tutti e **non entra nel conguaglio**;
- `uuid` → quel membro ha **anticipato**: il conguaglio glielo restituisce.

Il frontend è cablato e verificato: `PayerPicker` in `/spese/nuova` e nella modale di modifica, avatar o icona «fondo» nell'elenco movimenti, filtro «Chi ha pagato» con la voce del gruppo, e `/famiglia` che separa fondo comune da anticipi.

Nessuna modifica è servita su `get_spese_condivise`: usa `to_jsonb(s)`, quindi serializza l'intera riga e le colonne nuove entrano da sole. Verifica in `supabase/migrations/VERIFICA_paid_by.sql`.

### Cosa manca ancora

Con `paid_by` restano due limiti:

1. la divisione degli anticipi è sempre **in parti uguali**;
2. un conguaglio saldato **non si può chiudere**: le stesse spese tornano nel calcolo del mese dopo.

### Backend — già scritto
- `public.expense_splits` — quote per singola spesa. **Zero righe = parti uguali**: nessuna migrazione dei dati e nessun caso speciale nel codice. Un constraint trigger *deferred* verifica che la somma delle quote coincida con l'importo;
- `public.settlements` — fotografia del conguaglio chiuso; le spese di un periodo già chiuso escono dal calcolo;
- `get_settlement(group_id, start, end)` — sostituisce il calcolo client-side tenendo conto di tutto quanto sopra.

### Frontend
- `familyService.getSettlement()` passa da query + calcolo locale a `rpc('get_settlement', …)`; `minimalTransfers()` resta invariato (è solo l'algoritmo greedy debitori→creditori);
- `familyService.closeSettlement(range, transfers)` → insert su `settlements`; il pulsante **«Segna come saldato»** in `/famiglia` oggi non fa nulla: qui trova la sua azione;
- nuovo `SplitEditor` nel form: parti uguali (default) · a metà · per percentuale · tutta a una persona. Scrive `expense_splits` solo se diverso da parti uguali;
- `/famiglia`: sezione «Conguagli chiusi» con lo storico da `settlements`.

**Stimato**: 1 componente nuovo, 4 innesti, riscrittura di un metodo del service. ~1 giornata.
**✅ Fatto il 17/09.** Una correzione alla specifica: il pulsante «Segna come saldato» non «non faceva niente», **non esisteva proprio**. Ora c'è.

---

## 4. Scontrini

### Backend — già scritto
Bucket privato `receipts` (5 MB, jpeg/png/webp/heic/pdf), colonna `receipt_path` su `spese` e `spese_personali`, policy Storage basate sulla prima cartella del percorso (`<group_id|user_id>/…`).

### Frontend

**`src/services/receiptService.ts`**
```ts
upload(file, { scope, ownerId, spesaId })   // comprime lato client, poi storage.upload
signedUrl(path, seconds = 3600)             // il bucket è privato: sempre URL firmata
remove(path)
```
Comprimere prima di caricare (`canvas`, lato lungo 1600 px, qualità 0.8): una foto da 4 MB diventa ~200 KB e il limite del bucket non si tocca mai.

**Innesti**
- `/spese/nuova` e `EditExpenseModal`: chip «Scontrino» con `<input type="file" accept="image/*" capture="environment">`, anteprima e rimozione;
- riga movimento in `/spese`: una piccola icona `Paperclip` quando `receipt_path` è valorizzato;
- visualizzatore: riuso di `Modal` con l'immagine a URL firmata e il link «Scarica».

**Stimato**: 1 service, 1 componente, 3 innesti. ~1 giornata.
**✅ Fatto il 17/09.**

---

## Ordine seguito

Quello consigliato qui: Budget → Quote e conguagli → Obiettivi → Scontrini, più la modalità Semplice in coda. Tutti e cinque completati il 17/09/2026.

Le stime di questo documento sommavano **5 giornate**; il lavoro effettivo è stato circa **una giornata**, ma senza collaudo a schermo — che non si può fare prima di applicare le migrazioni, ed è la parte che di solito fa emergere il resto.

Stato aggiornato e note operative: **`STATO.md`**. Come applicare: **`DB-APPLICAZIONE.md`**.

## Verifiche da fare dopo ogni migrazione

- [ ] Le policy RLS nuove non entrano in conflitto con quelle esistenti (provare con due utenti di gruppi diversi).
- [ ] `current_group_id()` restituisce il valore atteso per un utente senza gruppo (`null` → nessuna riga visibile, non tutte).
- [ ] `get_budget_status` e `get_settlement` girano come `security invoker`: l'utente vede solo ciò che le policy su `spese` gli concedono.
- [ ] `run_auto_contributions` è pianificata una volta al giorno e non due.
- [ ] Il bucket `receipts` è privato (`public = false`) e nessuna URL pubblica finisce nel client.
