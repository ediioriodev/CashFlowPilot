# Direzione A — specifica di prodotto

Documento di riferimento per l'implementazione. Riguarda **cosa** deve fare l'interfaccia e **perché**; per il *come appare* vedi `mockups.html`, per i problemi che risolve vedi `AUDIT.md`.

---

## 1. Le due regole

**Regola 1 — una domanda per schermata.**

| Schermata | La domanda |
|---|---|
| Oggi | Quanto posso ancora spendere? |
| Movimenti | Dove sono finiti i soldi? |
| Budget | Sto rispettando i tetti che mi sono dato? |
| Obiettivi | A che punto sono con i risparmi? |
| Famiglia | Chi ha pagato cosa, e chi deve a chi? |
| Analisi | Come sta andando rispetto al solito? |

**Regola 2 — massimo tre blocchi a colpo d'occhio.**
In modalità Semplice nessuna schermata supera i 3 blocchi. Tutto il resto è **grafica** (un disegno legge più in fretta di una tabella) oppure **sta dietro un tocco**.

Conteggio effettivo nei mockup:

| Schermata | Blocchi in Semplice | Blocchi in Avanzata |
|---|---|---|
| Oggi | **3** | 5 |
| Movimenti | 2 | 2 |
| Nuova spesa | 1 | 2 |
| Budget | 2 | 4 |
| Dettaglio busta | 3 | 4 |
| Obiettivi | 3 | 4 |
| Famiglia | 2 | 4 |
| Analisi | 3 | 4 |

---

## 2. Il vocabolario grafico

> **Rivisto il 19/09/2026** dopo la revisione dell'app (`REVISIONE.md`, rilievi RIL-001, RIL-002,
> RIL-006, RIL-007). Le forme circolari sono uscite dal vocabolario.

### Le tre regole

**1 · Niente forme circolari.** Né anelli, né ciambelle, né torte, né tachimetri. Un arco non si
confronta a occhio, una lunghezza sì: due barre affiancate dicono subito qual è la più lunga e di
quanto, due archi no. In più il numero grande, messo al centro di un anello, dipende da una figura
che non cresce con lui — su schermo largo ci finiva sopra.

**2 · Eventi a barre, saldo a linea.** Una spesa o un'entrata **esistono solo quando accadono**:
si disegnano a barre, e un giorno senza movimenti resta vuoto perché vuoto è. Un saldo invece
**esiste in ogni istante**: quello sì che si disegna con una linea continua. Interpolare fra due
movimenti significa mostrare importi in giorni in cui non è successo niente.

**3 · Ogni grafico dichiara la sua scala.** Un asse Y senza valori mostra la forma e nasconde la
quantità: si vede che il saldo è risalito, non se quel gradino vale cinquanta euro o mille. Se
l'asse non entra, si etichettano almeno il minimo e il massimo. Vale anche per il raggruppamento:
un grafico che somma per settimana lo deve scrivere, o il totale verrà letto come giornaliero.

### Le forme

Tutte SVG inline, nessuna immagine. Sempre le stesse, in tutta l'app.

| Forma | Componente | Dove | Cosa dice |
|---|---|---|---|
| **Barra a segmenti** | `SplitBar` | Oggi, Dettaglio busta | Come si divide il mese: speso / impegnato / da parte / libero. Il numero grande sta **sopra** la barra |
| **Barretta di percentuale** | `MiniBar` | Budget, Obiettivi, tile, form | Una percentuale sola, con il numero sopra |
| **Barre per periodo** | `Bars` | Movimenti, Analisi, Dettaglio, Famiglia | Il ritmo. Piena = successo, **tratteggiata = previsto** |
| **Barra impilata** | `StackBar` | Analisi, Obiettivi | Composizione di un totale in una riga |
| **Linea dell'andamento** | `AreaTrend` | Oggi (solo Avanzata), Analisi | Il **saldo**, che esiste in ogni istante. Con i valori sull'asse Y |
| **Barre affiancate** | `TrendChart` (Recharts) | Report | Entrate e uscite nel tempo: due barre per periodo, mai una curva |
| **Riga compatta** | `CatRow` | Ovunque servano elenchi | Icona · nome · barretta · importo. Una riga = un'informazione |

**Codifica costante**: pieno = reale, tratteggiato = previsto. Vale per le barre e per la linea
dell'andamento. È l'unica convenzione che l'utente deve imparare, e la impara guardando.

