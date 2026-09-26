# design/ — Progettazione e stato del frontend

> **La Direzione A è implementata in app, in entrambe le modalità.** I mockup restano come riferimento e come laboratorio per le decisioni ancora aperte.
> Punto di ripresa a inizio sessione: **[STATO.md](STATO.md)**.
> Il giro **[PRE-RILASCIO.md](PRE-RILASCIO.md)** (verifiche) → **[DB-APPLICAZIONE.md](DB-APPLICAZIONE.md)** (deploy) → collaudo è **concluso**: verifiche e deploy il 19/09, collaudo ([COLLAUDO.md](COLLAUDO.md)) e revisione ([REVISIONE.md](REVISIONE.md)) passati il 26/09. Le migrazioni sono tutte applicate. Cosa resta: [STATO.md](STATO.md) §1.

| File | Cosa contiene |
|---|---|
| **`STATO.md`** | **Punto di ripresa**: cosa è fatto, cosa manca, note operative. Da leggere per primo. |
| **`RLS-BASELINE.md`** | **Esito dei controlli del 19/09 e unica copia delle policy RLS attive**, più la baseline degli advisor per il confronto dopo il deploy. |
| `PRE-RILASCIO.md` | La procedura dei controlli sul database, via MCP e in sola lettura. Eseguita il 19/09; da rifare prima di ogni nuovo passaggio. |
| **`DB-APPLICAZIONE.md`** | Come applicare le migrazioni: a mano, con il CLI o via MCP. |
| **`COLLAUDO.md`** | **I sei casi di collaudo a schermo** (OP-021), con l'esito atteso e cosa significa se non torna. |
| **`REVISIONE.md`** | **Registro dei rilievi della revisione** (OP-021 + OP-032), chiusa il 26/09 in due giri: rilievi, cause, correzioni e prove. |
| `IMPLEMENTAZIONE.md` | Dettaglio di cosa è stato riscritto in app e perché. |
| `SPEC-MODULI-NUOVI.md` | Specifica dei moduli che richiedono nuove tabelle. Implementata il 17/09. |
| **`mockups.html`** | Il laboratorio interattivo: mockup navigabili, editor dei token, valutazione ed export. |
| `DIREZIONE-A.md` | La specifica della direzione scelta: vocabolario grafico, formule, funzioni, ordine di costruzione. |
| `AUDIT.md` | I 23 problemi del frontend **originale**, con file, riga e correzione. Riferimento storico: sono stati risolti. |

Per i mockup: doppio clic su `mockups.html`. Funziona offline, non serve build né server.
Se lo avevi già aperto, ricarica con **Ctrl+Shift+R**.

---

## Direzione A — due regole

**Una domanda per schermata. Massimo tre blocchi a colpo d'occhio.**

Tutto il resto è grafica — un disegno si legge più in fretta di una tabella — oppure sta **dietro un tocco**.

| Schermata | Risponde a | Blocchi in Semplice |
|---|---|---|
| Oggi | Quanto posso ancora spendere? | **3** |
| Movimenti | Dove sono finiti i soldi? | 2 |
| Nuova spesa | *(form)* | 1 |
| Budget | Rispetto i tetti che mi sono dato? | 2 |
| **Dettaglio busta** | *(si apre toccando una busta)* | 3 |
| Obiettivi | A che punto sono con i risparmi? | 3 |
| Famiglia | Chi ha pagato, e chi deve a chi? | 2 |
| Analisi | Come sta andando rispetto al solito? | 3 |

### La home

Tre blocchi, e basta:

1. **Il tachimetro** — un arco a 270° diviso in *speso* (rosso), *impegnato* (tratteggiato), *libero* (pieno). Al centro il numero: **Puoi spendere 353,91 €**. Sotto, i tre importi su una riga. Una riga di contesto: *≈ 22,12 € al giorno · restano 16 giorni*. Un link *Come si calcola*.
2. **Tre porte** — Budget (anello 56%), Da confermare (3), Obiettivi (anello 22%). Solo l'essenziale: il dettaglio si apre.
3. **L'andamento** — la linea del saldo, piena fino a oggi e tratteggiata da lì in poi.

