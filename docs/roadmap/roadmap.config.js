/* =============================================================================
   CONFIGURAZIONE DELLA ROADMAP  —  si compila UNA VOLTA, all'installazione.

   Qui sta l'aspetto e il comportamento della vista: logo, intestazione,
   sezioni attive, tema, nome dei file emessi. I CONTENUTI stanno altrove,
   in roadmap.data.js: questo file non li tocca mai.

   Caricato come script classico prima dei dati: niente export, niente import,
   niente fetch — altrimenti la pagina non si apre più con doppio clic.

   Tutti i valori hanno un default sensato. Ogni chiave lasciata a "" o rimossa
   si comporta come "non impostata": la vista si adatta senza rompersi.
   ========================================================================== */

window.roadmapConfig = {
  /* --- IDENTITÀ VISIVA ------------------------------------------------------
     Default: nessun logo e nessun nome di organizzazione. La roadmap è neutra
     finché non la si personalizza: non porta il marchio di nessuno per errore. */
  branding: {
    /* Logo in alto a sinistra, negli export HTML e nel PDF.
         ""                             nessun logo (default): l'intestazione parte dal titolo
         "assets/logo-sc-italia.png"    percorso relativo a questa cartella
         "data:image/png;base64,iVBO…"  immagine incorporata — l'unica che sopravvive
                                        ovunque, anche negli export fatti dal browser
       Il modo comodo per impostarlo:  node imposta-logo.js <file immagine>
       che converte l'immagine in data:URI e scrive qui il valore. */
    logo: "",

    /* Testo alternativo dell'immagine. "" → usa `organizzazione`, poi "Logo". */
    logoAlt: "",

    /* Altezza del logo in pixel (la larghezza segue le proporzioni). */
    logoAltezza: 26,

    /* In tema scuro i loghi scuri spariscono: true mette dietro al logo una
       placca chiara. Metterlo a false se il logo è già chiaro o trasparente. */
    logoPlaccaTemaScuro: true,

    /* Nome dell'organizzazione che emette la roadmap: compare nel piè di pagina
       della vista, degli export e del PDF. "" → nessuna riga di intestazione. */
    organizzazione: "",
  },

  /* --- COMPORTAMENTO DELLA VISTA ------------------------------------------- */
  vista: {
    /* "auto" (segue il sistema, poi ricorda la scelta) | "light" | "dark" */
    temaIniziale: "auto",

    /* Sezione aperta all'apertura:
       "sal" | "funzInt" | "tecInt" | "roadCli" | "funzCli" | "tecCli" */
    vistaIniziale: "sal",

    /* Pulsanti "Esporta HTML" e "Stampa / PDF". false li nasconde. */
    mostraEsportazione: true,

    /* Sezioni attive. Mettere a false quelle che il progetto non usa: spariscono
       dalle schede. Se tutte e tre le sezioni di un lato sono false, sparisce
       anche il relativo pulsante Vista interna / Vista cliente.
       Attenzione: i dati restano nel file, viene nascosta solo la scheda. */
    sezioni: {
      sal: true,      // Roadmap interna & SAL
      funzInt: true,  // Funzionale interna
      tecInt: true,   // Tecnica interna
      roadCli: true,  // Roadmap cliente
      funzCli: true,  // Funzionale cliente
      tecCli: true,   // Tecnica cliente
    },
  },

  /* --- FILE EMESSO (crea-file-unico.js) ------------------------------------ */
  output: {
    /* Prefisso del nome: <prefisso>_<NomeProgetto>_vAAAAMMGG.nn.html */
    prefisso: "RoadMap",

    /* Forza il pezzo <NomeProgetto> del nome file. "" → deriva da progetto.nome. */
    nomeProgetto: "",
  },
};
