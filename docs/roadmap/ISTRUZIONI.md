# Template Roadmap — istruzioni d'uso

## Come si apre
**Doppio clic su `Roadmap Progetto.dc.html`.** Nient'altro: niente server, niente `npx serve`,
niente connessione (i font di sistema sostituiscono IBM Plex se sei offline). Sposta o copia
sempre la **cartella intera**: la pagina legge i file che le stanno accanto.

## File
- `Roadmap Progetto.dc.html` — la vista (6 sezioni). **Non modificare** salvo cambi di layout.
- `roadmap.config.js` — la **configurazione**: logo, nome dell'organizzazione, sezioni attive,
  tema iniziale, nome dei file emessi. Si compila una volta, all'installazione.
- `roadmap.data.js` — i **contenuti**. È il file da aggiornare a ogni SAL. Definisce
  `window.roadmap`: non trasformarlo in modulo ES (`export`), altrimenti la pagina non si apre
  più con doppio clic. Stessa regola per `roadmap.config.js` (`window.roadmapConfig`).
- `support.js` — runtime della vista.
- `vendor/react*.production.min.js` — React 18.3.1 in locale, per funzionare offline.
- `crea-file-unico.js` — genera la copia condivisibile (vedi "Condividere la roadmap").
- `imposta-logo.js` — imposta, incorpora o toglie il logo nella configurazione.
- `assets/` — le immagini. `logo-sc-italia.png` è un preset disponibile, **non** attivo per default.

Per aggiungere il template a un progetto: copia i file in `docs/roadmap/`, la skill in
`.claude/skills/roadmap-progetto/`, **configura** (sotto), poi svuota i dati di esempio in
`roadmap.data.js` e compila.

## Configurazione — si fa per prima

La roadmap nasce **senza logo e senza nome di azienda**: è neutra finché non la personalizzi.

### Il logo
```
node imposta-logo.js assets/logo-cliente.png     incorpora l'immagine (consigliato)
node imposta-logo.js --preset sc-italia          usa un logo già presente in assets/
node imposta-logo.js --elenco                    mostra i preset disponibili
node imposta-logo.js --vuoto                     toglie il logo
node imposta-logo.js --aiuto                     tutte le opzioni
```
Il comando converte l'immagine in `data:URI` e la scrive in `branding.logo`. Serve perché gli
export HTML prodotti dal browser sono file singoli: un logo indicato come percorso lì dentro
punta a una cartella che il destinatario non ha, e non si vede.

Per aggiungere un preset tuo: metti l'immagine in `assets/` chiamandola `logo-<nome>.png`
(vanno bene anche `.jpg`, `.svg`, `.webp`) e la ritrovi con `--elenco`.

### Le altre chiavi

| Chiave | Valori | Default | Effetto |
|---|---|---|---|
| `branding.logo` | `""`, percorso, `data:`, `http(s):` | `""` | Logo in intestazione, export e PDF |
| `branding.logoAlt` | testo | `""` | Testo alternativo (vuoto → `organizzazione`, poi "Logo") |
| `branding.logoAltezza` | px | `26` | Altezza del logo |
| `branding.logoPlaccaTemaScuro` | `true`/`false` | `true` | Placca chiara dietro il logo in tema scuro |
| `branding.organizzazione` | testo | `""` | Nome nel piè di pagina di vista, export e PDF |
| `vista.temaIniziale` | `auto`/`light`/`dark` | `auto` | Tema alla prima apertura |
| `vista.vistaIniziale` | id di sezione | `sal` | Sezione aperta all'avvio |
| `vista.mostraEsportazione` | `true`/`false` | `true` | Pulsanti Esporta HTML / Stampa |
| `vista.sezioni.<id>` | `true`/`false` | tutte `true` | Sezioni attive (`sal`, `funzInt`, `tecInt`, `roadCli`, `funzCli`, `tecCli`) |
| `output.prefisso` | testo | `"RoadMap"` | Prefisso del file emesso |
| `output.nomeProgetto` | testo | `""` | Forza il nome nel file emesso |