Niente paragrafi, niente liste di frasi, niente elenchi di categorie. Quelli stanno nelle pagine dedicate.

### Il vocabolario grafico

Cinque forme, sempre le stesse, tutte SVG:

**tachimetro** (come si divide il mese) · **anello** (una percentuale) · **barre settimanali** (il ritmo) · **barra impilata** (la composizione) · **riga compatta** (icona · nome · barretta · importo).

Una sola convenzione da imparare, e si impara guardando: **pieno = reale, tratteggiato = previsto.**

### Semplice / Avanzata

L'interruttore in alto **non è un comando del laboratorio**: è una funzione dell'app.
✅ **In app ci sono entrambe le modalità** dal 17/09: `data-mode` sulla radice più le classi `.simple-only` / `.adv-only`, interruttore nella sidebar e in «Altro».
✅ **Dal 19/09 il default è Semplice**, come dice la specifica. È stato possibile solo dopo aver scritto `view_mode = 'advanced'` sugli utenti già esistenti: così il cambio riguarda chi arriva da ora, e non toglie blocchi a chi li usava.
✅ **La scelta segue l'account**, non il dispositivo (colonna `users_group.view_mode`). `localStorage` resta come copia locale, per dipingere la schermata giusta prima che risponda il database.

Cambia *quanto* si vede, mai *dove* si trova.

- **Semplice** (default) — il disegno e il numero. Per chi apre l'app per capirci qualcosa.
- **Avanzata** — compaiono ritmi settimanali, proiezioni, tabelle, confronti, ruoli. Per chi il budget lo gestisce già.

### Il dettaglio si apre

La schermata **Dettaglio busta** è l'esempio del principio: in *Budget* vedi sei anelli con nome e residuo; tocchi "Spesa" e si apre la pagina con tachimetro della categoria, ritmo settimanale, le sei spese e il confronto con i mesi precedenti.

---

## Funzioni da app di casa

- **Budget a buste** con la tacca "dove dovresti essere oggi" e stati *In linea / Quasi finito / Superato* (icona + parola, mai solo colore).
- **Obiettivi** con accantonamento automatico; i soldi messi da parte escono dal disponibile.
- **Chi ha pagato** su ogni movimento, **conguaglio** grafico (`LU → 361,83 € → EM`), ruoli limitati per i figli.
- **Abbonamenti**: 1.079,64 € *all'anno* — la cifra annuale fa un effetto che quella mensile non fa.
- **Scontrino** e **Dividi in 3** nel form; mentre scegli la categoria un anello mostra quanto budget resta.

---

## Direzione B — "Flow"

Resta per confronto (4 schermate): scura, bento, consumer, accento verde menta. Serve a valutare se la personalità di A è quella giusta.

---

## I tre pannelli a destra

**Token** — accento, colori entrate/uscite, raggio, densità, tipografia, dal vivo. In fondo il CSS generato per `globals.css`.

**Valutazione** — voto 1-5 per schermata, tag, note. Usalo per le decisioni ancora aperte in `DIREZIONE-A.md §10`.

**Audit** — i 23 problemi del codice attuale, filtrabili per gravità o per schermata.

**Esporta valutazione** scarica un `.md` con voti, note, token, modalità valutata e audit.

## Scorciatoie

| Tasto | Azione |
|---|---|
| `A` / `B` | Cambia direzione |
| `D` | Mobile ↔ Desktop |
| `T` | Tema chiaro ↔ scuro |
| `←` `→` | Schermata precedente / successiva |

## Nota

I mockup sono HTML/SVG reali, non immagini: stesso dataset fittizio in entrambe le direzioni, e i numeri tornano fra loro (i 894,39 € "impegnati" sono esattamente le 3 spese da confermare).
