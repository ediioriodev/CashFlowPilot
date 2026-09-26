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
    versione: "Beta 0.4.0",
    revisione: "r3",
    pubblico: "Chi usa l'app in famiglia",
    aggiornatoIl: "2026-09-26",
    fonte: "Interfaccia Beta 0.4.0 — secondo giro di revisione (design/REVISIONE.md §6) e installazione in app",
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
          "Mettere da parte per un obiettivo e sapere quanto versare al mese per arrivarci",
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
        { tipo: "nota", tono: "info", titolo: "Gli altri campi",
          testo: "In modalità Semplice il modulo mostra solo importo, categoria e chi ha pagato. «Dove», «Si ripete», «Scontrino» e «Nota» stanno dietro il pulsante «Altri dettagli», che si apre da solo se uno di quei campi è già compilato. In Avanzata sono tutti a vista." },
        { tipo: "nota", tono: "ok", titolo: "Come si capisce che è andata bene",
          testo: "Dopo il salvataggio l'app torna all'elenco dei movimenti con la spesa appena inserita. Se invece vuoi inserirne un'altra subito, usa «Salva e aggiungine un'altra»: il modulo si svuota e resta aperto." },
        { tipo: "passi", titolo: "Installare l'app sul telefono", voci: [
          { titolo: "Apri l'app nel browser del telefono", testo: "Chrome, Edge o Samsung Internet su Android; Safari (o Chrome) su iPhone. Se l'hai aperta da un link di WhatsApp, Instagram o simili, aprila prima nel browser." },
          { titolo: "Tocca «Installa l'app»", testo: "Lo trovi sotto l'accesso, nel riquadro in cima a «Oggi», in «Altro» e in «Impostazioni»." },
          { titolo: "Su Android: conferma con «Installa»", testo: "Si apre direttamente la finestra del telefono: basta confermare. Se il tuo browser non la apre, il pulsante si chiama «Come fare» e ti mostra i passi dal menu ⋮." },
          { titolo: "Su iPhone e iPad: segui la guida", testo: "Apple non permette alle app web di installarsi da sole: il pulsante «Come fare» mostra dove toccare. «Condividi» → «Aggiungi alla schermata Home» → «Aggiungi»." },
          { titolo: "Apri l'app dall'icona", testo: "Da qui in poi si comporta come un'app installata, a tutto schermo." },
        ]},
        { tipo: "nota", tono: "ok", titolo: "Come si capisce che è andata bene",
          testo: "Su Android compare il messaggio «App installata: la trovi nella schermata Home». Aprendo l'app dall'icona, gli inviti a installarla non compaiono più." },
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
          ["Movimenti", "Dove sono finiti i soldi?", "Tutte le entrate e le uscite del periodo, con ricerca e filtri; in Avanzata anche il riepilogo con «In cassa oggi» e la stima a fine periodo"],
          ["Budget", "Sto rispettando i tetti che mi sono dato?", "Le buste con quanto resta in ciascuna e il totale; in Avanzata anche il ritmo di spesa"],
          ["Obiettivi", "A che punto sono con i risparmi?", "I salvadanai, quanto è stato messo da parte e, se c'è una data, circa quanto versare al mese per arrivarci"],
          ["Famiglia", "Chi ha pagato cosa, e chi deve a chi?", "Quanto deve ricevere o dare ciascuno, il conguaglio e i membri del gruppo; in Avanzata anche «Chi ha anticipato»"],
          ["Analisi", "Come sta andando rispetto al solito?", "Dove vanno i soldi, il confronto con i periodi prima, le fisse e gli abbonamenti, dove spendi di più"],
          ["Report", "Come cambia nel tempo?", "Entrate e uscite a confronto su un intervallo libero, per categoria, per negozio e per chi ha pagato"],
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
          testo: "Sotto il numero c'è il collegamento «Come si calcola»: apre la spiegazione con i conti in chiaro. Accanto, una riga dice circa quanto puoi spendere al giorno e quanti giorni restano. Se hai già superato il disponibile, al posto di «Puoi spendere» compare «Sei oltre il disponibile» con la cifra dello scoperto, e la riga avvisa che ogni nuova spesa lo allarga." },
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
          { titolo: "Attiva «Si ripete»", testo: "In modalità Semplice si trova dietro «Altri dettagli». L'intestazione della pagina diventa «Nuova spesa ricorrente»." },
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
          { titolo: "Guarda quanto versare", testo: "Se hai indicato una data, l'elenco dice quanto manca e circa quanto mettere da parte ogni mese per arrivarci." },
          { titolo: "Registra i versamenti", testo: "Toccando l'obiettivo si apre la finestra con «Verso» e «Prelevo»: scrivi l'importo, aggiungi una nota se serve, conferma. Quello che versi esce subito da «Puoi spendere»." },
          { titolo: "Controlla l'avanzamento", testo: "L'elenco mostra la percentuale raggiunta; in modalità Avanzata il riquadro «Come cresce» mostra quanto è entrato mese per mese." },
        ]},
        { tipo: "nota", tono: "attenzione", titolo: "L'accantonamento automatico non è ancora in funzione",
          testo: "Nella finestra dell'obiettivo si può già impostare «Mettine da parte ogni mese» con importo e giorno, ma il versamento automatico non parte ancora: l'app lo scrive accanto all'interruttore. Per ora i versamenti si fanno a mano." },
        { tipo: "passi", titolo: "Dividere una spesa e chiudere il conguaglio", voci: [
          { titolo: "Sulla spesa, indica «Chi ha pagato»", testo: "Se scegli il fondo comune la spesa non entra nel conguaglio; se ha anticipato una persona, se la vedrà restituire." },
          { titolo: "Scegli «Come si divide»", testo: "Il valore di partenza è «Parti uguali». Da lì si può dividere per percentuale o per importo fra i membri." },
          { titolo: "Apri «Famiglia»", testo: "Le barre dicono per ciascuno quanto deve ricevere o quanto deve dare. In Avanzata il riquadro «Chi ha anticipato» mostra quanto ha messo ciascuno, con la tacca della sua quota." },
          { titolo: "Guarda il conguaglio", testo: "Le righe dicono chi deve quanto a chi. Se non deve nessuno, l'app scrive «Siete in pari: nessuno deve niente a nessuno»." },
          { titolo: "Chiudi con «Segna come saldato»", testo: "Serve a dichiarare che i conti sono stati pareggiati davvero. Il conguaglio si azzera e la chiusura resta nello storico." },
        ]},
        { tipo: "nota", tono: "attenzione", titolo: "Le spese inserite dopo la chiusura",
          testo: "Una spesa datata in un periodo già saldato resta fuori dai conti. Per farla rientrare si usa «Riapri il conguaglio» dallo storico: il calcolo viene rifatto includendola." },
        { tipo: "passi", titolo: "Allegare lo scontrino", voci: [
          { titolo: "Nel modulo del movimento, apri «Scontrino»", testo: "In modalità Semplice si trova dietro «Altri dettagli». Accetta una foto o un PDF. È facoltativo." },
          { titolo: "Scegli il file", testo: "Le foto vengono ridotte prima di essere caricate." },
          { titolo: "Rileggilo quando serve", testo: "Nell'elenco dei movimenti, le righe con un allegato hanno il comando «Guarda lo scontrino»." },
        ]},
        { tipo: "passi", titolo: "Invitare qualcuno nel gruppo", voci: [
          { titolo: "Apri «Invita membri»", testo: "Da «Altro» sul telefono, dalla barra laterale da computer." },
          { titolo: "Nel riquadro «Nuovo invito» tocca «Crea l'invito»", testo: "L'email è facoltativa, serve solo a ricordarti per chi è. L'app genera un codice e un collegamento, validi sette giorni." },
          { titolo: "Copia il link o il codice e mandalo", testo: "Quando è negli appunti l'app lo conferma." },
          { titolo: "Attendi la registrazione", testo: "Chi apre il link si registra ed entra nel gruppo. Finché non lo usa, l'invito resta fra quelli attivi e si può annullare: l'app chiede conferma prima di farlo." },
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
          ["«Sei oltre il disponibile»", "Fra spese sostenute, impegnate e accantonate hai superato quello che c'era nel periodo", "Non è un errore: guarda in Movimenti dove sono andati i soldi, e controlla che le spese previste siano ancora giuste"],
          ["«Salvataggio non riuscito — controlla la connessione e riprova»", "Il movimento non è arrivato a destinazione", "Verifica la connessione e salva di nuovo: niente è stato registrato"],
          ["«Devi tenere visibile almeno un portafoglio»", "Stai spegnendo anche l'ultimo portafoglio rimasto", "Tienine acceso almeno uno fra Personale e Condiviso"],
          ["«Il permesso è stato negato»", "Le notifiche sono state rifiutate al browser", "Si riattiva dalle impostazioni del dispositivo, poi si torna nella pagina Impostazioni"],
          ["«Apri nel browser»", "Stai usando il browser interno di un'altra app (WhatsApp, Instagram…), che non sa installare", "Dal menu di quell'app scegli «Apri nel browser», oppure tocca «Copia link» e incollalo in Chrome o Safari"],
          ["«Questo browser non supporta le notifiche push»", "Il browser in uso non ha la funzione", "Si può usare l'app lo stesso: mancano solo gli avvisi"],
          ["«Non fai parte di nessun gruppo»", "L'account non è collegato a un gruppo familiare", "Da «Vai agli inviti» si crea un invito, oppure si accetta quello ricevuto"],
        ]},
        { tipo: "elenco", titolo: "Limiti da conoscere", voci: [
          "Lo switch Famiglia / Personale compare solo se tutti e due i portafogli sono attivi in Impostazioni",
          "Le quote di una spesa divisa devono quadrare con l'importo: se non tornano, il salvataggio si ferma e lo dice, invece di correggere i numeri di nascosto",
          "Le spese pagate dal fondo comune non generano debiti fra le persone, per costruzione",
          "Il previsto delle spese fisse si ferma al 31 dicembre dell'anno in corso",
          "Il filtro «Chi ha pagato» del Report conta solo le spese anticipate da quella persona: quelle del fondo comune sono escluse",
          "L'accantonamento automatico sugli obiettivi si può impostare ma non è ancora in funzione: i versamenti si fanno a mano",
          "Il collegamento per aprire uno scontrino vale pochi minuti: se lo inoltri, chi lo riceve più tardi non lo apre più",
          "Il tema scuro e la modalità Semplice / Avanzata sono salvati sul profilo e ti seguono su ogni dispositivo. Chi si iscrive ora parte in Semplice",
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
          { domanda: "Perché «Puoi spendere» è più basso del saldo che ho in banca?", risposta: "Perché toglie anche quello che è già impegnato: le spese previste entro fine periodo e, se ne hai, i soldi accantonati sugli obiettivi. Il saldo di cassa vero è «In cassa oggi»: in modalità Avanzata lo trovi nel riepilogo di Movimenti e nel riquadro «A fine periodo» di Oggi." },
          { domanda: "Ho confermato una spesa ricorrente e il numero non è cambiato: è normale?", risposta: "Sì. Quella spesa era già contata come impegnata: confermandola passa fra quelle sostenute. Cambiano «Speso» e «Impegnato», non il totale." },
          { domanda: "Ho dimenticato la password.", risposta: "Dalla pagina di accesso scegli «Recupera la password»: arriva un'email con il collegamento per reimpostarla." },
          { domanda: "Come faccio a vedere un mese passato?", risposta: "Con la freccia a sinistra del selettore di periodo. Per un intervallo qualsiasi si tocca l'etichetta del periodo, si scelgono le due date e si conferma con «Applica». La freccia circolare riporta al periodo corrente." },
          { domanda: "Le mie spese personali le vede anche il resto della famiglia?", risposta: "No. Il portafoglio personale è tuo: nel gruppo si condivide soltanto quello di famiglia." },
          { domanda: "Cosa succede se cambio il tetto di una busta a metà mese?", risposta: "Il nuovo tetto vale dal periodo mostrato in avanti. I mesi già chiusi restano con il tetto che avevano." },
          { domanda: "Le notifiche non arrivano sull'iPhone.", risposta: "Su iOS servono con l'app installata. In «Impostazioni» → «Notifiche push» tocca «Guarda come installarla» e segui i passi; poi riapri l'app dall'icona e attiva le notifiche da lì." },
          { domanda: "Perché su iPhone l'installazione non si fa con un tocco come su Android?", risposta: "Perché Apple non lo consente alle app web: l'unica strada è il menu «Condividi». La guida dell'app mostra esattamente dove toccare." },
          { domanda: "Ho chiuso il riquadro «Installa Cash Flow Pilot» in Oggi: come lo ritrovo?", risposta: "Torna da solo dopo due settimane (dopo tre chiusure smette di ricomparire). In ogni momento puoi installare da «Altro» o da «Impostazioni»." },
          { domanda: "Su Android il pulsante dice «Come fare» invece di «Installa».", risposta: "Il tuo browser non apre la finestra di installazione da solo, oppure l'app è già installata: cercala nella schermata Home. Altrimenti segui i passi della guida dal menu ⋮." },
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
          { etichetta: "Semplice / Avanzata", valore: "Quanto vedere: in Avanzata compaiono ritmi, proiezioni, riepiloghi e campi in più. Le pagine restano le stesse. Si parte in Semplice" },
          { etichetta: "Sei oltre il disponibile", valore: "Quello che compare al posto di «Puoi spendere» quando il disponibile è finito: la cifra è lo scoperto" },
        ]},
      ],
    },
  ],

  changelog: [
    { data: "2026-09-26", fonte: "Riallineamento allo stato reale dell'app (design/REVISIONE.md §6, src/app)", modifiche: "Versione Beta 0.4.0. Allineato al secondo giro di revisione: «Altri dettagli» nel modulo di spesa in Semplice, «Sei oltre il disponibile» in Oggi, riepilogo di Movimenti e «Chi ha anticipato» solo in Avanzata, «deve ricevere» in Famiglia, confronto con i periodi prima in Analisi, filtro «Chi ha pagato» nel Report, inviti con «Nuovo invito» / «Copia il codice» e annullamento confermato. L'accantonamento automatico sugli obiettivi è dichiarato non ancora in funzione (prima era descritto come attivo). Tolto il messaggio «non ancora attivi», che con l'archivio aggiornato non compare più. Modalità di partenza Semplice per i nuovi iscritti." },
    { data: "2026-09-26", fonte: "docs/installazione-app.md + src/components/install", modifiche: "Installazione in app: nuova procedura con il pulsante «Installa l'app» (dialogo diretto su Android, guida su iPhone), nota di verifica, caso «Apri nel browser» per i browser interni ad altre app, tre FAQ nuove e FAQ sulle notifiche iPhone allineata al link «Guarda come installarla»." },
    { data: "2026-09-26", fonte: "Interfaccia Beta 0.3.1 (src/app, src/components) + design/DIREZIONE-A.md", modifiche: "Prima stesura. Sezioni ricavate dalle pagine dell'app: navigazione, portafoglio, periodo e modalità Semplice/Avanzata; le otto pagine principali e le quattro di servizio; procedure per ricorrenti, conferme, buste, obiettivi, divisione e conguaglio, scontrini, inviti, notifiche e periodo personalizzato. Etichette copiate dall'interfaccia e messaggi d'errore presi dai testi reali; niente che non sia verificabile nel codice." },
  ],
};