Ogni chiave assente o vuota ricade sul default: una configurazione incompleta non rompe nulla.
Se spegni tutte e tre le sezioni di un lato sparisce anche il pulsante Vista interna / Vista
cliente. ⚠️ Spegnere una sezione **nasconde la scheda, non toglie i dati dal file**: per un
documento da mandare fuori si usa **Esporta HTML**.

## Se la pagina resta bianca
Apri F12 → Console. Nella quasi totalità dei casi è un errore di sintassi in `roadmap.data.js`
o in `roadmap.config.js` (virgola o virgoletta) oppure manca una cartella (`vendor/`, `assets/`)
perché il file è stato spostato da solo. Il riquadro rosso "Dati non caricati" indica lo stesso
problema.

## Le sei sezioni

| Sezione | id | Chiave in `roadmap.data.js` | Destinatario |
|---|---|---|---|
| Roadmap interna & SAL | `sal` | `progetto`, `obiettivo`, `fasi`, `puntiAperti`, `puntiChiusi`, `rilasci`, `richiesteCliente`, `rischi`, `decisioni`, `changelog` | team + PM |
| Funzionale interna | `funzInt` | `funzionaleInterna`, `analisi` | analisti, dev |
| Tecnica interna | `tecInt` | `tecnicaInterna`, `team` | dev |
| Roadmap cliente | `roadCli` | `clienteRoadmap` (+ rilasci in produzione) | cliente |
| Funzionale cliente | `funzCli` | `clienteFunzionale` | cliente |
| Tecnica cliente | `tecCli` | `clienteTecnica` | cliente / IT cliente |

Le viste interne sono di dettaglio (id punti, owner, copertura test, debito, effort);
quelle cliente sono esplicative: nessun gergo, stati tradotti automaticamente
(`completato` → "disponibile", `in corso` → "in lavorazione", `pianificato` → "in programma",
`bloccato` → "in attesa").

## Funzioni della vista
- **Vista interna / Vista cliente** + le schede delle sezioni attive.
- **Tema chiaro/scuro** (pulsante in alto a destra, scelta memorizzata; con
  `logoPlaccaTemaScuro` il logo resta leggibile sul fondo scuro).
- **Esporta HTML** — genera un file autonomo con la **sola sezione visibile**, logo incluso,
  pronto da inviare al cliente (`codice_sezione_data.html`).
- **Stampa / PDF** — stampa la sola sezione visibile, senza barre di navigazione; per il file PDF
  scegli "Salva come PDF" nel dialogo di stampa del browser.
- Export e stampa escono **sempre in tema chiaro**, anche consultando il tema scuro.
- Stampa e PDF sono impaginati in A4 orizzontale con **una sezione per pagina** e blocchi mai
  spezzati a metà. Contenuti nuovi: racchiudili in un `<section>` per seguire la stessa regola.

## Condividere la roadmap
- **A un collega, interattiva e completa** → usa il file `RoadMap_NomeProgetto_vAAAAMMGG.nn.html`
  che trovi già nella cartella: lo genera la skill a ogni aggiornamento, non devi fare nulla.
  Se lavori senza Claude Code, lo produci a mano dalla cartella `docs/roadmap` con:
  ```
  node crea-file-unico.js
  ```
  È un solo file (~310 KB, ~330 KB con logo) con dentro tutto: si allega alla mail, si apre con
  doppio clic, funziona offline e mantiene schede, tema ed export.
  `AAAAMMGG` è la data di generazione e `nn` il progressivo del giorno (`01`, `02`, …): se
  emetti due revisioni nella stessa giornata, la prima non viene sovrascritta. Il prefisso
  `RoadMap` si cambia da `output.prefisso`.
  ⚠️ **Contiene anche le tre sezioni interne** (id punti, owner, debito, nomi del team):
  non inviarlo al cliente.
