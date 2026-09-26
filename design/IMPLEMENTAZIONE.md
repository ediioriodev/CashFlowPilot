# Direzione A — cosa è stato implementato

> Per il punto di ripresa a inizio sessione leggi prima **`STATO.md`**.

Applicata la **Direzione A in modalità Avanzata** su tutta l'app.
Build verde: `npm run build` → 17 route. `tsc --noEmit` pulito. ESLint pulito su tutti i file toccati.

> Le dipendenze non erano installate: ho eseguito `npm install` per poter compilare e verificare.

---

## 1. Fondamenta

| File | Cosa cambia |
|---|---|
| `src/app/globals.css` | **Design token** semantici (superfici, testo, accento, pos/neg/warn, raggi, ombre) per chiaro e scuro, mappati su Tailwind v4 con `@theme inline` → utility `bg-surface`, `text-muted`, `border-line`, `rounded-card`… Focus ring globale, `prefers-reduced-motion`, skeleton, `.tnum` per i numeri tabulari. |
| `src/app/layout.tsx` | **Zoom riabilitato** (rimossi `userScalable:false` e `maximumScale`), script inline che applica il tema **prima della prima pittura**, `viewportFit: cover`, `themeColor` per tema. |
| `src/context/ThemeContext.tsx` | Non ritorna più `null`: niente schermo bianco all'avvio. Il tema vive nel DOM e React lo legge con `useSyncExternalStore`. |
| `src/context/PeriodContext.tsx` | **Nuovo.** L'unico selettore di periodo dell'app: prima ce n'erano tre implementazioni diverse e i totali non tornavano fra le pagine. |
| `src/lib/finance.ts` | **Nuovo.** Il modello reale/previsto in un posto solo: `buildOverview()` calcola saldo reale, impegnato, libero, serie cumulata, ritmo settimanale, categorie, negozi. |
| `src/hooks/usePeriodExpenses.ts` | **Nuovo.** Una sola fetch per periodo+portafoglio, race-safe. |

## 2. Vocabolario grafico — `src/components/ui/charts.tsx`

Cinque forme SVG, nessuna immagine, tutti i colori dai token:
**`Gauge`** (arco 270°, il numero al centro) · **`Ring`** · **`Bars`** · **`AreaTrend`** · **`StackBar`** · **`ProgressTrack`** (con la tacca «dove dovresti essere oggi»).

Convenzione unica: **pieno = reale, tratteggiato = previsto**. Vale per gauge, barre e linea.

## 3. Primitive — `src/components/ui/kit.tsx`

`Card` · `Button` · `IconButton` (aria-label obbligatoria, 44px) · `Pill` · `SegTabs` · `Chip` · `Toggle` · `Field` (label, errore, testo di aiuto) · `Skeleton` · `EmptyState` · `Avatar`/`AvatarStack` · `CatRow` · **`Modal`** con ESC, click sul fondo, focus trap e ripristino del focus.

## 4. Navigazione

- **Mobile**: `Oggi · Movimenti · (+) · Analisi · Altro` — icona **e** testo, target 48px, safe-area. Il `+` è un'azione, non una tab.
- **Desktop ≥1024px**: sidebar persistente con sei destinazioni + secondarie sotto separatore; contenuto su due colonne (`PageBody`).
- **`/altro`**: nuova pagina che raccoglie ciò che non sta nella barra.
- `PageHeader` dice sempre dove sei; il «torna indietro» è **gerarchico** (`backHref`), non `router.back()`.
- Lo switch portafoglio è sempre visibile, con **icona + nome**: non più due blu indistinguibili.

## 5. Pagine