**Raggruppamento del Report**: automatico e dichiarato — una barra al giorno fino a 35 giorni, una
a settimana (lunedì-domenica) fino a sei mesi, una al mese oltre.

Il testo è ridotto a due forme: la **riga di contesto** (`qline`, una riga sotto il grafico, con
icona) e il **link di aiuto** («Come si calcola»), che apre la spiegazione invece di occupare
spazio.

---

## 3. Il numero in cima: "Puoi spendere"

L'app attuale mostra quattro saldi con quattro nomi diversi senza dire quale conta. La direzione A ne mette **uno solo**, al centro del tachimetro.

```
Puoi spendere  =  (entrate incassate − uscite sostenute) − spese previste non ancora sostenute
               =  saldo reale − impegnato
```

| Voce | Importo |
|---|---|
| Entrate incassate | 2.840,00 € |
| Uscite sostenute | − 1.591,70 € |
| **Saldo reale** (quello che hai in cassa) | **1.248,30 €** |
| Spese previste entro fine periodo | − 894,39 € |
| **Puoi spendere** | **353,91 €** |

Il tachimetro disegna le tre quantità in proporzione — rosso *speso*, tratteggiato *impegnato*, pieno *libero* — e sotto stanno i tre importi su una riga sola. Una riga di contesto: *«≈ 22,12 € al giorno · restano 16 giorni»*. Poi un link **Come si calcola**.

Nessun paragrafo esplicativo a schermo: la spiegazione si apre quando serve.

I **894,39 €** impegnati sono esattamente il totale delle 3 spese da confermare mostrate nella tile centrale: il numero torna, e questo insegna il modello meglio di qualunque testo.

---

## 4. Modalità Semplice / Avanzata

Un interruttore, salvato per utente, che cambia **quanto** si vede — mai **dove** si trova. Navigazione, posizioni e nomi restano identici.

| | Semplice (default) | Avanzata aggiunge |
|---|---|---|
| Oggi | tachimetro · 3 tile · andamento | ritmo settimanale, in cassa oggi vs stima a fine mese |
| Movimenti | barre settimanali + totale · lista | selettore periodo, subtotali giornalieri |
| Budget | anello totale · griglia di 6 buste | elenco dettagliato, categorie senza tetto |
| Obiettivi | anello totale · elenco salvadanai · accantonamento | crescita del risparmio mese per mese |
| Famiglia | barre di chi ha anticipato · conguaglio | membri, ruoli, spese fisse condivise |
| Analisi | confronto mesi · dove vanno i soldi · abbonamenti | tabella dati, top negozi, alert inutilizzati |

Implementazione: attributo `data-mode` sulla radice e due classi `.simple-only` / `.adv-only`. Stesso markup, nessun ramo di codice duplicato.

---

## 5. Il dettaglio si apre, non si affolla

La schermata **Dettaglio busta** nei mockup è l'esempio del principio: in *Budget* vedi solo sei anelli con nome e residuo; tocchi "Spesa" e si apre una pagina che contiene tutto il resto — tachimetro della categoria, ritmo settimanale, le sei spese, il confronto con i mesi precedenti.

Lo stesso schema vale per: una tile della home → la pagina corrispondente; un obiettivo → la sua pagina; una riga dei movimenti → la spesa; "Tutti e 5" negli abbonamenti → l'elenco.

**Niente di tutto questo sta a colpo d'occhio.**

---

## 6. Il linguaggio

Poche parole, e concrete. Prima il disegno, poi il numero, poi — se serve — una riga.

| Invece di | Scrivi |
|---|---|
| "SALDO CONFERMATO" | "Puoi spendere" |
| "Bilancio Attuale" | "In cassa oggi" |
| "Fine Mese (Previsto)" | "Stima al 30/11" |
| "Transazione" | "Spesa" / "Movimento" |
| "Ambito" | "Categoria" / "Busta" |
| "Ricorrente: conferma M/A" | "Si ripete ogni mese — resta previsto finché non lo confermi" |
| "Tipo spesa: C/P" | "Famiglia" / "Personale" |
| "Uscita" / "Entrata" (nel form) | "Ho speso" / "Ho incassato" |

---

## 7. Funzioni da app di casa, non da gestionale

### 7.1 Budget a buste — `Budget`
Sei anelli in una griglia: nome e residuo, nient'altro. Il colore dell'anello dice lo stato; sotto il totale, una barra con la **tacca grigia** che segna dove dovresti essere oggi (giorno 14 su 30 → 47%). Se il riempimento supera la tacca stai correndo troppo: insegna il ritmo senza spiegarlo.

