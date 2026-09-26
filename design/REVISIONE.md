# Revisione dell'app — rilievi di sessione (OP-021 · OP-032)

> **Raccolta chiusa · piano eseguito il 19/09/2026 · prove a schermo da fare (§5.3).**
> Dieci rilievi emersi guardando l'app a schermo dopo il deploy del 19/09. La §3 dice *cosa non
> torna*, la §4 *come si risolve*: causa verificata sul codice, file e righe, ordine di
> esecuzione, verifica di chiusura.
>
> Tutti i rilievi sono stati **corretti nel codice** e sono in stato `risolto, da provare a schermo`:
> compilano e passano lint e build, ma nessuno li ha ancora guardati. Chi riapre questo documento
> per lavorare parta da **§5.3, le prove a schermo**. Il §4 resta come motivazione delle scelte,
> con le cinque decisioni prese (§4.6).

| Documento collegato | A cosa serve |
|---|---|
| `COLLAUDO.md` | I sei casi di collaudo dei moduli nuovi (OP-021) — **restano da eseguire**, non li sostituisce questa revisione |
| `STATO.md` | Punto di ripresa e stato per modulo |
| `DIREZIONE-A.md` | Specifica di prodotto: è il metro dell'asse «chiarezza», e la sede delle regole grafiche del lotto B |
| `docs/roadmap/roadmap.data.js` | Roadmap: i rilievi sono registrati come OP-033…OP-036 e REQ-007/008 |

---

## 1. Come si legge un rilievo

Ogni rilievo ha un **id progressivo** `RIL-nnn`, assegnato nell'ordine in cui è emerso.

