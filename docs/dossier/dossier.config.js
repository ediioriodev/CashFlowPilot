/* =============================================================================
   CONFIGURAZIONE DEL DOSSIER  —  si compila UNA VOLTA, all'installazione.

   Qui sta l'aspetto e il comportamento delle viste: logo, intestazione, sezioni
   attive, tema, nome dei file emessi. I CONTENUTI stanno altrove, nei file
   <doc>.data.js: questo file non li tocca mai.

   Caricato come script classico prima dei dati: niente export, niente import,
   niente fetch — altrimenti le pagine non si aprono più con doppio clic.

   Tutti i valori hanno un default sensato. Ogni chiave lasciata a "" o rimossa
   si comporta come "non impostata": le viste si adattano senza rompersi.
   ========================================================================== */

window.dossierConfig = {
  /* --- IDENTITÀ VISIVA ------------------------------------------------------
     Default: nessun logo e nessun nome di organizzazione. Il dossier è neutro
     finché non lo si personalizza: non porta il marchio di nessuno per errore. */
  branding: {
    /* Logo in alto a sinistra, negli export HTML e nel PDF.
         ""                             nessun logo (default)
         "assets/logo-cliente.png"      percorso relativo a questa cartella
         "data:image/png;base64,iVBO…"  immagine incorporata — l'unica che
                                        sopravvive agli export fatti dal browser
       Il modo comodo:  node set-logo.js <file immagine> */
    logo: "",

    /* Testo alternativo. "" → usa `organizzazione`, poi "Logo". */
    logoAlt: "",

    /* Altezza in pixel (la larghezza segue le proporzioni). */
    logoAltezza: 26,

    /* In tema scuro i loghi scuri spariscono: true mette dietro una placca
       chiara. false se il logo è già chiaro o trasparente. */
    logoPlaccaTemaScuro: true,

    /* Chi emette i documenti: compare nei piè di pagina di viste, export e PDF.
       "" → nessun nome. */
    organizzazione: "",
  },

  /* --- COMPORTAMENTO DELLE VISTE ------------------------------------------- */
  vista: {
    /* "auto" (segue il sistema, poi ricorda la scelta) | "light" | "dark" */
    temaIniziale: "auto",

    /* Pulsanti "Esporta HTML" e "Stampa / PDF". false li nasconde. */
    mostraEsportazione: true,

    /* Solo la vista roadmap. */
    roadmap: {
      /* Sezione aperta all'apertura:
         "sal" | "funzInt" | "tecInt" | "roadCli" | "funzCli" | "tecCli" */
      vistaIniziale: "sal",

      /* Sezioni attive. false = sparisce dalle schede. Se tutte e tre le sezioni
         di un lato sono false, sparisce anche il pulsante Vista interna/cliente.
         Attenzione: i dati restano nel file, viene nascosta solo la scheda. */
      sezioni: {
        sal: true,      // Roadmap interna & SAL
        funzInt: true,  // Funzionale interna
        tecInt: true,   // Tecnica interna
        roadCli: true,  // Roadmap cliente
        funzCli: true,  // Funzionale cliente
        tecCli: true,   // Tecnica cliente
      },

      /* Tag di filtro sopra gli elenchi con uno stato: punti aperti e chiusi,
         rilasci, richieste del cliente, rischi, moduli, flussi, analisi,
         componenti, debito tecnico. I tag sono i valori presenti nei dati —
         niente elenchi fissi — e nascono tutti selezionati: chi non tocca
         niente vede il documento completo. Sono comandi di lettura: non
         entrano nella stampa né negli export, dove resta solo, in chiaro,
         quale filtro era attivo. */
      filtri: {
        /* false toglie del tutto i tag dalla vista. */
        attivi: true,

        /* "multipla": ogni clic toglie o rimette un tag.
           "singola":  ogni clic isola un valore, il secondo clic torna a tutti. */
        modalita: "multipla",

        /* Tag anche nelle tre sezioni cliente. Default false: il documento che
           esce dall'azienda si legge dall'inizio alla fine. */
        cliente: false,
      },
    },

    /* Solo la vista dei manuali. */
    manuali: {
      /* Scheda aperta all'apertura: "manual" | "test" | "install" | "" (il primo
         documento presente). */
      docIniziale: "",
    },
  },

  /* --- FILE EMESSI (build.js) ----------------------------------------------
     Nome: <prefisso><Nome>_<Progetto>.html — un file per documento, riscritto a
     ogni emissione, con dentro le emissioni precedenti: si sceglie quale leggere
     dal menù in alto, e all'apertura si vede sempre l'ultima.                  */
  output: {
    /* Prefisso comune a tutti i documenti ("SAL_", "ACME_"). "" = nessuno. */
    prefisso: "",

    /* Nome del documento nel file emesso. */
    nomi: {
      roadmap: "RoadMap",
      manual: "Manual",
      test: "TestPlan",
      install: "Install",
    },

    /* Forza il pezzo <Progetto>. "" → da progetto.nome / meta.progetto. */
    nomeProgetto: "",

    /* Un file unico con dentro lo storico delle emissioni (default).
       false torna allo schema di prima: un file datato per emissione,
       <prefisso><Nome>_<Progetto>_vAAAAMMGG.nn.html, e nessun menù. */
    storico: true,

    /* Quante emissioni tiene il file: oltre questo numero escono le più
       vecchie. Ogni emissione pesa quanto i dati del documento. */
    storicoMax: 20,
  },
};
