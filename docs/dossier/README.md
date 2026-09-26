# Dossier di progetto — istruzioni d'uso

## Come si apre
**Doppio clic su `Roadmap.dc.html` o `Manuali.dc.html`.** Nient'altro: niente server,
niente `npx serve`, niente connessione (senza rete i font di sistema sostituiscono IBM
Plex). Sposta o copia sempre la **cartella intera**: le pagine leggono i file accanto.

## File

| File | Cosa contiene | Quando si tocca |
|---|---|---|
| `dossier.config.js` | logo, organizzazione, tema, sezioni, nomi dei file emessi | una volta, all'installazione |
| `roadmap.data.js` | contenuti della roadmap (`window.roadmap`) | a ogni SAL, call, rilascio |
| `manual.data.js` | manuale utente | quando cambia l'interfaccia |
| `test.data.js` | manuale di test — **interno** | a ogni campagna di test |
| `install.data.js` | manuale di installazione | quando cambiano requisiti o procedura |
| `Roadmap.dc.html` | vista della roadmap, 6 sezioni | solo per il layout |
| `Manuali.dc.html` | vista dei manuali: una scheda per documento | solo per il layout |
| `support.js` | runtime delle viste (generato) | mai a mano |
| `vendor/react*.min.js` | React 18.3.1 in locale, per funzionare offline | mai |
| `build.js` | emette i file unici da consegnare | mai |
| `set-logo.js` | imposta, incorpora o toglie il logo | mai |
| `assets/` | immagini. `logo-*.png` sono preset, **non** attivi per default | quando aggiungi un logo |

I file dati sono **script classici** che assegnano `window.roadmap` e
`window.dossierDocs`: non trasformarli in moduli ES (`export`), altrimenti le pagine non
si aprono più con doppio clic. Un documento che non serve: cancella il suo `.data.js`,
la scheda sparisce da sola.

## Configurazione — si fa per prima

Il dossier nasce **senza logo e senza nome di azienda**: è neutro finché non lo personalizzi.

```
node set-logo.js assets/logo-cliente.png    incorpora l'immagine (consigliato)
node set-logo.js --preset sc-italia         usa un logo già presente in assets/
node set-logo.js --list                     mostra i preset disponibili
node set-logo.js --none                     toglie il logo
node set-logo.js --help                     tutte le opzioni
```

Il comando converte l'immagine in `data:URI` e la scrive in `branding.logo`. Serve perché
gli export HTML prodotti dal browser sono file singoli: un logo indicato come percorso
punterebbe a una cartella che il destinatario non ha.

Le altre chiavi (`organizzazione`, tema iniziale, sezioni attive della roadmap, prefisso
e nomi dei file emessi) stanno commentate dentro `dossier.config.js`.

## Aggiornare i contenuti

Si scrive nei `*.data.js`, mai nelle viste. Il modo normale è chiederlo a Claude Code:

```
/dossier update                 tutti i documenti presenti
/dossier update roadmap         solo la roadmap
/dossier update manual          manuale utente
/dossier update test            manuale di test
/dossier update install         manuale di installazione
/dossier status                 cosa manca, cosa è scaduto, cosa non torna
```

Convenzioni obbligatorie: stati e priorità dai valori ammessi, date ISO `AAAA-MM-GG`, id
mai riusati, storico mai cancellato, valore ignoto `"—"`. Ogni modifica aggiunge una riga
al `changelog` del documento.

## Emettere i documenti da consegnare

```
node build.js            tutti i documenti presenti
node build.js manual     uno solo
```

Produce `<Nome>_<Progetto>.html`: un unico file con dentro vista, runtime, configurazione,
logo e dati. Si allega a una mail o si carica su Teams e si apre con doppio clic ovunque,
anche offline.

**Un solo file per documento, sempre lo stesso.** Ogni emissione lo riscrive aggiungendo
la fotografia di oggi a quelle di prima: in alto compare il menù **Emissione** con data e
versione, e all'apertura si vede sempre l'ultima. Chi l'ha aperto in una scheda lo
aggiorna ricaricando la pagina, senza andare a cercare il file nuovo. Le emissioni datate
già presenti (`<…>_vAAAAMMGG.nn.html`, lo schema di prima) vengono incorporate alla prima
esecuzione e restano dove sono.

Quante emissioni tiene il file: `output.storicoMax` (20 di default). Per tornare a un file
datato per emissione: `output.storico: false` in `dossier.config.js`.

Le emissioni **restano nel repository**: sono lo storico di cosa è stato consegnato e
quando. Nel `.gitignore` vanno solo `*.bak` e `*.tmp`.

## Cosa sanno fare le pagine

- **Schede**: la roadmap ha sei sezioni (tre interne, tre cliente) con l'interruttore fra i
  due lati; i manuali hanno una scheda per documento, se ce n'è più di uno.
- **Tema chiaro/scuro**: il pulsante in alto a destra; la scelta viene ricordata.
- **Esporta HTML**: un file autonomo con la sola parte visibile — la sezione, nella roadmap;
  il documento, nei manuali. È quello che si manda fuori.
- **Stampa / PDF**: stampa la sola parte visibile, in A4 orizzontale, senza i comandi di
  navigazione. Dal dialogo si sceglie "Salva come PDF".
- **Export e stampa escono sempre in tema chiaro**, anche partendo dal tema scuro e anche
  con Ctrl+P: il tema scelto torna subito dopo. I blocchi compressi vengono riaperti e i
  tag spariscono; se un filtro è attivo, al loro posto resta scritto quale — il documento
  che esce non è mai più corto di quello che dichiara.
- **Filtri a tag** (roadmap): sopra gli elenchi con uno stato — punti, rilasci, richieste,
  rischi, moduli, componenti — c'è una riga di tag con i valori presenti nei dati e quante
  voci hanno. Nascono tutti accesi; un clic ne toglie uno, "tutti" li rimette. Da
  `dossier.config.js` si passa alla selezione singola (un clic isola un valore) o si
  spengono del tutto.
- **Blocchi comprimibili** (roadmap): il titolo di ogni blocco si clicca e lo richiude,
  "Comprimi tutto" fa lo stesso sull'intera sezione. All'apertura è tutto espanso.
- **Menù delle emissioni** nei file prodotti da `build.js`: si sceglie quale leggere; una
  fascia lo ricorda quando non è l'ultima.
- **Diagramma delle fasi** con la linea di oggi, dalle date `da`/`a` della roadmap.

## Condividere

| Serve | Come | Cosa contiene |
|---|---|---|
| Mandare a un collega il documento completo | il file emesso da `build.js` | tutto il documento, sezioni interne comprese |
| Mandare al cliente una sola parte | pulsante **Esporta HTML** sulla sezione visibile | solo quella sezione, statica |
| Far aggiornare il dossier a qualcun altro | zip della cartella intera | tutto, modificabile |

**Il file della roadmap contiene anche le sezioni interne: non va al cliente.** Spegnere
le sezioni in `dossier.config.js` nasconde la scheda, non i dati. Il manuale di test è
marcato interno: fuori dall'azienda ci vanno manuale utente e manuale di installazione.