| Campo | Significato |
|---|---|
| **Modulo** | Dove si è visto (schermata, pagina, funzione) |
| **Asse** | `funzionalità` (non fa quello che serve) · `correttezza` (il numero non torna) · `chiarezza` (il numero non si capisce o non è quello utile) · `interfaccia` (resa grafica, layout, interazione) |
| **Gravità** | `alta` (blocca l'uso o mostra un dato sbagliato) · `media` (funziona ma non come dovrebbe) · `bassa` (rifinitura) |
| **Rilevato** | Cosa si è osservato, nelle parole di chi l'ha visto |
| **Atteso** | Cosa sarebbe dovuto succedere, quando è noto |
| **Stato** | `rilevato` → `in analisi` → `pianificato` → `risolto` |

Gli assi sono quelli di OP-032; `interfaccia` è aggiunto perché la revisione guarda anche la
resa a schermo, che il collaudo tecnico non copre.

---


---

## 1-bis. Ambiente di prova

**Tutti i rilievi di questa revisione sono osservati da app web su desktop**, tema scuro,
finestra di browser larga. Salvo indicazione contraria in un singolo rilievo, va inteso così.

Ne discende che:
- **PWA installata, tablet e telefono non sono ancora stati guardati.** Ogni rilievo di resa a
  schermo (`interfaccia`) resta da riprovare lì prima di dirlo chiuso, perché l'impaginazione
  cambia e un difetto può essere solo del desktop, solo del mobile, o di entrambi in modi
  diversi.
- I rilievi di `funzionalità` e `correttezza` si presumono invece indipendenti dal dispositivo,
  salvo prova contraria.

---

## 2. Sintesi

| | Alta | Media | Bassa | Totale |
|---|---|---|---|---|
| **Rilievi corretti nel codice** | 4 | 8 | 1 | **13** |

*Revisione svolta il 19/09/2026 da app web desktop. Raccolta chiusa a RIL-010; RIL-011, RIL-012 e RIL-013 sono emersi dopo, preparando ed eseguendo il collaudo. Tutti implementati il 19/09: cosa è stato fatto in §5.*

### Dove è finito ogni rilievo

| Rilievo | Gravità | Lotto (§4) | Punto in roadmap | Richiesta |
|---|---|---|---|---|
| RIL-001 · «Puoi spendere» illeggibile da web | alta | B4 | OP-034 | — |
| RIL-002 · Niente grafici circolari | media | B4 · B5 | OP-034 | REQ-009 |
| RIL-003 · «Andamento del saldo» fuori da Semplice | media | B2 | OP-034 | — |
| RIL-004 · Il fuoco salta sulla X a ogni carattere | alta | A | **OP-033** | — |
| RIL-005 · «Tetto per periodo»: quale periodo? | media | C | OP-035 | — |
| RIL-006 · Grafici a linea senza valori sull'asse Y | media | B1 | OP-034 | — |
| RIL-007 · Report: eventi disegnati come curva | media | B3 | OP-034 | — |
| RIL-008 · Modifica dalla pagina Fisse | media | D2 | OP-036 | REQ-007 |
| RIL-009 · «Scadute» → «Concluse» | bassa | D1 | OP-036 | — |
| RIL-010 · Storico e previsto di ogni voce | media | D3 | OP-036 | REQ-008 |
| RIL-011 · Quote per percentuale normalizzate di nascosto | media | E | **OP-037** | — |
| RIL-012 · Il testo dei pulsanti perde il colore (tutta l'app) | alta | A · F | **OP-038** | — |
| RIL-013 · Quote salvate invisibili e cancellate al salvataggio | alta | G | **OP-039** | — |

Tredici rilievi, **sette punti di roadmap**: molti condividevano la causa, e il piano li tratta
come un intervento solo invece che come undici ritocchi.

---

## 3. Rilievi

### RIL-001 · «Puoi spendere» illeggibile da web

| | |
|---|---|
| **Modulo** | Oggi (dashboard) — anello principale |
| **Asse** | interfaccia |
| **Gravità** | alta |
| **Dove** | Vista Famiglia, Settembre 2026 (ambiente di prova comune, §1-bis) |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Su schermo largo il numero principale **si sovrappone all'anello**: le cifre
escono dal cerchio interno e finiscono sopra il tracciato rosso e azzurro, che ne taglia la
lettura ai due estremi (`1274,97 €` — la prima cifra e il simbolo di euro cadono sull'arco).
Il numero è quello che l'intera schermata esiste per mostrare, ed è l'elemento meno leggibile
della pagina.

**Atteso.** Il numero principale leggibile a colpo d'occhio, senza nulla che gli passi sopra o
dietro, a qualsiasi larghezza di finestra.

**Prova.** `design/revisione-assets/RIL-001-oggi-web.png`

> Nota per la fase di risoluzione: verificare se il testo ha dimensione fissa mentre l'anello
> scala con il contenitore, o il contrario. Il comportamento su mobile non è ancora stato
> osservato in questa revisione.

---

### RIL-002 · Togliere i grafici circolari, passare alle barre

| | |
|---|---|
| **Modulo** | Trasversale — ovunque compaia un anello, una ciambella o una torta |
| **Asse** | chiarezza |
| **Gravità** | media |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Indicazione generale di prodotto: **i grafici circolari non si usano**. Si
leggono peggio di una barra — un arco non si confronta a occhio, una lunghezza sì. Riguarda
almeno l'anello «Puoi spendere» e la pastiglia «100% Speso» visibili nella prova di RIL-001,
e ogni altro anello o torta presente nell'app.

**Atteso.** Ogni rappresentazione di quantità o proporzione resa **a barre** — barra singola,
barra divisa in segmenti o barre affiancate — come già avviene in «Dove vanno i soldi», che è
il modello da seguire.

> Nota per la fase di risoluzione: da censire tutti i punti dell'app con grafica circolare
> (dashboard, riepiloghi, analisi, budget a buste, obiettivi di risparmio) e da riportare la
> scelta in `DIREZIONE-A.md`, che è la sede del vocabolario grafico.

---


---

### RIL-003 · «Andamento del saldo» non deve comparire in Oggi, modalità Semplice

| | |
|---|---|
| **Modulo** | Oggi (dashboard) — riquadro «Andamento del saldo» |
| **Asse** | chiarezza |
| **Gravità** | media |
| **Dove** | Vista Famiglia, Settembre 2026 (ambiente di prova comune, §1-bis) |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Il riquadro compare in **entrambe** le modalità. In Semplice è un contenuto di
troppo: la schermata deve rispondere a una domanda sola, e la domanda di Oggi è «quanto posso
spendere».

**Atteso.**

| Modalità | Comportamento |
|---|---|
| **Semplice** | Il riquadro **non compare**. |
| **Avanzata** | Il riquadro resta — ma con la scala sull'asse Y, che oggi manca: vedi **RIL-006**. |

**Prova.** `design/revisione-assets/RIL-003-andamento-saldo.png`

> Nota per la fase di risoluzione: il riquadro va nascosto per davvero in Semplice, non solo
> impaginato più in basso; da verificare che la colonna di destra non resti con uno spazio
> vuoto quando il riquadro sparisce.

---

### RIL-004 · Modali di Budget e Obiettivi: a ogni carattere il fuoco salta sulla X di chiusura

| | |
|---|---|
| **Modulo** | **Budget a buste** e **Obiettivi di risparmio** — tutti i campi da compilare delle rispettive modali, non solo gli importi |
| **Asse** | funzionalità |
| **Gravità** | alta |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Compilando un campo, **a ogni carattere inserito il fuoco lascia il campo e si
sposta sulla X in alto a destra** della modale. Per scrivere «400» bisogna rientrare nel campo
tre volte. Con il fuoco sul pulsante di chiusura, un Invio o una barra spaziatrice chiudono la
modale e buttano via quanto scritto.

Il comportamento è **uguale su tutti i campi** delle due aree — «Tetto per periodo» e
«Categoria» in «Nuova busta», «Traguardo», «Per cosa» ed «Entro quando» in «Nuovo obiettivo» —
quindi non è il difetto di un campo particolare né di una schermata: è la modale che si
ricostruisce sotto le dita di chi scrive. Nella pratica **rende inutilizzabile la compilazione**
di entrambi i moduli.

**Atteso.** Il fuoco resta dove si sta scrivendo, per tutta la digitazione, in ogni campo e in
ogni modale. La modale si chiude solo con un clic esplicito sulla X, su Annulla o con Esc.

**Prove.**
- `design/revisione-assets/RIL-004-nuova-busta.png` — Budget, «Nuova busta»
- `design/revisione-assets/RIL-004b-nuovo-obiettivo.png` — Obiettivi, «Nuovo obiettivo»

> Nota per la fase di risoluzione: sintomo tipico di un rimontaggio dell'albero a ogni battuta —
> la modale viene ricreata a ogni cambio di stato e il fuoco ricade sul primo elemento
> focalizzabile, che qui è la X. Interessando ogni campo di due moduli diversi, la causa è
> **una sola e condivisa**, a monte dei singoli campi (il guscio della modale, o il componente
> che la monta): va cercata lì, non schermata per schermata. Restano da provare le modali
> degli altri moduli — quote personalizzate, nuova spesa, versamento su obiettivo, ricorrenti:
> se il guscio è lo stesso, il difetto è anche lì.

---

### RIL-005 · «Tetto per periodo»: quale periodo?

| | |
|---|---|
| **Modulo** | Budget a buste — modale «Nuova busta» |
| **Asse** | chiarezza |
| **Gravità** | media |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** L'etichetta dice «Tetto per **periodo**» e il testo in cima «vale per il periodo
corrente e per quelli successivi», ma **non si dice mai di che periodo si tratti**: mensile,
settimanale, annuale? Chi inserisce 400 non sa se sta dichiarando 400 € al mese o 400 € in un
arco che qualcun altro ha deciso altrove.

**Atteso.** Il periodo detto a chiare lettere nel punto in cui si scrive il numero — per
esempio «Tetto mensile» con sotto «Quanto vuoi poter spendere al massimo in questa categoria
**ogni mese**» — oppure, se il periodo segue davvero il selettore in cima all'app, dirlo
esplicitamente e nominarlo («Tetto per Settembre 2026 e i mesi successivi»).

**Prova.** `design/revisione-assets/RIL-004-nuova-busta.png` (stessa schermata)

> Nota per la fase di risoluzione: prima di riscrivere l'etichetta va stabilito **qual è** il
> periodo di riferimento reale del tetto nel modello dati; il testo deve dire la verità, non
> il contrario. La stessa parola «periodo» va poi controllata ovunque compaia — è ambigua
> anche fuori da questa modale.

---


---

### RIL-006 · Grafici a linea senza valori sull'asse Y

| | |
|---|---|
| **Modulo** | Trasversale ai grafici a linea. Confermato su: **Oggi → «Andamento del saldo»** (modalità Avanzata) e **Analisi → scheda «Saldo»** |
| **Asse** | chiarezza |
| **Gravità** | media |
| **Dove** | Vista Famiglia, Settembre 2026 (ambiente di prova comune, §1-bis) |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Le curve non hanno **alcun valore sull'asse Y**. In Analisi il grafico ha perfino
le linee della griglia, ma nessuna di esse è etichettata: si vede che il saldo fa un gradino
verso l'alto, non si sa se quel gradino vale cinquanta euro o mille. Il numero grande in cima
(`1274,97 €`) dice il punto d'arrivo, non l'escursione. È lo stesso difetto già osservato in
Oggi (RIL-003): un grafico che mostra la forma e nasconde la quantità.

**Atteso.** La **fascia degli importi indicata sull'asse Y** in tutti i grafici a linea —
almeno il minimo e il massimo della curva, meglio se sulle linee di griglia già disegnate — in
modo che l'ampiezza dell'oscillazione si legga senza toccare nulla.

**Prove.**
- `design/revisione-assets/RIL-006-analisi-saldo.png` — Analisi, scheda «Saldo»
- `design/revisione-assets/RIL-003-andamento-saldo.png` — Oggi, «Andamento del saldo»

> Nota per la fase di risoluzione: da trattare come **una correzione sola** nella libreria
> grafica condivisa, non due; da censire gli altri grafici a linea dell'app (Report, Fisse e
> abbonamenti) e da riportare la regola in `DIREZIONE-A.md`, insieme a quella di RIL-002.

---


---

### RIL-007 · Report: entrate e uscite sono eventi, non una curva continua

| | |
|---|---|
| **Modulo** | Report — riquadro «Entrate e uscite nel tempo» |
| **Asse** | chiarezza |
| **Gravità** | media |
| **Dove** | Intervallo 23/08 → 18/09 (ambiente di prova comune, §1-bis) |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Le entrate e le uscite sono disegnate come **due linee continue e per giunta
arrotondate**, ma il dato sottostante è discreto: sono movimenti, ciascuno in un giorno preciso.
La curva unisce e smussa quei punti e così **mostra importi nei giorni in cui non è successo
niente** — l'entrata del 15/09 diventa una campana che sale dal 14 e scende fino al 16, quando
in quei due giorni l'entrata è zero. La tabella «Mostra i dati in tabella» sotto al grafico dice
la verità (08/09 → 5,04 €, 12/09 → 90,00 €), il grafico sopra no.

La linea continua è la forma giusta per un **saldo**, che esiste in ogni istante; non per
**spese ed entrate**, che esistono solo quando accadono.

**Atteso.** Una rappresentazione **discreta**: barre verticali per giorno — due barre affiancate
o una coppia sopra/sotto lo zero — così che un giorno senza movimenti appaia vuoto, perché vuoto
è. Nessuna interpolazione, nessun arrotondamento fra un punto e l'altro.

**Prova.** `design/revisione-assets/RIL-007-report-entrate-uscite.png`

> Nota per la fase di risoluzione: questo grafico è anche **l'unico finora visto con l'asse Y
> etichettato** (€0 … €2600): è il modello da portare negli altri (RIL-006). Da stabilire, in
> sede di piano, come si comportano le barre su intervalli lunghi — con novanta giorni le barre
> giornaliere diventano illeggibili e serve un raggruppamento per settimana o per mese. La
> regola generale «eventi = barre, saldo = linea» va scritta in `DIREZIONE-A.md` insieme a
> RIL-002 e RIL-006.

---


---

### RIL-008 · Fisse e abbonamenti: modifica diretta dalla pagina

| | |
|---|---|
| **Modulo** | Fisse e abbonamenti |
| **Asse** | funzionalità |
| **Gravità** | media |
| **Natura** | Richiesta di prodotto, non difetto: oggi l'app fa quello che era previsto, si chiede che faccia di più |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** La pagina mostra le spese fisse e gli abbonamenti ma **non permette di
correggerli**: per cambiare un importo o una cadenza bisogna uscire e passare dal percorso
ordinario. La pagina che riunisce tutte le spese che si ripetono è però il punto in cui ci si
accorge che una va corretta.

**L'inserimento di una voce nuova c'è già** — pulsante «Nuova» in alto a destra, verificato in
corso di revisione: il rilievo riguarda **la sola modifica** delle voci esistenti.

**Atteso.** Dalla pagina si possono **modificare** le voci esistenti, **in aggiunta** al
percorso standard già previsto, che resta dov'è. Nessuna funzione va spostata: questa è una via
più corta, non una sostituzione.

**Prova.** `design/revisione-assets/RIL-008-fisse-intestazione.png` — intestazione con il
pulsante «Nuova» già presente e le schede «Attive · Uscite · Entrate · Scadute (7)»

> Nota per la fase di risoluzione: verificare se la modale di modifica delle ricorrenti esiste
> già altrove ed è riutilizzabile qui — in tal caso l'intervento è di collegamento, non di
> scrittura; il pulsante «Nuova» indica che almeno una modale di questa famiglia c'è. Attenzione
> a RIL-004: se il guscio delle modali è quello difettoso, riusarlo qui porterebbe il difetto
> anche in questa pagina — e va comunque provato il comportamento del fuoco nella modale di
> «Nuova», che questa revisione non ha ancora aperto. Trattandosi di una richiesta e non di un
> difetto, in fase di piano va registrata anche fra le `richiesteCliente` della roadmap.

---

### RIL-009 · «Scadute» va chiamata «Concluse»

| | |
|---|---|
| **Modulo** | Fisse e abbonamenti — scheda «Scadute (7)» |
| **Asse** | chiarezza |
| **Gravità** | bassa |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** La sezione si chiama **«Scadute»**. La parola dice che qualcosa è andato storto —
una scadenza mancata, un pagamento saltato — mentre lì dentro ci sono voci che hanno
semplicemente finito il loro corso.

**Atteso.** La sezione si chiama **«Concluse»**.

> Nota per la fase di risoluzione: rinominare l'etichetta a schermo e ogni testo di contorno che
> usa la stessa parola (intestazioni, stati vuoti, messaggi). Il nome del campo o dello stato
> nel database non va toccato se non serve: è una parola dell'interfaccia.

---


---

### RIL-010 · Fisse e abbonamenti: storico e previsto di ogni voce

| | |
|---|---|
| **Modulo** | Fisse e abbonamenti — dettaglio della singola voce |
| **Asse** | funzionalità |
| **Gravità** | media |
| **Natura** | Richiesta di prodotto, non difetto |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Di una spesa fissa si vede **solo quanto costa adesso**. Non si vede quante volte
è già stata pagata, se l'importo è cambiato nel tempo, né quanto peserà da qui in avanti. Manca
il prospetto della **vita** della spesa: da quando esiste, cosa è già uscito, cosa uscirà.

**Atteso.** Aprendo una voce si consultano, per quella voce:

| | Cosa mostra |
|---|---|
| **Storico** | I movimenti già avvenuti, con data e importo, e le variazioni di importo nel tempo |
| **Previsto** | Le scadenze future già determinabili dalla cadenza, con il relativo importo |
| **Totale** | Quanto è costata finora e quanto costerà nell'arco considerato |

La pagina promette già «quanto ti costano davvero le spese che si ripetono — al mese *e
all'anno*»: questo rilievo chiede lo stesso ragionamento sulla **singola** voce, non solo
sull'insieme.

> Nota per la fase di risoluzione: da stabilire in sede di piano **fin dove arriva il previsto**
> — fine dell'anno corrente, dodici mesi, o fino alla data di conclusione se la voce ne ha una —
> e come si trattano le voci concluse (RIL-009), che hanno storico ma non previsto. Da chiarire
> anche se lo storico va ricostruito dai movimenti realmente registrati o generato dalla
> cadenza: solo il primo dice la verità su cosa è stato pagato. Va insieme a RIL-008: è lo
> stesso dettaglio di voce da cui si modificherebbe.

---

### RIL-011 · Le quote per percentuale vengono normalizzate di nascosto

| | |
|---|---|
| **Modulo** | Quote di spesa — editor «Come si divide», modalità «Per percentuale» (nuova spesa e modifica movimento) |
| **Asse** | correttezza |
| **Gravità** | media |
| **Emerso** | Preparando i passi del caso 3 del collaudo (`COLLAUDO.md`), leggendo il codice |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Scrivendo percentuali che non fanno 100 — per esempio **70 e 20** — l'app dice che
c'è un errore: sotto al campo compare «Le percentuali fanno 90% — **devono fare 100**». Ma poi
**salva lo stesso**, e salva **altri numeri**: 77,78 € e 22,22 € su una spesa da 100 €.

La causa è in `src/components/expenses/SplitEditor.tsx:30-45` (`ripartisci`): la funzione tratta
le percentuali come **pesi** e distribuisce sempre l'intero importo in proporzione, assegnando il
resto all'ultimo membro. Il totale torna sempre per costruzione — ed è anche il motivo per cui il
caso 3.4 del collaudo non è eseguibile dall'interfaccia — ma quello che viene scritto non è né
ciò che l'utente ha digitato né un rifiuto.

Sono tre comportamenti che si contraddicono: l'avviso dice «sbagliato», il salvataggio dice «va
bene», il database registra una terza cosa.

**Atteso.** Una delle due, non la via di mezzo:

- **o l'app rifiuta** finché le percentuali non fanno 100, coerentemente con l'avviso che mostra
  già;
- **o l'app normalizza dichiarandolo**, mostrando le quote in euro che sta per salvare e
  togliendo l'avviso di errore, che a quel punto sarebbe falso.

> Nota per la fase di risoluzione: la prima è più coerente con il resto dell'app, dove il colore
> non è mai l'unico segnale e un avviso vuol dire che qualcosa non si può fare. La seconda è più
> tollerante ma va resa visibile, perché una normalizzazione silenziosa su una cifra che qualcuno
> dovrà rimborsare è il tipo di sorpresa che fa perdere fiducia nei numeri dell'app. Da decidere
> prima di scrivere. Il `SplitEditor` mostra già le quote in euro accanto ai campi: metà del
> lavoro della seconda strada è fatto.

---

### RIL-012 · Il testo dei pulsanti perde il suo colore, in tutta l'app

| | |
|---|---|
| **Modulo** | Trasversale: ogni `<button>` dell'app. Osservato su **Oggi → «Andamento del saldo» → «Aggiungi spesa»** in tema chiaro |
| **Asse** | interfaccia |
| **Gravità** | alta |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** In tema chiaro il pulsante «Aggiungi spesa» non è leggibile: testo scuro su fondo blu
scuro.

**Causa, verificata — ed è più ampia del sintomo.** `src/app/globals.css:223`:

```css
input, select, textarea, button { font: inherit; color: inherit }
```

La riga sta **fuori da ogni `@layer`**, mentre le utility di Tailwind stanno dentro il layer
`utilities` (`@import "tailwindcss"` alla riga 1). Nella cascata CSS il codice **non** inserito in
un layer vince su quello inserito, a prescindere dalla specificità: quindi `color: inherit`
**batte `text-accent-ink`, `text-white` e qualunque altra classe di colore** applicata a un
pulsante. Il testo di ogni pulsante eredita il colore del contenitore invece del proprio.

Le conseguenze si vedono in tutte e due le modalità, ed è per questo che il rilievo non è la
rifinitura di una schermata:

| Tema | Cosa dovrebbe essere | Cosa è |
|---|---|---|
| **Chiaro** | testo bianco (`--accent-ink: #FFFFFF`) su blu `--accent: #153E75` | testo quasi nero ereditato (`--text: #14171C`) su quel blu: **illeggibile**, è il caso segnalato |
| **Scuro** | testo scuro (`--accent-ink: #0A1220`) su azzurro `--accent: #7FA9EA` | testo chiaro ereditato su azzurro chiaro: contrasto basso — si vede negli screenshot di RIL-004, dove «✓ Salva» è chiaro su azzurro invece che scuro |

Riguarda anche il pulsante `danger` (`text-white` su rosso) e ogni pulsante che dichiari un
colore proprio.

**Atteso.** Il pulsante mostra il colore che il suo variant dichiara, in entrambi i temi:
bianco su blu in chiaro, scuro su azzurro in scuro.

> Nota per la fase di risoluzione: la correzione è una riga, ma va fatta con criterio. La regola
> serviva a Safari per i campi nativi, quindi `font: inherit` va tenuto; `color: inherit` va
> tolto dai pulsanti o l'intera regola va spostata **dentro** `@layer base`, dove le utility la
> sovrascrivono normalmente. Poi vanno ricontrollati i pulsanti che oggi *dipendono* da quella
> ereditarietà — `ghost` e `secondary` dichiarano già il proprio colore (`text-muted`,
> `text-ink`), quindi non dovrebbero cambiare, ma è da guardare a schermo in entrambi i temi.
> **Da fare presto e insieme al lotto A**: è una riga, e finché c'è falsa il giudizio su ogni
> altro rilievo di resa a schermo, compreso il tema chiaro che questa revisione non ha ancora
> guardato.

---

### RIL-013 · Le quote salvate non si vedono, e si cancellano da sole

| | |
|---|---|
| **Modulo** | Modifica movimento — riquadro «Come si divide» (`EditExpenseModal` + `SplitEditor`) |
| **Asse** | correttezza |
| **Gravità** | alta |
| **Emerso** | Dal caso 3 del collaudo, 19/09: il conguaglio diceva 90 € dove le schermate di modifica mostravano parti uguali su tutto |
| **Stato** | risolto nel codice, da provare a schermo |

**Rilevato.** Due difetti che si sommano e si nascondono a vicenda.

1. **La modale non carica le quote salvate.** All'apertura fa `setSplits([])`
   (`EditExpenseModal.tsx:80`) e `SplitEditor` parte sempre da «Parti uguali»
   (`SplitEditor.tsx:60`, nessuna prop che porti dentro le quote esistenti). Una spesa divisa
   70/30 si riapre mostrando **«Parti uguali · 50,00 € e 50,00 €»**: la schermata dice una cosa,
   il database ne contiene un'altra.

2. **Riaprire e salvare le cancella.** `SplitEditor` avvisa il genitore appena si monta —
   l'effetto alle righe 96-101 confronta la firma `"[]"` con il valore iniziale `""`, le trova
   diverse e chiama `onChange([])`. Il genitore, a quel punto, marca `splitsToccati = true`
   (`EditExpenseModal.tsx:249-250`) **senza che nessuno abbia toccato niente**. Al salvataggio la
   condizione della riga 121 è vera, parte `familyService.setSplits(id, [])`, che comincia con
   `delete().eq("spesa_id", id)` (`familyService.ts:473`) e non reinserisce nulla.

   Risultato: **basta aprire una spesa divisa 70/30, cambiarle la data o una virgola nella nota e
   salvare, e le quote spariscono.** Senza avviso, senza differenza visibile: la spesa torna in
   parti uguali e il conguaglio cambia sotto i piedi di chi doveva restituire.

Il dato che si perde non è un dettaglio di forma: è quello che stabilisce **chi deve quanto a
chi**.

**Atteso.** La modale mostra le quote effettivamente salvate; chi non tocca il riquadro non le
modifica; chi le toglie lo fa di proposito.

> Nota per la fase di risoluzione: tre pezzi, tutti piccoli.
> (a) Caricare le quote all'apertura — serve una lettura di `expense_splits` per quella spesa e
> una prop di `SplitEditor` che imposti modalità e valori di partenza.
> (b) Non marcare `splitsToccati` sulla notifica di montaggio: o `SplitEditor` non chiama
> `onChange` al primo giro (inizializzando `ultimo.current` con la firma iniziale), o il
> genitore ignora la prima notifica.
> (c) Solo dopo (a) e (b) la cancellazione volontaria torna a funzionare come deve.
> Va fatto **prima** di riprovare il caso 3 del collaudo: finché c'è, nessuna verifica sulle
> quote dice qualcosa di affidabile — quello che si legge a schermo non è quello che è scritto.

---

## 4. Piano d'azione

> **Chiuso il 19/09/2026.** Ogni causa qui sotto è stata **verificata leggendo il codice**, non
> ipotizzata: dove c'è un numero di riga, quella riga è stata aperta. Le uniche voci senza causa
> sono le due richieste di prodotto (RIL-008, RIL-010), che non hanno un difetto da spiegare.
>
> Nessuna modifica al codice è stata fatta in questa sessione: il piano è da eseguire.

### 4.1 I quattro lotti

I dieci rilievi si riducono a **quattro lotti**, perché molti condividono la causa o il file.
Eseguirli nell'ordine: A sblocca l'inserimento dei dati, D e C sono correzioni di parole, B è
il lavoro grosso e va per ultimo.

| Lotto | Rilievi | Cosa tocca | Peso |
|---|---|---|---|
| **A · Il guscio delle modali** | RIL-004 | `src/components/ui/kit.tsx` | piccolo, sblocca tutto |
| **B · Vocabolario grafico** | RIL-001, RIL-002, RIL-003, RIL-006, RIL-007 | `src/components/ui/charts.tsx`, `TrendChart.tsx`, sei pagine, `DIREZIONE-A.md` | grande |
| **C · La parola «periodo»** | RIL-005 | `src/app/budget/page.tsx` | piccolo |
| **D · Fisse e abbonamenti** | RIL-008, RIL-009, RIL-010 | `src/app/ricorrenti/page.tsx`, `recurringService.ts` | medio |
| **E · Le quote per percentuale** | RIL-011 | `src/components/expenses/SplitEditor.tsx` | piccolo, una decisione da prendere |
| **F · Il colore dei pulsanti** | RIL-012 | `src/app/globals.css` (una riga) | minuscolo, **da fare con A** |
| **G · Le quote che spariscono** | RIL-013 | `EditExpenseModal.tsx`, `SplitEditor.tsx` | piccolo, **blocca il collaudo del caso 3** |

---

### 4.2 Lotto A — il fuoco che scappa (RIL-004)

**Causa, verificata.** `src/components/ui/kit.tsx:474-575`. Tre fatti che si sommano:

1. `Modal` porta il fuoco dentro il pannello in un `useEffect` che dipende da `[open, trap]`
   (riga 515 e 535).
2. `trap` è una `useCallback` che dipende da `[onClose]` (righe 493-513).
3. Ogni chiamante passa `onClose` **come funzione anonima inline** — per esempio
   `src/app/budget/page.tsx:404` (`onClose={() => { setEditing(null); setFormError(null); }}`) e
   `src/app/obiettivi/page.tsx:469`.

Quindi: si batte un tasto → il genitore aggiorna lo stato e si ridisegna → `onClose` è una
funzione **nuova** → `trap` è nuova → l'effetto si smonta e si rimonta → e al rimontaggio
riesegue le righe 520-525, che cercano
`'button:not([disabled]), input, textarea, select, a[href]'` e prendono **il primo in ordine di
documento**. Il primo `button` del pannello è quello di chiusura, perché sta nell'intestazione
(riga 563) **prima** dei campi. Da qui il fuoco sulla X a ogni carattere.

Questo spiega anche perché il difetto riguarda ogni campo e non solo gli importi, ed è la prova
che la correzione è **una sola**, in `kit.tsx`: nessuna pagina va toccata.

**Intervento.**

1. Tenere `onClose` in una ref (`onCloseRef.current = onClose` a ogni render) e rendere `trap`
   stabile — `useCallback(..., [])` che legge la ref. L'effetto smette di rimontarsi a ogni
   battuta.
2. Separare i due effetti: uno per l'ascolto della tastiera, uno per il fuoco iniziale, che deve
   dipendere **solo da `open`**.
3. Al primo fuoco preferire il **primo campo** (`input, textarea, select`) e ricadere sul primo
   bottone solo se campi non ce ne sono: anche a effetto rimontato, il fuoco non finirebbe più
   sulla X.
4. Rimettere il fuoco sull'elemento che ha aperto la modale (`openerRef`, riga 533) **solo alla
   chiusura vera**, non a ogni riesecuzione dell'effetto.

**Verifica.** In «Nuova busta» scrivere `400` di seguito senza rientrare nel campo; ripetere su
«Nuovo obiettivo» in ogni campo, compresa la data. Poi: Esc chiude, Tab resta dentro al pannello,
alla chiusura il fuoco torna sul pulsante che aveva aperto. Da riprovare anche sulle modali non
ancora aperte in revisione — «Nuova» in Fisse e abbonamenti, modifica movimento, quote,
scontrini — che usano lo stesso guscio.

---

### 4.3 Lotto B — vocabolario grafico (RIL-001, RIL-002, RIL-003, RIL-006, RIL-007)

Cinque rilievi, una sola materia: **come l'app disegna i numeri**. Vanno eseguiti insieme e
chiusi scrivendo le regole in `DIREZIONE-A.md`, che è la sede del vocabolario grafico.

#### B1 · Scala sull'asse Y (RIL-006)

**Causa, verificata.** `src/components/ui/charts.tsx:261-336`, componente `AreaTrend`: alle righe
317-320 disegna tre linee di griglia a 25/50/75% dell'altezza **senza alcuna etichetta**, e
l'unico testo previsto è quello dell'asse X (righe 330-333). Nessun chiamante può rimediare da
fuori. Usato in due punti: `src/app/page.tsx:337` (Oggi) e `src/app/analisi/page.tsx:131`
(scheda Saldo) — gli stessi due dove il rilievo è stato osservato.

**Intervento.** In `AreaTrend`: separare il padding sinistro da quello generale (oggi `pad = 10`,
riga 284; serve un `padL` intorno a 46) e scrivere il valore accanto a ciascuna linea di griglia,
più il minimo e il massimo della serie. Formattazione compatta (`1,2k`) per non allargare troppo
il margine. Una sola modifica, due schermate sistemate.

#### B2 · «Andamento del saldo» solo in Avanzata (RIL-003)

**Causa, verificata.** `src/app/page.tsx:313` — la `Card` che contiene `AreaTrend` non ha la
classe `adv-only`, a differenza delle due sorelle sotto (righe 368 e 393).

**Intervento.** Aggiungere `adv-only` a quella Card. Il meccanismo è già in piedi:
`src/app/globals.css:180` fa `display: none !important` in modalità Semplice, e un elemento
`display:none` **non lascia spazio vuoto** in una colonna flex — il dubbio annotato nel rilievo
si scioglie da sé, ma va guardato a schermo.

#### B3 · Report a barre (RIL-007)

**Causa, verificata.** `src/components/reports/TrendChart.tsx:81-82`: due
`<Line type="monotone">` di Recharts. `monotone` è un'interpolazione: disegna una curva morbida
**fra** i punti. E i punti sono solo i giorni con movimenti — `src/app/report/page.tsx:100-112`
(`mergeTrends`) costruisce la serie da due RPC che raggruppano per data (`get_monthly_trend`,
`supabase_functions.sql`), quindi **i giorni vuoti non esistono nella serie**: la curva li
attraversa inventando valori. È esattamente ciò che si vede nella prova.

**Intervento.**

1. Sostituire `LineChart`/`Line` con `BarChart`/`Bar` (due barre affiancate, entrate e uscite);
   i colori restano quelli dei token via `useTokenColors`.
2. **Riempire i giorni mancanti con zero** in `mergeTrends`, generando tutte le date
   dell'intervallo: senza questo le barre risultano equidistanti anche quando i giorni non lo
   sono, e l'asse del tempo mentirebbe in un altro modo.
3. **Raggruppare a soglia automatica** (decisione presa, §4.6):

   | Intervallo scelto nei filtri | Una barra ogni |
   |---|---|
   | fino a 35 giorni | giorno |
   | da 36 giorni a 6 mesi | settimana, da lunedì a domenica, somma degli importi |
   | oltre 6 mesi | mese |

   Il riquadro **dichiara come sta raggruppando** — l'`hint` dell'intestazione (oggi «Una linea
   per tipo di movimento», `TrendChart.tsx:34`) diventa «per giorno · per settimana · per mese»
   secondo il caso: un totale settimanale letto come giornaliero sarebbe un errore peggiore di
   quello che stiamo correggendo.

   Due avvertenze per chi scrive: i secchielli vanno generati **dall'intervallo**, non dai dati,
   altrimenti si ripresenta il buco che ha causato RIL-007; e le settimane a cavallo degli
   estremi vanno mostrate per quel che sono — somma dei soli giorni compresi nell'intervallo,
   etichetta con la data del lunedì — senza estenderle oltre il periodo scelto.

L'asse Y qui è già etichettato (`YAxis`, righe 60-67): **è il modello** a cui portare `AreaTrend`
in B1.

#### B4 · Via i cerchi (RIL-002) e il numero leggibile (RIL-001)

**Causa di RIL-001, verificata.** `src/app/page.tsx:127-131`: il numero è
`text-[34px] lg:text-[40px]`, cioè **cresce su schermo grande**. L'anello no: in
`charts.tsx:88` l'SVG è `max-w-[300px]` e si ferma lì. In più il contenitore del numero
(`charts.tsx:98`) è `absolute inset-x-0` sulla larghezza **della card**, non dell'anello: a
finestra larga il testo è centrato su un'area più grande del cerchio e ne esce. Lo spazio interno
utile dell'arco è circa 190 px (raggio 74, spessore 21, su 300 px): `1274,97 €` a 40 px non ci
sta.

**Censimento dei cerchi (RIL-002).** Due componenti in `charts.tsx`: `Gauge` (riga 44) e `Ring`
(riga 112). Usati in:

| File | Righe | Cosa |
|---|---|---|
| `src/app/page.tsx` | 114 | `Gauge` — il numero principale «Puoi spendere» |
| `src/app/page.tsx` | 180, 194, 213 | `Ring` — le tre porte (Budget/Speso, Da confermare, Obiettivi/Fisse) |
| `src/app/budget/page.tsx` | 207, 273 | `Ring` — totale e singola busta |
| `src/app/obiettivi/page.tsx` | 287, 359 | `Ring` — totale e singolo obiettivo |
| `src/app/ricorrenti/page.tsx` | 105 | `Ring` — quota delle fisse sulle uscite |

**Intervento.**

1. **Deciso (§4.6).** `Gauge` → il numero grande **sopra**, e sotto una **barra divisa in segmenti** (speso ·
   impegnato · da parte · libero). `StackBar` (`charts.tsx:341`) fa già esattamente questo, e la
   legenda sotto al numero (`page.tsx:135-142`) resta valida così com'è. Togliendo l'anello,
   **RIL-001 si chiude da sé**: il numero non ha più niente sopra o dietro. Va comunque
   ricontrollato a finestra larga, perché la causa (testo che scala, contenitore che non scala)
   va corretta lo stesso.
2. `Ring` → barra. Dove serve una percentuale in poco spazio, `ProgressTrack`
   (`charts.tsx:379`) con il numero accanto; nelle tre porte di Oggi, una barrina sotto
   l'etichetta.
3. Marcare `Gauge` e `Ring` come deprecati in `charts.tsx` e **toglierli** quando l'ultimo
   chiamante è sparito, altrimenti rientrano dalla finestra alla prossima schermata nuova.

#### B5 · Scrivere le regole

In `design/DIREZIONE-A.md`, sezione del vocabolario grafico, tre righe che valgono da qui in
avanti:

- **Niente forme circolari** — né anelli, né ciambelle, né torte. Quantità e proporzioni si
  leggono per lunghezza.
- **Eventi = barre, saldo = linea.** Spese ed entrate esistono solo quando accadono; il saldo
  esiste in ogni istante.
- **Ogni grafico dichiara la sua scala.** Un asse Y senza valori mostra la forma e nasconde la
  quantità.

Aggiornare di conseguenza l'intestazione di `charts.tsx:5-11` («cinque forme, sempre le stesse»),
che dopo B4 non sarà più vera.

---

### 4.4 Lotto C — la parola «periodo» (RIL-005)

**Verità del modello dati, accertata.** Il tetto **non** è né mensile né annuale per definizione:
vale per **il periodo selezionato in cima all'app**.

- `src/app/budget/page.tsx:81` legge lo stato con `budgetService.getStatus(range, scope)`, dove
  `range` viene da `usePeriod()` (riga 58);
- `src/app/budget/page.tsx:117` salva passando `range.start` come inizio validità;
- `supabase/migrations/20260101000100_budgets.sql:172-235` (`set_budget`) versiona il tetto da
  quella data in poi e lascia intatti i periodi già chiusi — la frase in cima alla modale è
  quindi corretta;
- `src/context/PeriodContext.tsx:76-175`: il periodo è **sempre di lunghezza mensile**, o mese
  solare o mese che parte dal giorno scelto nelle impostazioni.

Quindi la risposta alla domanda «quale periodo?» è: **il mese corrente dell'utente**, con il suo
nome già pronto in `usePeriod().label` (righe 158-171) — quello che la barra mostra come
«Settembre 2026».

**Intervento.** In `src/app/budget/page.tsx`:

- etichetta del campo (riga 446): da «Tetto per periodo» a **«Tetto per {label}»**, cioè «Tetto
  per Settembre 2026»;
- testo d'aiuto (riga 450): «Quanto vuoi poter spendere al massimo in questa categoria **ogni
  mese**»;
- `description` della modale (riga 410): nominare il mese, dicendo che vale da questo in avanti e
  che i mesi già chiusi non cambiano.

**Attenzione.** Se l'utente naviga su un mese passato e salva, il tetto viene versionato **da quel
mese**. Con l'etichetta che nomina il periodo il comportamento diventa finalmente leggibile, ma va
provato a schermo che sia quello voluto.

**Verifica.** La parola «periodo» va poi cercata in tutta l'interfaccia
(`grep -rn "periodo" src/app src/components`) e chiarita ovunque sia ambigua allo stesso modo.

---

### 4.5 Lotto D — Fisse e abbonamenti (RIL-008, RIL-009, RIL-010)

#### D1 · «Scadute» → «Concluse» (RIL-009)

**Dove.** `src/app/ricorrenti/page.tsx`: riga 28 (il tipo `Vista`), 63, 68, 90 (etichetta della
scheda), 151 («Ricorrenze finite»), 163 («Nessuna ricorrenza scaduta»).

**Intervento.** Rinominare l'etichetta e i testi di contorno. Il valore interno del tipo può
restare `"scadute"`, ma conviene rinominarlo anch'esso per non lasciare due parole per la stessa
cosa; `RecurringItem.ended` in `recurringService.ts` **non si tocca**: è un fatto, non una parola
dell'interfaccia. Da rivedere anche la pastiglia «finita il …» della riga
(`ricorrenti/page.tsx:271`), che oltre alla parola mostra **la data grezza** `endDate` senza
formattarla.

#### D2 · Modifica dalla pagina (RIL-008)

**Riusabile, verificato.** `src/components/expenses/EditExpenseModal.tsx` è già un componente a
sé, con `{ isOpen, onClose, onSuccess, expense, scope }` (righe 18-24), e gestisce anche
l'aggiornamento delle occorrenze future (`updateFuture`, riga 45). Oggi ha **un solo chiamante**:
`src/app/spese/page.tsx:393`.

**Intervento.** Rendere apribile la riga `RicorrenzaRow` (`ricorrenti/page.tsx:244`) e montare
`EditExpenseModal` sulla pagina passando `item.expense` — che è la spesa **padre** della
ricorrenza — e lo `scope` corrente; `onSuccess` ricarica il riepilogo. L'inserimento non si tocca:
il pulsante «Nuova» (righe 76-78) porta già a `/spese/nuova`.

**Vincolo.** Va eseguito **dopo il lotto A**: `EditExpenseModal` usa lo stesso guscio `Modal`,
quindi oggi porterebbe il difetto del fuoco anche qui.

#### D3 · Storico e previsto (RIL-010)

**Fattibilità, verificata: nessuna tabella nuova.** Le occorrenze di una ricorrenza sono già righe
di `spese` con `recurring_parent_id` valorizzato — generate in blocco alla creazione
(`src/services/expenseService.ts:302-343`) e usate per l'aggiornamento delle future (righe
428-444). Lo storico quindi **esiste già a database**: va solo letto.

**Intervento.**

1. In `src/services/recurringService.ts` (oggi 112 righe, un solo metodo `getSummary`) aggiungere
   `getLife(parentId)`: legge le `spese` con quel `recurring_parent_id` ordinate per `data_spesa`,
   le divide in **già avvenute** e **future** rispetto a oggi, e somma le due parti.
2. Mostrarle nel dettaglio della voce, insieme alla modifica di D2: una sola schermata, non due.
3. Le variazioni d'importo nel tempo si leggono dalle occorrenze stesse: importi diversi sulla
   stessa ricorrenza **sono** la storia delle variazioni.

**Fin dove arriva il previsto: l'anno solare in corso** (decisione presa, §4.6). Il dettaglio di
una voce mostra tre righe e un totale:

| Riga | Cosa conta |
|---|---|
| **Storico** | Le occorrenze dell'anno mostrato già passate, con importi e date |
| **Previsto** | Le occorrenze da oggi al **31 dicembre** dell'anno mostrato |
| **Nel «anno»** | La somma delle due: è la risposta a «quanto mi costa quest'anno» |
| **In tutto** | Da sempre a sempre, in coda: è la *vita* della voce, che è ciò che RIL-010 chiedeva |

**Perché non la tariffa.** Il «€/anno» mostrato oggi in pagina (`recurringService.ts:78`,
`perYear`) è `importo × occorrenze all'anno`: una **tariffa**, non una previsione. Un
abbonamento da 11,99 € al mese aperto a novembre lì dentro vale 143,88 €, mentre nel 2026 costa
23,98 €. Il prospetto di D3 conta **le occorrenze vere**, quindi dice 23,98 €: è il motivo per cui
questo rilievo non si chiude riciclando il numero che c'è già.

**Perché non «tutto il futuro».** Le occorrenze future esistono già a database — sono generate in
blocco alla creazione — ma fino a `data_fine` o, se manca, **fino a dieci anni**
(`src/services/expenseService.ts:274-281`). Per una spesa mensile sono 120 righe, per una
giornaliera 3.650: un totale su quell'orizzonte sarebbe un numero enorme e privo di significato.
L'anno solare taglia dove la domanda ha senso.

**Voci concluse** (RIL-009): hanno storico e **nessun previsto**. Mostrano «Nel «anno»» solo se
sono arrivate dentro quell'anno, e sempre «In tutto»: una voce finita resta interessante per
quanto è costata, non per quanto costerà.

---

### 4.5-bis Lotto E — le quote per percentuale (RIL-011)

**Causa, verificata.** `src/components/expenses/SplitEditor.tsx:30-45`: `ripartisci` normalizza
sempre, quindi l'avviso «devono fare 100» non impedisce niente e il salvataggio scrive quote
diverse da quelle digitate.

**Intervento.** Dipende dalla decisione (§4.6, decisione 5): o il salvataggio si blocca finché la
somma non fa 100, o la normalizzazione diventa esplicita — quote in euro in evidenza e avviso di
errore tolto, perché direbbe il falso. In entrambi i casi `ripartisci` resta com'è: è corretta,
è il contratto attorno a lei che non lo è.

**Verifica.** Scrivere 70 e 20 su una spesa da 100 e controllare che accada **una** delle due
cose annunciate, non una terza. Poi 50 e 50, che deve continuare a funzionare come oggi.

---

### 4.5-ter Lotto F — il colore dei pulsanti (RIL-012)

**Causa, verificata.** `src/app/globals.css:223`, regola non inserita in un `@layer`: batte le
utility di Tailwind e impone `color: inherit` a ogni `<button>`.

**Intervento.** Tenere `font: inherit` (serviva a Safari per i campi nativi) e togliere
`color: inherit` dai pulsanti, oppure spostare l'intera regola dentro `@layer base`. Una riga.

**Verifica.** «Aggiungi spesa» leggibile in tema **chiaro**; «Salva» in una modale con testo
**scuro** su azzurro in tema scuro; un pulsante `danger` bianco su rosso; `ghost` e `secondary`
invariati. Da guardare nei due temi, perché il difetto si manifesta in modo diverso.

**Va eseguito insieme al lotto A**, prima di tutto il resto: finché c'è, ogni giudizio sulla resa
a schermo è falsato — e il tema chiaro non è ancora stato guardato da questa revisione.

---

### 4.5-quater Lotto G — le quote che spariscono (RIL-013)

**Causa, verificata.** Tre righe in due file: `EditExpenseModal.tsx:80` azzera le quote
all'apertura e non le rilegge; `SplitEditor.tsx:96-101` notifica il genitore già al montaggio;
`EditExpenseModal.tsx:249-250` interpreta quella notifica come «l'utente ha toccato le quote», e
alla riga 121 le riscrive — cioè le cancella.

**Intervento.** (a) leggere le quote della spesa all'apertura e passarle a `SplitEditor` come
stato iniziale; (b) non far contare la notifica di montaggio; (c) verificare che la rimozione
volontaria continui a funzionare.

**Verifica.** Dividere una spesa 70/30, chiudere, riaprire: la modale deve **mostrare 70/30**.
Cambiare solo la nota e salvare: il conguaglio non deve muoversi. Poi rimettere «Parti uguali» di
proposito e salvare: ora sì che deve tornare 50/50.

**Precede il collaudo del caso 3**: finché c'è, quello che si legge a schermo non è quello che è
scritto, e nessuna verifica sulle quote è attendibile.

---

### 4.6 Decisioni prese

Quattro punti che cambiavano il lavoro, **decisi il 19/09/2026** prima di cominciare a scrivere
codice. Sono qui perché chi esegue sappia non solo cosa fare, ma cosa era stato scartato.

| # | Decisione | Scelta | Dove si applica |
|---|---|---|---|
| 1 | Che forma prende il numero principale di Oggi tolto l'anello | **Numero grande, sotto una barra divisa in segmenti, e la legenda che c'è già** | §4.3 · B4 |
| 2 | Raggruppamento del Report sugli intervalli lunghi | **Soglia automatica a tre scalini**: giorno fino a 35 giorni, settimana lun–dom fino a 6 mesi, mese oltre — e il riquadro dichiara sempre quale sta usando | §4.3 · B3 |
| 3 | Orizzonte del «previsto» nelle ricorrenti | **Anno solare in corso**, contato sulle occorrenze vere e non sulla tariffa `perYear`, più un totale «in tutto» per la vita della voce | §4.5 · D3 |
| 4 | La didascalia «barra piena / tratteggiata» del grafico in Analisi, dove però c'è una linea | **Resta com'è**: osservata in revisione, non segnalata come rilievo, non si tocca | — |
| 5 | Quote per percentuale che non fanno 100 (RIL-011) | **Da decidere**: rifiutare il salvataggio, oppure normalizzare dichiarandolo | §4.5-bis · E |

**Cosa è stato scartato, e perché.**

- *Raggruppamento sempre settimanale* (decisione 2): risolve i novanta giorni ma rompe l'altro
  estremo — su una settimana sola resta una barra sola, su due anni tornano 104 barre. *Selettore
  manuale giorno/settimana/mese*: più controllo, ma un comando in più in una pagina che ha già
  filtri, categorie e intervallo. La soglia automatica non chiede niente a chi guarda, purché
  dichiari cosa sta facendo — da cui l'obbligo dell'etichetta.
- *Previsto sui dodici mesi scorrevoli* (decisione 3): il totale non perde significato a dicembre,
  ma non risponde alla domanda che ci si fa davvero («quanto mi costa quest'anno») e non si
  confronta con lo storico dell'anno. *Previsto fino alla fine della ricorrenza*: onesto su chi ha
  una scadenza — un finanziamento a 18 rate — ma su chi non ce l'ha sono dieci anni di righe.
  Se un giorno le voci con `data_fine` meritassero un trattamento a sé, è da lì che si
  ripartirebbe.

### 4.7 Ordine di esecuzione

1. **A** e **F** insieme — il guscio delle modali e il colore dei pulsanti. Prima di tutto: finché c'è, ogni prova che richieda di scrivere
   in una modale è falsata.
1-bis. **G** — le quote che spariscono: prima di riprendere il collaudo del caso 3.
2. **D1** e **C** — le parole. Piccole, indipendenti, chiudono due rilievi in poco.
3. **B1** e **B2** — scala sull'asse Y e riquadro fuori dalla modalità Semplice. Due modifiche
   circoscritte, effetto immediato su tre schermate.
4. **D2** e **D3** — modifica e storico delle ricorrenti. Una sola schermata di dettaglio,
   progettata una volta sola.
5. **B3** — il Report a barre, con il riempimento dei giorni vuoti.
5-bis. **E** — le quote per percentuale, appena presa la decisione 5: è piccolo e tocca un numero che qualcuno dovrà rimborsare.
6. **B4** e **B5** — via i cerchi e regole scritte. Per ultimo perché è il più esteso e tocca sei
   pagine; dopo B4 va riletto RIL-001 a schermo largo.

### 4.8 Verifica di chiusura

Per ogni lotto, prima di dirlo chiuso:

- `npx tsc --noEmit`, `npm run lint`, `npm run build` — è la verifica che il progetto ha oggi, non
  esistendo ancora una suite di test (OP-029);
- la prova a schermo del rilievo, **da app web desktop**, dove è stato osservato;
- per i rilievi di `interfaccia` (RIL-001), la stessa prova anche a finestra stretta e su telefono:
  §1-bis.

**Da non confondere con il collaudo.** `COLLAUDO.md` (OP-021) resta **da eseguire**: i suoi sei
casi verificano che i moduli nuovi facciano la cosa giusta a database — versionamento del tetto,
accantonamento, quote, scontrini, modalità, e soprattutto il caso 6 con due utenti di gruppi
diversi. Questa revisione ha guardato altro. I due lavori non si sostituiscono a vicenda, e il
collaudo **va fatto comunque**: semmai RIL-004 spiega perché finora era faticoso arrivare in fondo
a un inserimento.

---

## 5. Cosa è stato fatto — 19/09/2026

Tutti e tredici i rilievi sono stati implementati nella sessione del 19/09, nell'ordine del
§4.7. **Verifiche superate: `npx tsc --noEmit`, `npx eslint`, `npm run build`.** Nessun errore
nuovo; i `no-explicit-any` che l'eslint continua a segnalare nei service sono preesistenti e
tracciati a parte (OP-027).

⚠️ **Quello che manca è guardare l'app.** Nessuna di queste correzioni è stata vista a schermo:
la prova è nel §5.3, ed è la parte che il codice non può fare da sé.

### 5.1 Le correzioni, lotto per lotto

| Lotto | Punto | Cosa è cambiato | File |
|---|---|---|---|
| **A** | OP-033 | `Modal` non si rimonta più a ogni carattere: `onClose` vive in una ref, il trap della tastiera è stabile, il fuoco iniziale dipende solo dall'apertura e cerca **il primo campo**, non il primo bottone (che era la X) | `ui/kit.tsx` |
| **F** | OP-038 | `color: inherit` non vale più per i `<button>`: resta sui campi, dove serviva a Safari. Il testo dei pulsanti torna a essere quello del variant | `app/globals.css` |
| **G** | OP-039 | La modale di modifica **legge** le quote salvate e le mostra; `SplitEditor` non avvisa più il genitore al montaggio, quindi aprire e salvare non le cancella | `expenses/EditExpenseModal.tsx`, `expenses/SplitEditor.tsx` |
| **E** | OP-037 | Percentuali che non fanno 100: il salvataggio **si ferma**, con l'errore sotto al riquadro. Niente più normalizzazione silenziosa | `expenses/SplitEditor.tsx`, `spese/nuova/page.tsx`, `EditExpenseModal.tsx` |
| **C** | OP-035 | «Tetto per periodo» → **«Tetto per ‹mese›»**, con l'aiuto che dice «ogni mese» e la descrizione che nomina il mese di partenza | `budget/page.tsx` |
| **D** | OP-036 | «Scadute» → **«Concluse»** (e la data di fine ora è formattata); le righe si **aprono** su un dettaglio con storico, previsto, «Nel ‹anno›» e «In tutto»; da lì si **modifica** la voce riusando `EditExpenseModal` | `ricorrenti/page.tsx`, `services/recurringService.ts` |
| **B1** | OP-034 | `AreaTrend` **dichiara la scala**: cinque linee di griglia etichettate, minimo e massimo compresi, con gli importi in forma corta | `ui/charts.tsx` |
| **B2** | OP-034 | «Andamento del saldo» in Oggi è ora `adv-only`: sparisce in modalità Semplice | `app/page.tsx` |
| **B3** | OP-034 | Il Report passa **a barre**. La serie si costruisce dall'**intervallo** e non dai dati, quindi i giorni vuoti esistono e valgono zero; il raggruppamento è automatico (giorno ≤35 gg · settimana ≤6 mesi · mese oltre) e **dichiarato** nell'intestazione del riquadro | `lib/reportSeries.ts` (nuovo), `reports/TrendChart.tsx`, `report/page.tsx` |
| **B4** | OP-034 | `Gauge` → **`SplitBar`** (numero grande sopra, barra a segmenti sotto) e `Ring` → **`MiniBar`**. Nessuna forma circolare resta nell'app. Il numero di «Puoi spendere» non ha più niente sopra né dietro: RIL-001 si chiude di conseguenza | `ui/charts.tsx` e i sei chiamanti |
| **B5** | OP-034 | Le tre regole scritte nella specifica di prodotto, con la tabella delle forme aggiornata | `design/DIREZIONE-A.md §2` |

### 5.2 Una decisione presa strada facendo

La **decisione 5** del §4.6 era rimasta aperta: davanti a percentuali che non fanno 100,
rifiutare o normalizzare dichiarandolo? È stata scelta la **prima**, come suggeriva la nota del
rilievo: nel resto dell'app un avviso significa che qualcosa non si può fare, e una
normalizzazione silenziosa su una cifra che qualcuno dovrà rimborsare è il tipo di sorpresa che
fa perdere fiducia nei numeri. Il messaggio dice quanto fanno le percentuali e quanto devono
fare.

Se si preferisse l'altra strada, il punto da cui ripartire è `SplitEditor.tsx`, variabile
`erroreQuote`: mostrare le quote in euro e togliere il blocco è più breve che scriverlo.

### 5.3 Le prove a schermo, da fare

Il codice compila e le regole sono scritte, ma **nessuno ha ancora guardato**. Da provare, in
ordine:

| # | Prova | Perché |
|---|---|---|
| 1 | In «Nuova busta» scrivere `400` di seguito, senza rientrare nel campo. Poi ogni campo di «Nuovo obiettivo», data compresa | OP-033. Verificare anche che **Esc** chiuda, che **Tab** resti dentro al pannello e che alla chiusura il fuoco torni al pulsante che aveva aperto |
| 2 | **In tema chiaro**: «Aggiungi spesa» in «Andamento del saldo», «Segna come saldato» in Famiglia, un pulsante rosso di eliminazione | OP-038. Poi le stesse cose in tema **scuro**: «Salva» in una modale deve essere **scuro su azzurro**, non chiaro |
| 3 | Dividere una spesa 70/30, chiudere, **riaprire**: deve mostrare 70/30. Cambiare solo la nota e salvare: il conguaglio **non si muove**. Poi rimettere «Parti uguali» di proposito: ora sì che torna 50/50 | OP-039, il difetto peggiore trovato: silenzioso e su un dato che dice chi deve quanto |
| 4 | Percentuali 70 e 20 → il salvataggio si ferma con l'errore; 70 e 30 → passa | OP-037 |
| 5 | Oggi: il numero grande sopra la barra a segmenti, leggibile **a finestra larga e stretta**; nessun cerchio in Budget, Obiettivi, Fisse, Nuova spesa | OP-034 · RIL-001, RIL-002 |
| 6 | Modalità **Semplice**: «Andamento del saldo» non c'è. Modalità **Avanzata**: c'è, e ha i valori sull'asse Y. Stessa cosa in Analisi → Saldo | OP-034 · RIL-003, RIL-006 |
| 7 | Report su **ultimi 30 giorni** (barre giornaliere), poi su **ultimi 90** (barre settimanali) e su **quest'anno** (mensili): l'intestazione deve dire quale raggruppamento sta usando, e un giorno senza movimenti deve essere vuoto | OP-034 · RIL-007 |
| 8 | Fisse e abbonamenti: la scheda si chiama **«Concluse»**; una riga si apre e mostra storico, previsto e totali; da lì si modifica la voce e il cambiamento si vede tornando all'elenco | OP-036 · RIL-008, RIL-009, RIL-010 |
| 9 | Budget: la modale dice **«Tetto per Settembre 2026»** | OP-035 · RIL-005 |

Poi c'è il **collaudo** (`COLLAUDO.md`), che è un'altra cosa e resta in piedi: i casi 3 e 6 non
sono ancora passati, e il 5 non è mai stato provato.

### 5.4 Quello che questa sessione non ha toccato

- **Il resto della revisione**: Spese, Famiglia, Promemoria, Altro e Impostazioni non sono ancora
  stati guardati, e **il tema chiaro non è mai stato esaminato** — il difetto dei pulsanti era il
  primo che si incontrava, e finché c'era non aveva senso.
- **Le prove su telefono e PWA installata**: §1-bis. Ogni rilievo di `interfaccia` è stato
  osservato e corretto su web desktop.
- **OP-022**, l'accantonamento automatico da pianificare, e il dubbio che ne discende: la
  schermata Obiettivi dice «gli automatismi girano una volta al giorno sul database», ma
  `run_auto_contributions()` non è pianificata e nessuno in `src` la chiama. **Non è ancora un
  rilievo**: è una domanda rimasta senza risposta. *(Risposta il 26/09: RIL-018, §6.)*

---

## 6. Secondo giro — 26/09/2026

Svolto su **GruppoTest** (account Edi Dev), web desktop, in **tema chiaro e scuro**, in modalità
**Semplice e Avanzata**, e a **390 px di larghezza** (vista telefono simulata in un iframe: la
finestra di prova non si lasciava ridimensionare). Ogni numero a schermo è stato confrontato con
il database via MCP. Alla verifica si è aggiunta la richiesta di **rendere l'app più semplice da
usare, soprattutto in modalità Semplice**: gli interventi `ux` vengono da lì.

Dati di prova creati o modificati, tutti su GruppoTest: busta «Test 1» a 400 €, obiettivo
«Vacanza test» (500 € entro il 31/12), spesa di agosto da 250 € su «Test 1», ricorrenza «Test
condivisione» portata da 15 a 16 € su tutte le 121 occorrenze, promemoria «Bolletta luce test»,
un invito creato e annullato. A fine giro l'account è tornato in tema chiaro e modalità Avanzata.

### 6.1 Le nove prove del §5.3

| # | Esito | Note |
|---|---|---|
| 1 | ✅ | «Nuova busta» e «Nuovo obiettivo»: si scrive di seguito in ogni campo, data compresa; Esc chiude e il fuoco torna al pulsante che aveva aperto |
| 2 | ✅ | Tema chiaro: «Aggiungi spesa», «Salva», «Segna come saldato» bianchi su blu; il rosso di conferma bianco su rosso. Tema scuro: «Aggiungi spesa» scuro su azzurro. **Ma** la regola di OP-038 aveva una seconda metà: RIL-016 |
| 3 | ✅ | Già passata nel collaudo del 26/09 (`COLLAUDO.md` caso 3) |
| 4 | ✅ | Già passata nel collaudo del 26/09 (`COLLAUDO.md` caso 3.4) |
| 5 | ✅ | Nessun cerchio in Oggi, Budget, Obiettivi, Fisse; il numero di Oggi è leggibile a finestra larga e a 390 px |
| 6 | ✅ | Semplice: «Andamento del saldo» non c'è. Avanzata: c'è, con la scala — ora a numeri tondi (RIL-021) |
| 7 | ✅ | 30 giorni → per giorno; 3 mesi → per settimana lun–dom (13 barre); quest'anno → per mese (gen–set). L'intestazione lo dice sempre |
| 8 | ✅ | «Concluse»; il dettaglio mostra storico e previsto; la modifica passa a tutte le 121 occorrenze e l'elenco si aggiorna. Due etichette corrette (RIL-019) |
| 9 | ✅ | «Tetto per Settembre 2026», aiuto «ogni mese» |

### 6.2 Rilievi nuovi

Stessa scheda del §1, in forma compatta. **Tutti corretti nel codice il 26/09 e provati a
schermo**, salvo dove detto.

| Rilievo | Asse · gravità | Cosa non tornava | Causa e correzione |
|---|---|---|---|
| **RIL-014** · La prima rata delle ricorrenti sparisce dai conti | correttezza · **alta** | GruppoTest aveva una spesa ricorrente da 15 € del 16/09, non confermata: Oggi diceva «Impegnato 0,00 €» e «Da confermare 0», Movimenti non la elencava, il Report sì | `createExpense` salva la riga capostipite come **prima occorrenza** e genera le figlie dalla data successiva; il frontend nuovo la scartava (`!is_recurring_parent`) in `finance.ts`, Movimenti, Analisi, dettaglio busta, conguaglio locale e storico di Fisse. Verificato che nessuna figlia cada nella stessa data (niente doppioni) e che la versione committata la contasse. Filtro tolto ovunque. Riguarda **24 ricorrenze** fra tutti i gruppi. Le tre funzioni SQL con lo stesso filtro (`get_budget_status`, `get_settlement`, `get_settlement_totals`) sono corrette in `supabase/migrations/20260101000700_recurring_first_occurrence.sql` — **applicata la sera del 26/09 e verificata** (§6.4) |
| **RIL-015** · «Chi ha pagato» nel Report filtra chi ha inserito | correttezza · media | Il filtro passa `p_filter_user_id`, che le RPC confrontano con `spese.user_id` (chi ha inserito), non con `paid_by` | Prima rinominato «Inserita da»; poi, la sera, le tre RPC del Report portate su `paid_by` con `20260101000800_report_filter_paid_by.sql` e l'etichetta tornata **«Chi ha pagato»** (OP-045, §6.4) |
| **RIL-016** · Dimensione e peso del testo ignorati su campi e pulsanti | interfaccia · **alta** | L'importo di «Aggiungi una spesa», dichiarato 46 px extrabold, usciva a 16 px normale | La seconda metà di OP-038: `font: inherit` era rimasto **fuori da ogni `@layer`** e batteva ogni `text-*` / `font-*` su input e pulsanti di tutta l'app. Regola spostata in `@layer base` (`globals.css`) |
| **RIL-017** · La linea «già successo» contava le voci non confermate | correttezza · media | Il punto «oggi» del grafico valeva −326 €, «In cassa oggi» −310 € | `finance.ts` cumulava tutte le righe. Ora fino a oggi solo il reale; le non confermate già scadute entrano nel tratto previsto dal giorno dopo |
| **RIL-018** · Obiettivi promettono un automatismo che non gira | chiarezza · media | «gli automatismi girano una volta al giorno sul database», ma `cron.job` contiene solo il job delle notifiche | È OP-022. La pagina ora dice che l'accantonamento automatico **non è ancora in funzione** e che si versa a mano; un solo interruttore (`AUTO_CONTRIBUTIONS_SCHEDULED` in `moduleState.ts`) da girare quando il job esiste |
| **RIL-019** · Fisse: «Già pagato» e «da sempre» | chiarezza · media | «Già pagato · 1 volta» contava una rata da confermare; «In tutto, da sempre · 1.815 €» sommava rate generate fino al 2036 | «Già scaduto nel 2026 · 1 volta · 1 da confermare» e «In tutto, fino al 16/09/2036» |
| **RIL-020** · Nomi troncati a una lettera | interfaccia · media | In «Dove vanno i soldi» (colonna stretta) «T.», «P…» al posto dei nomi | In `CatRow` la barra aveva larghezza fissa e cedeva il nome: ora si restringe lei, e il nome ha un minimo |
| **RIL-021** · Asse Y a numeri casuali | chiarezza · bassa | Tacche 38, −67, −173… e scala sopra lo zero anche col saldo sempre negativo | `AreaTrend` usa passi tondi (1 · 2 · 2,5 · 5 × 10ⁿ): 0, −100 … −400 |
| **RIL-022** · Report, riga senza nome | chiarezza · bassa | «Dove spendi di più · 1 voci» con una riga vuota | «Senza negozio», «1 voce» |
| **RIL-023** · Promemoria e Inviti fuori dal kit | interfaccia · media | Modale promemoria senza `role="dialog"` né trappola del fuoco, pulsanti `text-white` su accento (illeggibili in scuro, come RIL-012), «Ambito», «0.00»; Inviti senza intestazione, `confirm()` nativo, «Scade tra 1 giorni» | Riscritte sul kit (`Modal`, `Field`, `Chip`, `SegTabs`, `ConfirmModal`). Il promemoria parte fra un'ora invece che «adesso», in ora locale (prima UTC: fra mezzanotte e le 2 proponeva il giorno prima); un salvataggio fallito ora lo dice. Inviti: «Copia il codice», annullamento con conferma, verificato `status = cancelled` a database |
| **RIL-024** · Telefono: «Salva» coperto, Obiettivi che scorre | interfaccia · media | A 390 px il «+» della barra in basso copriva «Salva» in «Aggiungi una spesa»; in Obiettivi «Modifica» usciva dal bordo | Barra in basso nascosta su `/spese/nuova` (ha la sua barra e la freccia indietro); «Modifica» solo icona sotto i 640 px |
| **RIL-025** · Due selettori del portafoglio uno sopra l'altro | ux · bassa | Da desktop GruppoTest / Edi compariva nella barra laterale **e** nell'intestazione di ogni pagina | Nell'intestazione solo sotto i 1024 px (`ScopeSwitch`, prop `inSidebar`) |

**Modalità Semplice** — gli interventi `ux`, con il criterio di `DIREZIONE-A` (una domanda per
schermata, al massimo tre blocchi):

| Schermata | Prima | Ora |
|---|---|---|
| Oggi | «Puoi spendere −310 €» e «circa −77,50 € al giorno»; riquadro «Da confermare · Tutto confermato» accanto alla tessera «Da confermare 0» in arancione | Col saldo negativo: «Sei oltre il disponibile · 326,00 €» e «ogni nuova spesa allarga lo scoperto». Il riquadro compare solo se c'è qualcosa da confermare; a zero la tessera mostra una spunta verde e «tutto confermato» |
| Movimenti | Riepilogo a sei cifre sempre visibile; «Con le previsioni −310 €»; ogni riga ripeteva la categoria sotto il titolo | Riepilogo solo in Avanzata, colonna unica; «Saldo stimato a fine periodo»; la categoria sotto solo se il titolo è il negozio |
| Aggiungi una spesa | Tutti i campi insieme; fuoco da nessuna parte; «€» lontano dalla cifra | Fuoco sull'importo; «Dove», «Si ripete», «Scontrino», «Nota» dietro **«Altri dettagli»** (si apre da solo se uno è già compilato; in Avanzata tutto a vista) |
| Budget | Due barre per lo stesso 25%; tessere «25» e «300,00 €» senza dire cosa; «Ritmo di spesa» di tutte le uscite | Una barra; «25%», «restano 300,00 €», stato con icona e parola (§7.1); ritmo solo in Avanzata; tessere su due colonne da telefono |
| Obiettivi | Traguardo con data senza sapere quanto versare | «mancano 500,00 € · entro 31/12/2026 · circa 125,00 € al mese» |
| Analisi | Pastiglia «↘ 95%» senza dire di cosa; nessun confronto, benché la domanda sia «rispetto al solito» | «Il periodo prima: 250,00 € · questo, a fine periodo, +30%» (media fino a tre periodi) |
| Famiglia | Tre blocchi, i primi due con gli stessi 130 / 120 | «Chi ha anticipato» solo in Avanzata: restano le barre e il conguaglio |
| Fisse | Barra piena al 100% sopra la nota «sono il 5%»; «Le più care» ripeteva l'elenco | Composizione solo con più voci, e dichiarata; «Le più care» solo in Avanzata. Da qui la modifica parte con «aggiorna le occorrenze future» già acceso |

Trasversale: quando in Semplice la colonna laterale contiene solo blocchi `.adv-only`, sparisce e
la principale prende tutta la larghezza (`PageBody` passa da grid a flex: `:has()` annidato non è
CSS valido); i grafici a barre non ingrandiscono testo e barre oltre 1,3 volte; da desktop
Profilo e Impostazioni non mostrano più la freccia verso «Altro», che è il menu del telefono.

### 6.3 Verifiche

`npx tsc --noEmit` pulito; `npx eslint src` senza errori nuovi (i 21 residui sono in `register`,
`DebugLog`, `expenseService`, file non toccati: OP-027); `npm run build` riuscito.

### 6.4 Chiusura — 26/09/2026, sera

Riconnesso l'MCP in scrittura, applicate via MCP (`apply_migration`) le due migrazioni che
restavano, ciascuna con un caso di prova costruito **prima** per vedere il numero cambiare:

| Migrazione | Caso di prova su GruppoTest | Prima | Dopo | Esito |
|---|---|---|---|---|
| `20260101000700_recurring_first_occurrence.sql` (OP-044, RIL-014) | Ricorrenza «Abbonamento test», 30 € al mese dal 1/09, conferma automatica, anticipata da Edi; busta «Abbonamento test» da 100 € | Busta «0,00 € di 100,00 €»; conguaglio Edi +7 €; totali 310 € su 5 spese | Busta **30,00 €**; conguaglio Edi **+22 €** (anticipa 30, gliene spettano 15); totali **340 €** su 6, di cui 280 € anticipati | ✅ a database e a schermo (Budget, Famiglia) |
| `20260101000800_report_filter_paid_by.sql` (OP-045, RIL-015) | Report di settembre filtrato su Edi | 136 € su 3 spese — quelle **inserite** da Edi | **160 €** su 3 — quelle **pagate** da Edi, lo stesso numero degli anticipi in Famiglia; senza filtro 356 € invariati | ✅ a database e a schermo; l'etichetta torna «Chi ha pagato», con la nota che il fondo comune è escluso |

Dopo le due migrazioni i numeri di settembre si confermano fra loro su ogni schermata: speso
340 € in Oggi, Movimenti e Famiglia; 356 € di uscite previste nel Report, uguale alla stima di fine
periodo; il 1/09 compare nello storico di Fisse. Privilegi e `security invoker` delle funzioni
invariati; advisor di sicurezza identici alla linea di base di `RLS-BASELINE.md` (21 / 6 / 8 / 1).
`tsc`, `eslint` sui file toccati e `npm run build` puliti.

Resta fuori da OP-032 una sola cosa, che non si può fare da qui: la prova su **telefono vero e
PWA installata** (la vista a 390 px era simulata in un iframe). È registrata a parte come OP-048.

Dati di prova aggiunti in questa chiusura, su GruppoTest: la ricorrenza «Abbonamento test» e la
sua busta.
