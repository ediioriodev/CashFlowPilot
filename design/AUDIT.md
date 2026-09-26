# Cash Flow Pilot — Audit UI/UX del frontend attuale

Revisione completa di `src/` (Next.js 16 · React 19 · Tailwind 4 · PWA).
Perimetro: 15 pagine, 13 componenti, 3 context. Riferimenti a file e riga sono verificati sul codice attuale.

---

## 1. Diagnosi in una riga

Il frontend non è "brutto" per mancanza di cura estetica: è **grezzo perché non ha un sistema**.
Non esistono design token, il modello concettuale centrale dell'app (*reale vs previsto*) è chiamato in quattro modi diversi in quattro schermate, e la navigazione è progettata solo per il telefono. Il risultato è che ogni pagina sembra scritta da una persona diversa e l'utente non ha mai una risposta chiara alla domanda **"quanto ho davvero?"**.

---

## 2. Architettura dell'informazione e navigazione

### 2.1 La home è un menu, non una dashboard — `src/app/page.tsx:143`
La griglia di 5 scorciatoie (Nuova, Storico, Analisi, Report, Promemoria) replica **esattamente** le 5 voci della bottom nav (`BottomNav.tsx:10-16`). Lo spazio più prezioso dell'app viene speso per duplicare una barra già sempre visibile, invece di rispondere a "cosa devo fare oggi".

### 2.2 Bottom nav senza etichette — `BottomNav.tsx:52-66`
Cinque icone senza testo. Regola `nav-label-icon`: le voci di navigazione devono avere icona **e** etichetta. Inoltre `p-2` su un'icona da 24px dà un target di ~40px, sotto i 44pt di minimo.
"Nuova" è un'**azione**, non una destinazione di primo livello: non dovrebbe essere una tab (`bottom-nav-top-level`).

### 2.3 Header sovraccarico — `Header.tsx:39-62`
In 64px di altezza convivono: back/logo, ScopeToggle centrato in `position:absolute`, pulsante Home e menu utente. Su 375px il toggle centrato finisce a ridosso del blocco `w-24` di sinistra. Manca invece la cosa più utile: **il titolo della pagina corrente**.

### 2.4 Back basato sulla cronologia — `Header.tsx:52`
`router.back()` segue la history, non la gerarchia. Aprendo l'app da un deep link o da una notifica push il "torna indietro" porta fuori dall'app.

### 2.5 Nessun layout desktop — `layout.tsx:52`
A 1440px si vede una bottom bar da telefono e una colonna `max-w-2xl` centrata. L'app "web" è un telefono ingrandito. Regola `adaptive-navigation`: da 1024px serve una sidebar persistente.

---

## 3. Modello concettuale: reale vs previsto

È il cuore del prodotto, ed è il punto più debole.

| Schermata | Come si chiama il saldo confermato | Come si chiama la proiezione |
|---|---|---|
| Home (`page.tsx:190`) | "Bilancio Attuale" | "Fine Mese (Previsto)" |
| Storico (`spese/page.tsx:226`) | "SALDO CONFERMATO" / "FINO AD OGGI" | "PREVISIONE TOTALE" |
| Analisi (`analisi/page.tsx:390`) | "Saldo Attuale" | "Previsto (Fine Mese)" |
| Report (`StatsCards.tsx:37`) | "Saldo Periodo" | *assente* |

Quattro lessici, nessuna spiegazione, nessun onboarding. L'utente non può sapere perché i numeri cambiano passando da una pagina all'altra.

### 3.1 Il doppio donut annidato — `page.tsx:236-291` e `analisi/page.tsx:~410`
Anello interno = reale, anello esterno = previsto. Senza legenda, senza etichette, senza indicazione di cosa rappresenti ciascun anello.
Peggio: **entrate e uscite non sono parti di un tutto**, quindi la torta è il grafico sbagliato (`chart-type`). Non esiste alternativa tabellare né descrizione per screen reader.

### 3.2 Selettore di periodo duplicato e incoerente
`spese/page.tsx:250-340` e `analisi/page.tsx:250-330` contengono circa **130 righe di navigatore periodo praticamente identiche**. La home non ha nessun selettore (calcola il periodo internamente), Report usa preset (`last30`). Quattro pagine, tre logiche di periodo diverse: i totali non tornano e l'utente non capisce perché.

### 3.3 Impostazioni rilette a ogni cambio di scope
`userService.getSettings()` viene richiamato in `page.tsx:76`, `spese/page.tsx:45` e `analisi/page.tsx:53` per ottenere lo stesso `custom_period_*`. Tre chiamate identiche che appartengono al context.

---

## 4. Sistema visivo (o assenza di)