- **Al cliente** → apri la sezione cliente che ti serve e usa **Esporta HTML**: esce un file
  con quella sola sezione, già pulito dal gergo interno.
- **A chi deve aggiornarla** → zip dell'intera cartella `docs/roadmap`.

Il file unico è una fotografia datata: rigeneralo dopo ogni aggiornamento dei dati e non
modificarlo a mano, la sorgente resta `roadmap.data.js`. Alla fine lo script ti dice quante
sezioni sono attive e se il logo è finito dentro: se leggi "Nessun logo" e un logo lo volevi,
è la configurazione che manca.

**Le emissioni `RoadMap_*.html` si committano**, come ogni documento consegnato: sono lo storico
di cosa è stato inviato e quando, e git le comprime fra loro (cinque emissioni da 320 KB stanno
in ~98 KiB nel repo). Nel `.gitignore` va solo lo scarto: `docs/roadmap/*.bak` e `*.tmp`.

## Convenzioni dati
- `stato`: `pianificato` | `in corso` | `bloccato` | `completato`
  (per documenti e richieste anche `bozza`, `in revisione`, `approvato`, `da valutare`,
  `in analisi`, `accettata`, `rinviata`, `rilasciata`).
- `priorita` / `impatto` / `probabilita`: `alta` | `media` | `bassa`.
- Date sempre ISO `YYYY-MM-DD` (la vista formatta in gg/mm/aaaa).
- `fasi[].da` / `.a` generano il diagramma a barre e la linea "oggi": non ometterli.
- I punti chiusi non si cancellano: si spostano da `puntiAperti` a `puntiChiusi`.
- `progetto.salute`: `in linea` | `a rischio` | `critico`.
- Valore ignoto: `"—"`.

## Prompt-tipo per Claude Code
Con la skill installata basta dire "aggiorna la roadmap con questi appunti"; i prompt sotto
restano utili se si lavora senza skill.

**Dopo una call o riunione**
> Aggiorna `roadmap.data.js` con questi appunti di call del <data>: <appunti>.
> Nuove richieste in `richiesteCliente`, apri i punti necessari in `puntiAperti`, registra in
> `decisioni` ciò che è stato deciso, aggiorna `clienteRoadmap.messaggio` e
> `clienteFunzionale.cosaServeDaVoi`, aggiungi una riga in `changelog` e aggiorna
> `progetto.aggiornatoIl` e `fonteUltimoAggiornamento`.

**Dopo un rilascio**
> Rilasciata la v<x.y.z> il <data>: aggiorna `rilasci`, `progetto.versioneCorrente` e
> `prossimoRilascio`, chiudi i punti collegati in `puntiChiusi` con `versione`, ricalcola
> `progetto.avanzamento` e `fasi[].avanzamento`, aggiorna `clienteRoadmap.tappe` e `changelog`.

**Da documentazione o analisi**
> Leggi <file/doc> e allinea `funzionaleInterna` e `tecnicaInterna`. Aggiungi il documento in
> `analisi` con versione, stato e path. Non toccare le viste cliente se non le riguarda.

**Prima di un invio al cliente**
> Rigenera solo le tre sezioni cliente dai dati interni, senza gergo tecnico e senza id interni;
> verifica `clienteFunzionale.cosaServeDaVoi` con le scadenze reali.

**Cambio di configurazione**
> Metti come logo <file immagine> e imposta l'organizzazione a "<nome>" in `roadmap.config.js`,
> poi rigenera il file da consegnare. Non toccare i dati.

## Regole per chi aggiorna (umani e Claude Code)
1. Configurazione in `roadmap.config.js`, contenuti in `roadmap.data.js`: non si mescolano.
2. Nessun dato interno (id punti, nomi componenti, effort, debito) nelle chiavi `cliente*`.
3. Ogni modifica ai contenuti lascia traccia in `changelog`; i cambi di configurazione no.
4. Richiesta non ancora valutata → resta `da valutare`: non inventare target di versione.
5. Le stime assenti si scrivono `"—"`, non si omettono.