| Route | Stato |
|---|---|
| `/` **Oggi** | Riscritta. Gauge «Puoi spendere», legenda a 3 voci, tre tile, da confermare con conferma in linea, andamento, ritmo settimanale, fine periodo, categorie. Modale «Come si calcola» con il conto passo passo. |
| `/spese` **Movimenti** | Riscritta. Ricerca, chip dei filtri **sempre visibili**, barre settimanali, raggruppamento per giorno, avatar di chi ha pagato, conferma in linea, eliminazione con **Annulla**. |
| `/spese/nuova` | Riscritta. `inputMode="decimal"` con virgola accettata, validazione al blur, **focus sul primo campo non valido**, chip categorie recenti, chi ha pagato, Oggi/Ieri, ricorrenza con disclosure, «Salva e aggiungine un'altra». |
| `/spese/[id]` | Riscritta sui token. |
| `/analisi` | Riscritta. Totale + ritmo, composizione (`StackBar` + `CatRow`), **tabella alternativa** per screen reader, drill-down categoria in modale, top negozi. |
| `/report` | Riscritta. Recharts ora entra solo qui e solo lato client (`next/dynamic`), con i colori presi dai token. |
| `/famiglia` | **Nuova.** Chi ha anticipato (barre + quota equa), conguaglio con trasferimenti minimi, membri, fisse condivise. |
| `/ricorrenti` | **Nuova.** Fisse e abbonamenti: quanto costano **all'anno**, peso sulle uscite, più care, entrate ricorrenti. |
| `/altro` | **Nuova.** |
| `/budget` · `/budget/[categoria]` | **Nuove (17/09).** Vedi §9. |
| `/obiettivi` | **Nuova (17/09).** Vedi §11. |
| `/promemoria` · `/impostazioni` · `/account` · `/inviti` · `/login` · `/register` · `/reset-password` | Riportate sui token e sulla nuova struttura. |

## 6. Moduli nuovi senza toccare il database

| Modulo | Come |
|---|---|
| **Famiglia** | `src/services/familyService.ts`: legge `spese.user_id` + `users_group`, calcola quota equa e **trasferimenti minimi** (greedy debitori→creditori). |
| **Fisse e abbonamenti** | `src/services/recurringService.ts`: legge `spese.is_recurring_parent` + `recurring_config`, normalizza ogni cadenza a costo mensile e annuale. |

## 6-bis. Fondo comune — **in produzione dal 16/09/2026**

Nel portafoglio condiviso «Chi ha pagato» ha come **voce predefinita il nome del gruppo**: la spesa è uscita dal fondo comune e non crea debiti. In alternativa si sceglie il membro che ha anticipato, e quella spesa entra nel conguaglio.

- Migrazione `20260101000250_paid_by.sql` **applicata e verificata**: `spese.paid_by`, `NULL` = fondo comune.
- `get_spese_condivise` usa `to_jsonb(s)`, quindi la colonna è arrivata al frontend senza modificare la funzione.
- Componente `src/components/expenses/PayerPicker.tsx`, usato in `/spese/nuova` e nella modale di modifica.
- `/famiglia` separa fondo comune e anticipi: il conguaglio si calcola solo sugli anticipi.
- Elenco movimenti: avatar per chi ha anticipato, icona portafoglio per il fondo comune, filtro «Chi ha pagato» con la voce del gruppo.
- Salvaguardia: se `paid_by` non arriva dalla lettura, la modale **non lo riscrive** — evita di azzerare un anticipo reale senza che l'utente abbia toccato niente.

## 7. Correzioni non cosmetiche

- `MultiSelect` usava classi **shadcn inesistenti** in questo progetto (`bg-background`, `text-muted-foreground`, `bg-primary`): bordi e testo erano di fatto invisibili. Riscritto sui token, con tastiera ed ESC.
- `ConfirmModal` chiudeva il dialogo **prima** che l'operazione async finisse e non aveva stato di caricamento. Ora attende la promise.
- I grafici usavano `stroke="var(--…)"` come attributo di presentazione (non risolto in modo affidabile da Chrome): ora `style={{ stroke: … }}`.
- Contrasti: `text-gray-400` su bianco valeva 2.85:1. I token `muted`/`faint` stanno a 8.0:1 e 5.0:1 in chiaro, 7.5:1 e 5.1:1 in scuro.
- `Header.tsx` e `ScopeToggle.tsx` eliminati (sostituiti da `AppShell` e `ScopeSwitch`).
- `usePeriodExpenses` continuava a caricare dopo il logout: `getExpenses` rispondeva «User not authenticated». Ora il hook esce subito quando la sessione non c'è più.
- `supabaseClient.ts`: l'errore per variabili mancanti ora dice quali mancano e cosa fare; aggiunto `.env.example`.


---

# I moduli che richiedono tabelle nuove — 17/09/2026

Sono i quattro moduli di `SPEC-MODULI-NUOVI.md`, più la modalità Semplice.
**Il frontend è scritto e compilato; il database no**: le migrazioni vanno applicate a mano (`DB-APPLICAZIONE.md`).

