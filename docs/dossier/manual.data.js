/* =============================================================================
   MANUALE UTENTE — contenuti. Unico file da modificare per aggiornarlo.
   La vista (Manuali.dc.html) non va toccata.

   Script classico: si aggiunge al registro window.dossierDocs senza sovrascriverlo.
   Non trasformarlo in modulo ES ("export"): sotto file:// non caricherebbe.

   Modello dati e tipi di blocco: references/blocks.md della skill.
   Regole di contenuto: references/manual.md.
   ========================================================================== */

window.dossierDocs = window.dossierDocs || {};

window.dossierDocs.manual = {
  chiave: "manual",
  titolo: "Manuale utente",
  scheda: "Manuale utente",
  sottotitolo: "Cash Flow Pilot — sai sempre quanto puoi spendere davvero",

  meta: {
    progetto: "Cash Flow Pilot",
    versione: "Beta 0.3.1",
    revisione: "r1",
    pubblico: "Chi usa l'app in famiglia",
    aggiornatoIl: "2026-09-26",
    fonte: "Interfaccia Beta 0.3.1 (src/app, src/components) + design/DIREZIONE-A.md",
    riservato: false,
  },

  sezioni: [
    /* ---------------------------------------------------------------- 1 */
    {
      id: "panoramica",
      titolo: "A cosa serve",
      occhiello: "Prima di cominciare",
      sintesi: "Un'app di casa per sapere quanto resta davvero da spendere, da soli o in famiglia.",
      blocchi: [
        { tipo: "testo", testo: "Cash Flow Pilot tiene il conto delle spese e delle entrate di casa e personali. In cima a ogni giornata c'è un numero solo — «Puoi spendere» — che è quello che resta dopo aver tolto sia quello che hai già speso, sia le spese previste che arriveranno entro fine periodo." },
        { tipo: "testo", testo: "Si apre dal browser, sul telefono o dal computer, e si può installare sulla schermata Home come un'app normale. I dati sono legati al tuo account: ogni gruppo familiare vede soltanto i propri." },
        { tipo: "elenco", titolo: "Cosa si può fare", voci: [
          "Registrare spese ed entrate, anche quelle che si ripetono ogni mese",
          "Tenere due portafogli separati: Famiglia e Personale",
          "Darsi dei tetti di spesa per categoria (le buste) e vedere se li stai rispettando",
          "Mettere da parte per un obiettivo, anche in automatico ogni mese",
          "Vedere chi ha anticipato le spese comuni e chiudere il conguaglio",
          "Allegare la foto dello scontrino alla spesa",
          "Guardare dove vanno i soldi e confrontare i periodi fra loro",
          "Ricevere un avviso sul telefono per le scadenze e per le spese ricorrenti da confermare",
        ]},
        { tipo: "nota", tono: "info", titolo: "Cosa non fa",
          testo: "Non si collega alla banca e non importa gli estratti conto: i movimenti si inseriscono a mano. Non è un'app nativa da scaricare dagli store: si installa dal browser." },
      ],
    },

    /* ---------------------------------------------------------------- 2 */
    {
      id: "primi-passi",
      titolo: "Primi passi",
      sintesi: "Un account, un gruppo familiare, la prima spesa.",
      blocchi: [
        { tipo: "passi", titolo: "Creare l'account", voci: [
          { titolo: "Apri l'app e scegli «Registrati»", testo: "Dalla pagina di accesso, sotto il modulo, c'è il collegamento alla registrazione." },
          { titolo: "Inserisci nome, email e password", testo: "L'email serve anche per recuperare la password." },
          { titolo: "Dai un nome al gruppo", testo: "Nel campo «Nome del gruppo» scrivi come vuoi chiamare la casa: per esempio «Spese Casa» o «Famiglia Rossi». È il nome che comparirà nello switch del portafoglio." },
          { titolo: "Conferma", testo: "Al primo accesso l'app si apre su «Oggi», ancora senza movimenti." },
        ]},
        { tipo: "nota", tono: "info", titolo: "Se sei stato invitato",
          testo: "Chi apre il link d'invito arriva alla registrazione con il gruppo già indicato: in cima si legge «Stai accettando l'invito per unirti al gruppo». In quel caso il campo del nome del gruppo non compare, perché il gruppo esiste già." },
        { tipo: "passi", titolo: "La prima spesa", voci: [
          { titolo: "Tocca il «+» al centro della barra in basso", testo: "Da computer la stessa azione è nella pagina «Movimenti»." },
          { titolo: "Scegli «Ho speso» o «Ho incassato»", testo: "Sono le due schede in cima al modulo." },
          { titolo: "Scrivi l'importo", testo: "Il campo grande sotto la scritta «Quanto». Si può usare la virgola." },
          { titolo: "Indica «Per cosa»", testo: "È la categoria, e serve anche a collegare la spesa alla busta del budget: se quella categoria ha un tetto, sotto al campo compare quanto ne resta." },
          { titolo: "Salva", testo: "Il movimento compare subito in «Movimenti» e il numero di «Oggi» si aggiorna." },
        ]},
        { tipo: "nota", tono: "ok", titolo: "Come si capisce che è andata bene",
          testo: "Dopo il salvataggio l'app torna all'elenco dei movimenti con la spesa appena inserita. Se invece vuoi inserirne un'altra subito, usa «Salva e aggiungine un'altra»: il modulo si svuota e resta aperto." },
        { tipo: "passi", titolo: "Installare l'app sul telefono", voci: [
          { titolo: "Apri l'app nel browser del telefono", testo: "Su iPhone deve essere Safari." },
          { titolo: "Scegli «Aggiungi alla schermata Home»", testo: "È nel menu di condivisione del browser." },
          { titolo: "Apri l'app dall'icona", testo: "Da qui in poi si comporta come un'app installata, a tutto schermo." },
        ]},
        { tipo: "nota", tono: "attenzione", titolo: "Su iPhone serve l'installazione",
          testo: "Le notifiche push su iOS funzionano soltanto con l'app aggiunta alla schermata Home. Da Safari, senza installarla, non arrivano." },
      ],
    },

    /* ---------------------------------------------------------------- 3 */
    {
      id: "orientarsi",
      titolo: "Come ci si orienta",
      sintesi: "I comandi che valgono in tutta l'app: navigazione, portafoglio, periodo, quanto vedere.",
      blocchi: [
        { tipo: "testo", testo: "Le schermate rispondono a una domanda per volta, e i comandi che cambiano cosa stai guardando stanno sempre nello stesso posto: in cima alla pagina." },
        { tipo: "tabella", titolo: "Dove si va", intestazioni: ["Comando", "Sul telefono", "Da computer"], righe: [
          ["Le destinazioni principali", "Barra in basso: Oggi · Movimenti · Budget · Altro", "Barra laterale sempre visibile, con tutte le voci"],
          ["Aggiungere un movimento", "Il «+» al centro della barra in basso", "Il pulsante nella pagina Movimenti"],
          ["Il resto delle pagine", "«Altro»: Obiettivi, Analisi, Report, Famiglia, Fisse e abbonamenti, Promemoria, Invita membri, Profilo, Impostazioni", "Nella barra laterale, sotto il separatore"],
        ]},
        { tipo: "campi", titolo: "I comandi in cima alla pagina", voci: [
          { etichetta: "Portafoglio", valore: "Famiglia / Personale", nota: "Decide di quale portafoglio parlano i numeri della pagina. Compare solo se hai tenuti attivi tutti e due; il nome a sinistra è quello del tuo gruppo." },
          { etichetta: "Periodo", valore: "Frecce, etichetta del periodo, ritorno al corrente", nota: "Le frecce spostano al periodo precedente o successivo. Toccando l'etichetta si scelgono una data di inizio e una di fine qualsiasi e si conferma con «Applica». Quando non sei sul periodo corrente compare la freccia circolare per tornarci." },
          { etichetta: "Quanto vedere", valore: "Semplice / Avanzata", nota: "In «Altro» sul telefono, in cima alla barra laterale da computer. La scelta resta salvata sul tuo profilo." },
        ]},
        { tipo: "testo", testo: "Il periodo scelto vale per tutta l'app: Oggi, Movimenti, Analisi, Budget, Obiettivi e Famiglia mostrano tutti lo stesso intervallo. Cambiarlo in una pagina lo cambia dappertutto." },
        { tipo: "nota", tono: "info", titolo: "Semplice o Avanzata",
          testo: "La modalità cambia quanto si vede, mai dove si trova: le pagine restano le stesse e nello stesso ordine. In Semplice ogni schermata si ferma al disegno e al numero; in Avanzata compaiono in più i ritmi, le proiezioni, le tabelle e i confronti — per esempio il riquadro «Andamento del saldo» in Oggi." },
      ],
    },

    /* ---------------------------------------------------------------- 4 */
    {
      id: "funzioni",
      titolo: "Le funzioni",
      sintesi: "Una voce per pagina: a cosa serve e cosa ci trovi.",
      blocchi: [
        { tipo: "tabella", titolo: "Le pagine principali", intestazioni: ["Pagina", "La domanda a cui risponde", "Cosa ci trovi"], righe: [
          ["Oggi", "Quanto posso ancora spendere?", "«Puoi spendere», la barra con speso / impegnato / da parte / libero, tre riquadri di accesso rapido e l'elenco delle spese da confermare"],
          ["Movimenti", "Dove sono finiti i soldi?", "Tutte le entrate e le uscite del periodo, con ricerca, filtri e riepilogo"],
          ["Budget", "Sto rispettando i tetti che mi sono dato?", "Le buste con quanto resta in ciascuna, il totale e il ritmo di spesa"],
          ["Obiettivi", "A che punto sono con i risparmi?", "I salvadanai, quanto è stato messo da parte e l'accantonamento automatico"],
          ["Famiglia", "Chi ha pagato cosa, e chi deve a chi?", "Quanto ha anticipato ciascuno, il conguaglio e i membri del gruppo"],
          ["Analisi", "Come sta andando rispetto al solito?", "Dove vanno i soldi, le fisse e gli abbonamenti, dove spendi di più"],
          ["Report", "Come cambia nel tempo?", "Entrate e uscite a confronto su un intervallo libero, per categoria e per negozio"],
          ["Fisse e abbonamenti", "Cosa si ripete da solo?", "Le ricorrenze attive, le più care e le entrate ricorrenti"],
        ]},
        { tipo: "tabella", titolo: "Le pagine di servizio", intestazioni: ["Pagina", "A cosa serve"], righe: [
          ["Promemoria", "Scadenze e avvisi: bollette, rinnovi, cose da non dimenticare"],
          ["Invita membri", "Creare il link d'invito per far entrare qualcuno nel gruppo"],
          ["Profilo", "Nome, email, password e nome del gruppo"],
          ["Impostazioni", "Portafogli visibili, periodo, notifiche push e tema"],
        ]},
        { tipo: "campi", titolo: "Il numero di «Oggi», voce per voce", voci: [
          { etichetta: "Speso", valore: "Le uscite già sostenute nel periodo" },
          { etichetta: "Impegnato", valore: "Le spese previste entro fine periodo, non ancora confermate", nota: "È il totale delle ricorrenti in attesa: lo stesso numero che vedi nel riquadro «Da confermare»." },
          { etichetta: "Da parte", valore: "Quello che hai accantonato sugli obiettivi", nota: "Compare solo se hai messo qualcosa da parte. Esce da «Puoi spendere» apposta, per non spenderlo per sbaglio." },
          { etichetta: "Libero", valore: "Quello che resta: è il numero grande «Puoi spendere»" },
        ]},
        { tipo: "nota", tono: "info", titolo: "Come si calcola",
          testo: "Sotto il numero c'è il collegamento «Come si calcola»: apre la spiegazione con i conti in chiaro. Accanto, una riga dice quanto puoi spendere al giorno e quanti giorni restano." },
        { tipo: "elenco", titolo: "Le convenzioni dei grafici", voci: [
          "Pieno vuol dire reale: è già successo",
          "Tratteggiato vuol dire previsto: deve ancora succedere",
          "Le spese e le entrate si disegnano a barre, il saldo a linea continua",
          "Ogni grafico dichiara la sua scala e, quando raggruppa, dice se sta sommando per giorno, per settimana o per mese",
        ]},
      ],
    },

    /* ---------------------------------------------------------------- 5 */
    {
      id: "procedure",
      titolo: "Come si fa",
      sintesi: "Le cose che si fanno spesso, passo per passo.",
      blocchi: [
        { tipo: "passi", titolo: "Registrare una spesa che si ripete", voci: [
          { titolo: "Apri il modulo con il «+» e compila importo e categoria", testo: "Come per una spesa normale." },
          { titolo: "Attiva «Si ripete»", testo: "L'intestazione della pagina diventa «Nuova spesa ricorrente»." },
          { titolo: "Scegli la frequenza", testo: "E, dove previsto, in quali giorni. Se non ne scegli nessuno viene usato il giorno della data di inizio." },
          { titolo: "Indica se finisce", testo: "Il campo «Fine» si può lasciare vuoto: la ricorrenza non finisce." },
          { titolo: "Decidi come si conferma", testo: "Con «Conferma automatica» attiva la spesa entra subito nel saldo reale. Senza, resta previsto finché non la confermi tu." },
          { titolo: "Salva la ricorrenza", testo: "La trovi in «Fisse e abbonamenti»; le occorrenze in attesa compaiono in «Da confermare»." },
        ]},
        { tipo: "passi", titolo: "Confermare le spese in sospeso", voci: [
          { titolo: "Apri «Oggi»", testo: "Il riquadro «Da confermare» elenca quelle del periodo, con quante sono in attesa." },
          { titolo: "Tocca il pulsante con l'importo", testo: "Accanto a ogni riga: conferma quella spesa." },
          { titolo: "Controlla il numero in cima", testo: "La spesa passa da impegnata a sostenuta: «Puoi spendere» non cambia, ma «Speso» sale e «Impegnato» scende." },
        ]},
        { tipo: "nota", tono: "info", titolo: "Se sono più di cinque",
          testo: "In «Oggi» ne compaiono al massimo cinque; il collegamento «Vedi tutte e…» in fondo al riquadro apre l'elenco completo in Movimenti, già filtrato su «Da confermare»." },
        { tipo: "passi", titolo: "Darsi un tetto di spesa (una busta)", voci: [
          { titolo: "Apri «Budget» e tocca «Busta»", testo: "Il pulsante è in alto a destra nell'intestazione." },
          { titolo: "Scrivi la categoria", testo: "Il campo suggerisce quelle che usi già." },
          { titolo: "Indica il tetto e salva", testo: "Il tetto vale per il periodo mostrato e per quelli successivi: i mesi già chiusi restano com'erano." },
          { titolo: "Controlla lo stato", testo: "Ogni busta porta una parola oltre al colore: «In linea», «Quasi finito» oltre l'85%, «Superato» oltre il 100%." },
        ]},
        { tipo: "nota", tono: "info", titolo: "Modificare o togliere un tetto",
          testo: "Si apre la busta dall'elenco: nella finestra del tetto, accanto a «Salva», c'è «Togli il tetto». La categoria resta, sparisce solo il limite." },
        { tipo: "passi", titolo: "Mettere da parte per un obiettivo", voci: [
          { titolo: "Apri «Obiettivi» e tocca «Obiettivo»", testo: "Indica per cosa stai risparmiando, l'icona, il traguardo e, se vuoi, entro quando." },
          { titolo: "Attiva l'accantonamento automatico, se ti serve", testo: "Scegli quanto e che giorno del mese: quella cifra esce da «Puoi spendere» il giorno che hai indicato." },
          { titolo: "Registra i versamenti", testo: "Toccando l'obiettivo si apre la finestra con «Verso» e «Prelevo»: scrivi l'importo, aggiungi una nota se serve, conferma." },
          { titolo: "Controlla l'avanzamento", testo: "L'elenco mostra la percentuale raggiunta; in modalità Avanzata il riquadro «Come cresce» mostra quanto è entrato mese per mese." },
        ]},
        { tipo: "passi", titolo: "Dividere una spesa e chiudere il conguaglio", voci: [
          { titolo: "Sulla spesa, indica «Chi ha pagato»", testo: "Se scegli il fondo comune la spesa non entra nel conguaglio; se ha anticipato una persona, se la vedrà restituire." },
          { titolo: "Scegli «Come si divide»", testo: "Il valore di partenza è «Parti uguali». Da lì si può dividere per percentuale o per importo fra i membri." },
          { titolo: "Apri «Famiglia»", testo: "«Chi ha anticipato» mostra quanto ha messo ciascuno, con la tacca della quota equa." },
          { titolo: "Guarda il conguaglio", testo: "Le righe dicono chi deve quanto a chi. Se non deve nessuno, l'app scrive «Siete in pari: nessuno deve niente a nessuno»." },
          { titolo: "Chiudi con «Segna come saldato»", testo: "Serve a dichiarare che i conti sono stati pareggiati davvero. Il conguaglio si azzera e la chiusura resta nello storico." },
        ]},
        { tipo: "nota", tono: "attenzione", titolo: "Le spese inserite dopo la chiusura",
          testo: "Una spesa datata in un periodo già saldato resta fuori dai conti. Per farla rientrare si usa «Riapri il conguaglio» dallo storico: il calcolo viene rifatto includendola." },
        { tipo: "passi", titolo: "Allegare lo scontrino", voci: [
          { titolo: "Nel modulo del movimento, apri «Scontrino»", testo: "Accetta una foto o un PDF. È facoltativo." },
          { titolo: "Scegli il file", testo: "Le foto vengono ridotte prima di essere caricate." },
          { titolo: "Rileggilo quando serve", testo: "Nell'elenco dei movimenti, le righe con un allegato hanno il comando «Guarda lo scontrino»." },
        ]},
        { tipo: "passi", titolo: "Invitare qualcuno nel gruppo", voci: [
          { titolo: "Apri «Invita membri»", testo: "Da «Altro» sul telefono, dalla barra laterale da computer." },
          { titolo: "Crea il nuovo invito", testo: "L'app genera un codice e un collegamento." },
          { titolo: "Copia il link e mandalo", testo: "Quando è negli appunti l'app lo conferma." },
          { titolo: "Attendi la registrazione", testo: "Chi apre il link si registra ed entra nel gruppo. Finché non lo usa, l'invito resta fra quelli attivi e si può cancellare." },
        ]},
        { tipo: "passi", titolo: "Attivare le notifiche", voci: [
          { titolo: "Apri «Impostazioni» → «Notifiche push»", testo: "Su iPhone l'app deve essere già installata sulla schermata Home." },
          { titolo: "Tocca «Abilita»", testo: "Il browser chiede il permesso: va concesso." },
          { titolo: "Scegli cosa ricevere", testo: "Con «Ricorrenti da confermare» attivo arriva un avviso quando ci sono spese in sospeso." },
          { titolo: "Imposta l'orario", testo: "Il campo «Orario dell'avviso» decide a che ora arriva." },
        ]},
        { tipo: "passi", titolo: "Far partire il mese dallo stipendio", voci: [
          { titolo: "Apri «Impostazioni» → «Periodo»", testo: "Attiva «Periodo personalizzato»." },
          { titolo: "Scegli il giorno di inizio", testo: "Per esempio il 27, se è quando arriva lo stipendio." },
          { titolo: "Controlla in «Oggi»", testo: "L'etichetta del periodo in cima cambia di conseguenza, in tutta l'app." },
        ]},
      ],
    },

    /* ---------------------------------------------------------------- 6 */
    {
      id: "casi-limite",
      titolo: "Quando qualcosa non va",
      sintesi: "I messaggi che si incontrano e cosa vogliono dire.",
      blocchi: [
        { tipo: "tabella", titolo: "Messaggi e cosa fare", intestazioni: ["Messaggio", "Cosa vuol dire", "Cosa fare"], righe: [
          ["«I budget non sono ancora attivi» / «Gli obiettivi non sono ancora attivi»", "Quella parte dell'app non è stata ancora abilitata sull'archivio dati", "Va abilitata da chi cura l'installazione: fino ad allora la pagina resta vuota"],
          ["«Salvataggio non riuscito — controlla la connessione e riprova»", "Il movimento non è arrivato a destinazione", "Verifica la connessione e salva di nuovo: niente è stato registrato"],
          ["«Devi tenere visibile almeno un portafoglio»", "Stai spegnendo anche l'ultimo portafoglio rimasto", "Tienine acceso almeno uno fra Personale e Condiviso"],
          ["«Il permesso è stato negato»", "Le notifiche sono state rifiutate al browser", "Si riattiva dalle impostazioni del dispositivo, poi si torna nella pagina Impostazioni"],
          ["«Questo browser non supporta le notifiche push»", "Il browser in uso non ha la funzione", "Si può usare l'app lo stesso: mancano solo gli avvisi"],
          ["«Non fai parte di nessun gruppo»", "L'account non è collegato a un gruppo familiare", "Da «Vai agli inviti» si crea un invito, oppure si accetta quello ricevuto"],
        ]},
        { tipo: "elenco", titolo: "Limiti da conoscere", voci: [
          "Lo switch Famiglia / Personale compare solo se tutti e due i portafogli sono attivi in Impostazioni",
          "Le quote di una spesa divisa devono quadrare con l'importo: se non tornano, il salvataggio si ferma e lo dice, invece di correggere i numeri di nascosto",
          "Le spese pagate dal fondo comune non generano debiti fra le persone, per costruzione",
          "Il previsto delle spese fisse si ferma al 31 dicembre dell'anno in corso",
          "Il tema scuro e la modalità Semplice / Avanzata sono salvati sul profilo e ti seguono su ogni dispositivo",
        ]},
        { tipo: "nota", tono: "ok", titolo: "Una cancellazione si può annullare",
          testo: "Quando elimini un movimento, l'avviso che compare in basso porta il comando «Annulla»: finché resta a schermo il movimento si recupera." },
      ],
    },

    /* ---------------------------------------------------------------- 7 */
    {
      id: "faq",
      titolo: "Domande frequenti",
      blocchi: [
        { tipo: "faq", voci: [
          { domanda: "Perché «Puoi spendere» è più basso del saldo che ho in banca?", risposta: "Perché toglie anche quello che è già impegnato: le spese previste entro fine periodo e, se ne hai, i soldi accantonati sugli obiettivi. Il saldo di cassa vero si legge in Movimenti, alla voce «In cassa oggi» del riepilogo." },
          { domanda: "Ho confermato una spesa ricorrente e il numero non è cambiato: è normale?", risposta: "Sì. Quella spesa era già contata come impegnata: confermandola passa fra quelle sostenute. Cambiano «Speso» e «Impegnato», non il totale." },
          { domanda: "Ho dimenticato la password.", risposta: "Dalla pagina di accesso scegli «Recupera la password»: arriva un'email con il collegamento per reimpostarla." },
          { domanda: "Come faccio a vedere un mese passato?", risposta: "Con la freccia a sinistra del selettore di periodo. Per un intervallo qualsiasi si tocca l'etichetta del periodo, si scelgono le due date e si conferma con «Applica». La freccia circolare riporta al periodo corrente." },
          { domanda: "Le mie spese personali le vede anche il resto della famiglia?", risposta: "No. Il portafoglio personale è tuo: nel gruppo si condivide soltanto quello di famiglia." },
          { domanda: "Cosa succede se cambio il tetto di una busta a metà mese?", risposta: "Il nuovo tetto vale dal periodo mostrato in avanti. I mesi già chiusi restano con il tetto che avevano." },
          { domanda: "Le notifiche non arrivano sull'iPhone.", risposta: "Su iOS servono con l'app installata: da Safari, «Aggiungi alla schermata Home», poi si riaprono le Impostazioni dall'icona e si attivano le notifiche da lì." },
          { domanda: "Posso usare l'app dal computer?", risposta: "Sì, si apre dal browser. Su schermo largo compare la barra laterale con tutte le voci e il contenuto si dispone su due colonne." },
        ]},
      ],
    },

    /* ---------------------------------------------------------------- 8 */
    {
      id: "glossario",
      titolo: "Glossario",
      sintesi: "Le parole che compaiono nell'app, e cosa vogliono dire lì dentro.",
      blocchi: [
        { tipo: "campi", voci: [
          { etichetta: "Puoi spendere", valore: "Quello che resta davvero: il saldo reale meno le spese previste e meno quello che hai messo da parte" },
          { etichetta: "In cassa oggi", valore: "Il saldo reale: entrate incassate meno uscite sostenute, senza contare le previsioni" },
          { etichetta: "Impegnato", valore: "Spese già previste entro fine periodo che non sono ancora state confermate" },
          { etichetta: "Da parte", valore: "Quello che hai accantonato sugli obiettivi. Esce da «Puoi spendere»" },
          { etichetta: "Busta", valore: "Un tetto di spesa su una categoria, valido per il periodo" },
          { etichetta: "Portafoglio", valore: "Famiglia o Personale: decide di chi sono i movimenti che stai guardando" },
          { etichetta: "Periodo", valore: "L'intervallo di date a cui si riferisce tutta l'app. Di solito il mese, ma si può far partire da un altro giorno" },
          { etichetta: "Ricorrente", valore: "Un movimento che si ripete da solo. Resta previsto finché non lo confermi, a meno che non sia a conferma automatica" },
          { etichetta: "Conguaglio", valore: "Il pareggio delle spese comuni: chi deve quanto a chi, e la possibilità di dichiararlo saldato" },
          { etichetta: "Fondo comune", valore: "Chi ha pagato, quando la spesa non è stata anticipata da una persona: non entra nel conguaglio" },
          { etichetta: "Quota equa", valore: "La parte che spetterebbe a ciascuno se la spesa fosse divisa in parti uguali. È la tacca sul grafico di «Chi ha anticipato»" },
          { etichetta: "Semplice / Avanzata", valore: "Quanto vedere: in Avanzata compaiono ritmi, proiezioni e tabelle in più. Le pagine restano le stesse" },
        ]},
      ],
    },
  ],

  changelog: [
    { data: "2026-09-26", fonte: "Interfaccia Beta 0.3.1 (src/app, src/components) + design/DIREZIONE-A.md", modifiche: "Prima stesura. Sezioni ricavate dalle pagine dell'app: navigazione, portafoglio, periodo e modalità Semplice/Avanzata; le otto pagine principali e le quattro di servizio; procedure per ricorrenti, conferme, buste, obiettivi, divisione e conguaglio, scontrini, inviti, notifiche e periodo personalizzato. Etichette copiate dall'interfaccia e messaggi d'errore presi dai testi reali; niente che non sia verificabile nel codice." },
  ],
};