### 4.1 Nessun design token — `globals.css`
Il file definisce solo `--background` e `--foreground`. Tutto il resto è classi Tailwind ripetute a mano in ogni pagina. Conseguenze visibili:

- **Superfici incoerenti in dark**: le pagine usano `dark:bg-gray-900`, ma `Header`, `BottomNav` e i componenti di `reports/` usano `dark:bg-gray-800`. Due livelli di elevazione diversi per la stessa gerarchia.
- **Raggi a caso**: `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full` senza regola.
- `body { font-family: Arial, Helvetica }` a `globals.css:31` è codice morto e fuorviante: la classe di `next/font` su `<body>` vince per specificità, quindi il font reale è Inter. Va rimosso.

### 4.2 Tre palette diverse in tre schermate
| Dove | Colori |
|---|---|
| Home menu (`page.tsx:143-149`) | blue-600, emerald-600, purple-600, orange-500, yellow-500 — **decorativi, senza significato** |
| Analisi (`analisi/page.tsx:17`) | `#0088FE #00C49F #FFBB28 #FF8042 #8884d8` — palette di default di Recharts |
| Report (`BreakdownChart.tsx:14`) | `#3b82f6 #10b981 #f59e0b …` — un terzo set |

### 4.3 Il segnale più importante è invisibile
Portafoglio Condiviso = `blue-600` (#2563eb), Personale = `indigo-600` (#4f46e5). Due blu praticamente identici. Il rinforzo di sfondo è `bg-gray-50/90` contro `bg-gray-50`: una differenza di opacità del 10% su un grigio chiarissimo, cioè nulla. Viola `color-not-only`: l'informazione "di chi sono questi soldi" è affidata solo al colore, e a un colore impercettibile.

### 4.4 Scala tipografica non sistematica
Da `text-[10px]` a `text-3xl` senza scala. Le etichette `text-[10px] uppercase font-bold` in grigio (usate in home, storico e analisi) sono sotto la soglia di leggibilità: dimensione minima, tracking allargato e contrasto basso insieme.

---

## 5. Accessibilità

| Gravità | Problema | Dove |
|---|---|---|
| **Critico** | `userScalable:false` + `maximumScale:1` disabilitano il pinch-zoom | `layout.tsx:28-29` |
| **Critico** | `text-gray-400` su bianco = **2.85:1** (minimo 4.5:1). Usato per date, note, empty state, etichette "Previsto", voci inattive della nav | diffuso |
| **Critico** | Bottom nav: link icon-only, target ~40px | `BottomNav.tsx:52` |
| Alto | `focus:outline-none` senza `focus-visible:ring` su tutti gli input di `spese/nuova` e sui bottoni icona | `spese/nuova/page.tsx` |
| Alto | Modali senza ESC, senza chiusura sul backdrop, senza focus trap né restituzione del focus | `ConfirmModal.tsx`, modale dettaglio in `analisi` |
| Medio | Nessun `prefers-reduced-motion`; presenti `animate-in` e `transition-all duration-500` a schermo intero | diffuso |
| Medio | Grafici senza alternativa testuale/tabellare e senza tooltip raggiungibile da tastiera | `page.tsx`, `analisi`, `reports/*` |
| Medio | `ThemeProvider` ritorna `null` fino al mount: schermo bianco a ogni avvio, login incluso | `ThemeContext.tsx:82` |

---

## 6. Form e feedback

- **Validazione silenziosa** — `spese/nuova/page.tsx:57`: `if (!importo || !ambito) return;` non mostra nulla. Nessun errore, nessun focus sul campo mancante.
- **Tastiera sbagliata** — `spese/nuova/page.tsx:126`: `type="number"` con `importo.replace(',', '.')` nel submit. Con `type=number` la virgola non arriva mai al codice. Manca `inputmode="decimal"`.
- **Conferma che si chiude troppo presto** — `ConfirmModal.tsx:44`: `onConfirm(); onClose();` sincroni. Il modale sparisce mentre la chiamata è ancora in volo; il bottone non ha stato di caricamento.
- **Nessun undo** dopo l'eliminazione, benché `sonner` lo supporti nativamente con `toast(msg, { action })`.
- **Dopo il salvataggio** resti sulla stessa pagina con un solo toast: nessun link al movimento creato, nessuna conferma visiva nel contesto.
- **Loading testuali** — `spese/page.tsx:436`, `analisi`: "Caricamento..." grigio al posto del contenuto, con salto di layout all'arrivo dei dati.
- **Filtri senza riepilogo** — `spese/page.tsx:395`: quattro MultiSelect impilati in un pannello a scomparsa; chiuso il pannello resta solo un badge numerico.
- **Toast in `top-right`** — `layout.tsx:59`: su mobile copre header e azioni.

---

## 7. Performance

- **Recharts in 4 pagine senza `next/dynamic`**: la libreria entra nel bundle iniziale di una PWA.
- `transition-colors duration-500` su un `div` `min-h-screen` (`page.tsx:165`): anima il background di tutto lo schermo, proprietà non compositabile.
- Lista movimenti non paginata né virtualizzata: renderizza tutte le transazioni del periodo.
- `ThemeProvider` che ritorna `null` costa LCP.

---

## 8. Le due direzioni proposte

Entrambe risolvono gli **stessi** problemi strutturali. Differiscono per personalità, densità e composizione della dashboard.

### Direzione A — "Ledger"
Chiara, editoriale, orientata alla lettura dei dati. Navy profondo come accento, superfici bianche su carta calda, bordi sottili al posto delle ombre, numeri tabulari ovunque. Composizione a due colonne su desktop, elenchi densi, molte etichette esplicite.
**Adatta se**: l'uso prevalente è consultare e controllare, anche da desktop, con dati fitti.

### Direzione B — "Flow"
Scura, bento, consumer. Verde menta come accento, card ampie con raggi grandi, numeri molto grandi, tile a griglia, FAB centrale, form a due passi con importi rapidi.
**Adatta se**: l'uso prevalente è mobile e rapido — segna una spesa in dieci secondi, guarda "quanto mi resta".

### Cosa cambia in entrambe rispetto a oggi

| Problema attuale | Soluzione nei mockup |
|---|---|
| Home = menu duplicato | Home = saldo reale, barra reale/previsto, movimenti da confermare, andamento, categorie |
| 4 nomi per reale/previsto | Un solo lessico: **Reale** (pieno) e **Previsto** (tratteggiato), stesso ordine ovunque |
| Doppio donut senza legenda | Barre di avanzamento reale/previsto + linea cumulata con proiezione tratteggiata + tabella alternativa |
| 3 selettori di periodo | Un solo `PeriodBar` riusato, periodo condiviso tra le pagine |
| Scope = due blu uguali | Switch con icona + nome del portafoglio, sempre visibile, stato attivo pieno |
| Nav icon-only da 40px | 4 destinazioni con etichetta, target 48px, azione "nuovo" su FAB |
| Nessun desktop | Sidebar persistente + contenuto a due colonne da 1024px |
| Filtri nascosti | Chip dei filtri attivi sempre visibili e rimovibili |
| Ricorrenze poco chiare | Callout esplicito: "restano previste finché non le confermi" |

---

## 9. Ordine di intervento consigliato

**Fase 1 — fondamenta (nessun cambiamento visibile, sblocca tutto il resto)**
1. Token semantici in `globals.css` per chiaro e scuro (surface, border, text, muted, accent, positive, negative, warning) + scala di spazio e raggio.
2. Rimuovere `userScalable:false` e `maximumScale:1`; rimuovere `font-family: Arial` da `globals.css`.
3. Anello di focus globale su ogni elemento interattivo.
4. Applicare i token alle superfici: una sola scala di elevazione per chiaro e scuro.

**Fase 2 — modello concettuale**
5. `PeriodProvider` + componente `PeriodBar` unico; eliminare le due copie da 130 righe.
6. Lessico unico Reale/Previsto e codifica visiva costante (pieno / tratteggiato).
7. Sostituire i donut con barre di avanzamento + linea cumulata; aggiungere tabella alternativa.

**Fase 3 — navigazione**
8. Bottom nav a 4 voci con etichette + FAB; back gerarchico invece di `router.back()`.
9. Sidebar desktop da 1024px, header con titolo di pagina.
10. Scope switch con icona + nome, sempre visibile.

**Fase 4 — flussi**
11. Home ricostruita come dashboard (saldo, da confermare, andamento, categorie).
12. Form nuovo movimento: `inputmode="decimal"`, validazione al blur, errore sotto il campo, focus sul primo campo non valido.
13. Modali con `<dialog>`, ESC e backdrop; conferme con stato pending; undo nei toast.
14. Skeleton al posto di "Caricamento..."; chip dei filtri attivi.

**Fase 5 — rifiniture**
15. `next/dynamic` sui grafici; `prefers-reduced-motion`; toast top-center su mobile; onboarding al primo accesso.

---

## 10. Nota sullo strumento di ricerca del skill

Il CLI `scripts/search.py` di `ui-ux-pro-max` non è stato eseguibile: **Python non è installato** su questa macchina (`python`/`python3` risolvono all'alias del Microsoft Store). Come previsto dal skill, l'analisi è stata condotta sulla Quick Reference delle 10 categorie di regole, senza installare nulla.
Per abilitare le ricerche mirate in futuro basta installare Python 3 da python.org.