## 8. Il codice non aspetta il database

`src/lib/moduleState.ts` riconosce «questa cosa non esiste ancora» e la distingue da «qualcosa è andato storto»: codici Postgres (`42P01`, `42883`, `42703`) e codici PostgREST (`PGRST202`, `PGRST205`, che arrivano dalla cache dello schema e non sono errori Postgres).

Ogni lettura torna un `ModuleResult<T>`: `{ data, needsMigration, error }`. La pagina che riceve `needsMigration` mostra `MigrationNotice` — un riquadro che dice quale file applicare — invece di un errore o di una schermata vuota che sembra un guasto.

Non è una comodità di sviluppo: è il modo in cui l'app resta usabile su un ambiente che verrà migrato più tardi, o da un altro computer.

## 9. Budget a buste

| File | Cosa fa |
|---|---|
| `src/services/budgetService.ts` | `getStatus` · `getOne` · `upsert` · `remove`, soglie *ok / attenzione / superato* (85% e 100%) |
| `src/app/budget/page.tsx` | Anello totale, `ProgressTrack` con la tacca «dove dovresti essere», griglia di buste, elenco in riga, categorie senza tetto |
| `src/app/budget/[categoria]/page.tsx` | Il dettaglio si apre: `Gauge` della categoria, ritmo settimanale, movimenti raggruppati per giorno, i conti della busta |

**Innesti**: tile «Budget» in home (compare solo se ci sono buste, altrimenti resta «Speso»); nel form, mentre scegli la categoria, un anello dice quanto resta in quella busta; `nav.ts` porta Budget nella barra in basso al posto di Analisi.

**Due cose sono finite sul database** invece che nel client, e non per eleganza:

- `set_budget()` / `clear_budget()` — cambiare un tetto è *chiudi la versione in corso, aprine una nuova*. Dal client, fra i due passi, l'indice unico parziale lascia la categoria **senza tetto attivo**: se la seconda chiamata fallisce, il budget è sparito.
- La regola di versionamento. Due versioni che coprono lo stesso periodo facevano comparire **la stessa busta due volte** in `get_budget_status`. Ora: versione nata in questo periodo → aggiornata in place; versione più vecchia → chiusa il giorno prima dell'inizio del periodo. `p_period_start` arriva dal client perché con i periodi personalizzati non è il primo del mese.

## 10. Quote personalizzate e conguagli chiusi

`familyService` passa da «query + calcolo locale» a `get_settlement` + `get_settlement_totals`, **mantenendo il calcolo locale come fallback**: senza le tabelle nuove il conguaglio continua a funzionare in parti uguali, com'era prima.