Tre stati, sempre **icona + parola**, mai solo colore: *In linea* · *Quasi finito* (>85%) · *Superato* (>100%).

### 7.2 Obiettivi di risparmio — `Obiettivi`
Salvadanai con anello di avanzamento. Due cose li rendono utili invece che decorativi:
- **Accantonamento automatico** il giorno dopo lo stipendio;
- i soldi accantonati **escono da «puoi spendere»**, così non vengono spesi per sbaglio.

### 7.3 Chi ha pagato e conguaglio — `Famiglia`
Ogni movimento porta l'**iniziale colorata** di chi ha pagato. La schermata mostra un grafico a barre di quanto ha anticipato ciascuno, e il conguaglio come due righe grafiche — `LU → 361,83 € → EM` — con il pulsante *Segna come saldato*.
In Avanzata: ruoli (un membro *limitato* aggiunge spese ma non tocca budget né obiettivi — pensato per i figli) e spese fisse condivise.

### 7.4 Abbonamenti — dentro `Analisi`
Un anello e un numero: **1.079,64 € all'anno** (89,97 € al mese). La cifra annuale fa un effetto che quella mensile non fa. In Avanzata, la segnalazione di quelli non usati da mesi.

### 7.5 Rifiniture
- **Scontrino** e **Dividi in 3** come chip sotto il tastierino dell'importo.
- Mentre scegli la categoria, un anello mostra quanto budget resta: *«Budget Spesa: restano 87,50 € di 500,00 €»*.
- Suggerimento del negozio dallo storico.

---

## 8. Navigazione

**Mobile** — 4 destinazioni + azione centrale:

```
Oggi   Movimenti   ( + )   Budget   Altro
```

`Altro` apre Obiettivi, Famiglia, Analisi, Promemoria, Impostazioni, e resta evidenziato quando ti trovi in una di quelle. Ogni voce ha **icona e testo**, area tappabile 48px. Il `+` è un'azione, non una tab.

**Desktop (≥1024px)** — sidebar persistente con le sei sezioni, più Promemoria e Impostazioni sotto un separatore. Contenuto su due colonne: la principale porta la risposta, la laterale il contorno. In modalità Semplice la colonna laterale porta solo il grafico.

**Portafoglio** — switch *Famiglia / Personale* sempre visibile, con **icona + nome** e stato attivo pieno.

---

## 9. Ordine di costruzione

1. **Token e contesto** — token semantici in `globals.css`, `PeriodProvider`, switch portafoglio, focus ring, zoom riabilitato.
2. **Libreria grafica** — cinque componenti SVG (tachimetro, anello, barre, barra impilata, riga compatta) come componenti React riusabili. È il pezzo che fa la differenza visiva: farlo per primo.
3. **Home** — formula "puoi spendere", tachimetro, tre tile, andamento, `data-mode`.
4. **Navigazione** — bottom nav 4+FAB, sidebar desktop, titolo di pagina nell'header.
5. **Budget + Dettaglio busta** — tabella `budgets(scope, categoria, tetto, mese)`, griglia di anelli, pagina di dettaglio.
6. **Movimenti e form** — chi ha pagato, chip filtri visibili, `inputmode="decimal"`, validazione al blur, anello del budget nel form.
7. **Famiglia** — quota, conguaglio, ruoli, divisione sulla singola spesa.
8. **Obiettivi** — salvadanai, accantonamento automatico, sottrazione dal disponibile.
9. **Analisi** — confronto mesi, composizione, abbonamenti.

I punti 1-4 fanno sparire la sensazione di "grezzo". I punti 5-8 rendono l'app *personale e familiare* invece che un gestionale.

---

## 10. Cosa resta da decidere

- **Nome del numero principale**: "Puoi spendere" oppure "Ti resta" / "Disponibile".
- **Conguaglio**: azzeramento mensile automatico o saldo progressivo?
- **Accantonamento**: solo virtuale (etichetta sui soldi) o legato a un conto reale?
- **Modalità di default**: Semplice per tutti, o chiesta all'avvio?
- **La quinta tab**: "Altro" come nei mockup, oppure "Famiglia" fissa e Analisi dentro Altro?

Tutte annotabili nel pannello **Valutazione** del laboratorio.