- `SplitEditor` — parti uguali · a metà · per percentuale · tutta a uno. Ripartisce al centesimo (l'ultimo prende il resto), e scrive su `expense_splits` **solo** se diverso da parti uguali. Compare solo sugli anticipi: dividere una spesa del fondo comune non cambierebbe niente, perché non entra nel conguaglio.
- **«Segna come saldato»**: la specifica diceva che il pulsante esisteva ma non faceva niente. In realtà **non esisteva affatto**. Ora c'è, chiude il periodo su `settlements`, e le spese di quel periodo escono dai conguagli successivi.
- Storico dei conguagli chiusi, con riapertura riservata all'amministratore del gruppo.

Quote e scontrino sono accessori rispetto al movimento: se falliscono, la spesa resta salvata e l'app lo dice, invece di far fallire tutto il salvataggio.

## 11. Obiettivi di risparmio

`src/services/goalService.ts` + `src/app/obiettivi/page.tsx`: versamenti e prelievi, accantonamento automatico, crescita mese per mese, otto icone da un insieme chiuso (così il nome salvato corrisponde sempre a qualcosa di disegnabile).

**Il punto che rende il modulo utile invece che decorativo** è una riga in `src/lib/finance.ts`:

```ts
const libero = saldoReale - impegnato - Math.max(0, accantonato);
```

I soldi messi da parte sono ancora sul conto ma non sono più spendibili. `usePeriodExpenses` carica l'accantonato **insieme** ai movimenti — in serie avrebbe fatto lampeggiare «Puoi spendere» con due valori diversi — e in home l'accantonato compare come quarto segmento del tachimetro, come voce di legenda e come riga nel modale «Come si calcola».

Il saldo di un obiettivo non è una colonna: è la somma dei versamenti, letta dalla vista `goals_progress`. Una colonna si disallinea alla prima modifica fatta fuori dall'app.

## 12. Scontrini

`src/services/receiptService.ts` + `ReceiptPicker` / `ReceiptViewer`, innestati nel form, nella modale di modifica e come graffetta nell'elenco movimenti.

- **Si comprime prima di caricare** (canvas, lato lungo 1600, qualità 0.8): una foto da 4 MB diventa ~200 KB e il limite di 5 MB del bucket non si tocca mai. Se la compressione fallisce — HEIC che il browser non sa decodificare, canvas non disponibile — si carica **l'originale**: meglio qualche megabyte in più che perdere lo scontrino. Se il risultato è più grande dell'originale, si tiene l'originale.
- **Il bucket è privato**: solo URL firmate a tempo, richieste a ogni apertura e mai conservate. Nessun link pubblico esiste.
- `uploadAndAttach` rimuove il file caricato se il collegamento alla spesa fallisce: senza, ogni salvataggio andato male lascerebbe un orfano nel bucket.
- Le immagini usano `<img>` e non `next/image`: le URL firmate non devono passare dall'ottimizzatore di Next, che le proxerebbe attraverso il server.

## 13. Modalità Semplice

Attributo `data-mode` sulla radice, due classi `.simple-only` / `.adv-only`, e basta. Stesso markup, stesse posizioni, stessi nomi: cambia **quanto** si vede, mai **dove** si trova.

`ModeContext` segue lo stesso schema del tema: la verità sta nel DOM, messa dallo script inline di `layout.tsx` **prima della prima pittura**, e React la legge con `useSyncExternalStore`. Senza, i blocchi da Avanzata comparirebbero per un istante e poi sparirebbero.

Interruttore nella sidebar (desktop) e in «Altro» (mobile). Cosa sparisce in Semplice: ritmo settimanale e conti di fine periodo in Oggi, elenco dettagliato e categorie senza tetto in Budget, crescita del risparmio in Obiettivi, membri e fisse condivise in Famiglia, top negozi in Analisi, subtotali giornalieri in Movimenti.

**Due deviazioni volute** da `DIREZIONE-A §4`, entrambe annotate in `STATO.md §8`: la tabella dati in Analisi resta sempre visibile (è l'alternativa testuale per gli screen reader) e il selettore di periodo resta visibile in Movimenti (è navigazione condivisa: nasconderlo su una sola pagina sposterebbe il «dove si trova»).

**Il default è Avanzata**, non Semplice come dice la specifica: è quello che l'app ha sempre mostrato, e passare a Semplice avrebbe fatto sparire blocchi a chi già li usa. È una delle decisioni aperte in `DIREZIONE-A §10` e si cambia con una costante.

## 14. Correzioni al SQL, fatte prima di applicarlo

1. **`get_settlement` inventava debiti retroattivi.** Faceva `coalesce(s.paid_by, s.user_id)`: con `paid_by NULL` — che significa *fondo comune* — ricadeva su «chi ha inserito la spesa». Siccome tutte le spese anteriori al 16/09 hanno `paid_by NULL`, avrebbe attribuito mesi di spesa comune a chi le aveva battute a tastiera. Ora considera solo gli anticipi.
2. **Aggiunta `get_settlement_totals()`**: totale del periodo, quota da fondo comune, quota anticipata.
3. **Aggiunte `set_budget()` e `clear_budget()`** per i motivi al §9.

## 15. Verifica

```
tsc --noEmit            pulito (dopo aver azzerato .next e tsbuildinfo)
npm run build           20/20 route  (erano 17: +/budget, +/budget/[categoria], +/obiettivi)
eslint (file toccati)   pulito
```

Restano i warning ESLint preesistenti in `src/services/*`, `src/app/inviti`, `src/app/register`, `src/components/DebugLog.tsx`: non introdotti qui e non toccati.

⚠️ La build va lanciata **da PowerShell**: sotto Git Bash la conversione dei percorsi MSYS manda in confusione webpack e fallisce senza che ci sia niente di rotto.

**Collaudo a schermo: non ancora fatto** per i moduli nuovi, e non si può fare prima di applicare le migrazioni. La lista di cosa provare è in `STATO.md §7`, priorità 2.
