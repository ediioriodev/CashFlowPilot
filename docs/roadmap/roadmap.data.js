/* =============================================================================
   ROADMAP — DATI DI PROGETTO
   Questo è l'UNICO file da modificare per aggiornare la roadmap.
   La vista (Roadmap Progetto.dc.html) non va toccata.
   Caricato come script classico (window.roadmap): la pagina si apre con doppio clic,
   senza server locale. Non trasformarlo in modulo ES ("export"): sotto file:// non caricherebbe.

   Regole per l'aggiornamento (anche da parte di Claude Code):
   - stato ammessi: "pianificato" | "in corso" | "bloccato" | "completato"
   - priorita / impatto / probabilita: "alta" | "media" | "bassa"
   - date in formato ISO: "2026-09-18"
   - non cancellare gli elementi chiusi: spostali da puntiAperti a puntiChiusi
   - ogni modifica → aggiorna progetto.aggiornatoIl e, se serve, il changelog
   ========================================================================== */

window.roadmap = {
  progetto: {
    nome: "Cash Flow Pilot",
    cliente: "Progetto interno — uso familiare e personale",
    codice: "CFP",
    owner: "ediioriodev",
    metodologia: "Sviluppo a sessioni, documentazione di progetto in design/",
    inizio: "2026-02-11",
    fine: "—",
    versioneCorrente: "Beta 0.3.1",
    prossimoRilascio: "Beta 0.4.0 — i fix della revisione sono scritti: restano le prove a schermo e il collaudo (OP-021)",
    avanzamento: 88,
    salute: "a rischio", // "in linea" | "a rischio" | "critico"
    aggiornatoIl: "2026-09-19",
    fonteUltimoAggiornamento: "Sera del 19/09: revisione dell'app (OP-032), prima parte del collaudo (OP-021) e implementazione di tutti e tredici i rilievi — OP-033…OP-039 chiusi, verificati con tsc, eslint e build. Restano le prove a schermo (design/REVISIONE.md §5.3) e i casi 3, 5 e 6 del collaudo.",
  },

  obiettivo: {
    sintesi:
      "App di casa — non un gestionale — per tenere sotto controllo le spese familiari e personali. Una domanda per schermata, un solo numero in cima («Puoi spendere»), e il resto in grafica o dietro un tocco. PWA installabile, con notifiche per le spese ricorrenti da confermare.",
    beneficiAttesi: [
      "Un solo lessico per reale e previsto: prima lo stesso saldo aveva quattro nomi diversi in quattro schermate",
      "Sapere in un colpo d'occhio quanto resta davvero da spendere, al netto di impegnato e accantonato",
      "Dividere le spese di casa senza discussioni: chi ha anticipato, chi deve a chi, conguaglio chiudibile",
      "Tetti di spesa e obiettivi di risparmio che incidono sul disponibile, non decorativi",
    ],
    kpi: [
      { label: "Moduli in uso", valore: "14 su 14, da collaudare", target: "14 su 14 collaudati" },
      { label: "Controlli preventivi al database", valore: "12 su 12, verdi", target: "12 su 12" },
      { label: "Migrazioni applicate", valore: "8 su 8", target: "8 su 8" },
      { label: "Route della build", valore: "20", target: "—" },
      { label: "Collaudo a schermo moduli nuovi", valore: "non eseguito", target: "eseguito" },
      { label: "Suite di test automatici", valore: "assente", target: "—" },
      { label: "Righe di codice in src/", valore: "14.387", target: "—" },
    ],
    inScope: [
      "Portafoglio familiare e portafoglio personale, con switch sempre visibile",
      "Spese, entrate, spese ricorrenti con conferma, promemoria e notifiche push",
      "Budget a buste, obiettivi di risparmio, conguaglio familiare, scontrini",
      "Analisi e report sul periodo, con periodi personalizzati condivisi da tutta l'app",
      "Modalità Semplice / Avanzata: cambia quanto si vede, mai dove si trova",
      "PWA installabile, tema chiaro/scuro, layout mobile e desktop",
    ],
    outOfScope: [
      "App nativa iOS/Android",
      "Sincronizzazione con conti bancari o open banking",
      "Import automatico di estratti conto",
      "Gestione multi-gruppo per lo stesso utente (la convenzione è «un utente, un gruppo»)",
    ],
  },

  team: [
    { nome: "ediioriodev", ruolo: "Sviluppo, progettazione e conduzione del progetto" },
  ],

  // Timeline: fasi o sprint. periodo = etichetta libera, da/a = ISO per la barra.
  fasi: [
    { nome: "MVP — auth, spese, storico", da: "2026-02-11", a: "2026-02-21", stato: "completato", avanzamento: 100, milestone: "Beta 0.1.6 — accesso, spese, recupero password" },
    { nome: "Report, periodi e navigazione", da: "2026-03-07", a: "2026-03-08", stato: "completato", avanzamento: 100, milestone: "Beta 0.2.4 — report, periodi personalizzati, bottom nav" },
    { nome: "Promemoria e notifiche push", da: "2026-03-08", a: "2026-03-14", stato: "completato", avanzamento: 100, milestone: "Beta 0.3.0 — notifiche deduplicate, service worker stabile" },
    { nome: "Audit UI/UX e riscrittura (Direzione A)", da: "2026-09-16", a: "2026-09-16", stato: "completato", avanzamento: 100, milestone: "Design token, PeriodContext, libreria grafica, navigazione" },
    { nome: "Moduli nuovi — frontend", da: "2026-09-17", a: "2026-09-17", stato: "completato", avanzamento: 100, milestone: "Budget, Obiettivi, Quote e conguagli, Scontrini, modalità Semplice" },
    { nome: "Rilascio database e collaudo", da: "2026-09-19", a: "2026-09-26", stato: "in corso", avanzamento: 70, milestone: "Controlli preventivi, deploy e verifiche SQL fatti il 19/09. Resta il collaudo a schermo (design/COLLAUDO.md), compresa la prova a due utenti" },
    { nome: "Consolidamento e decisioni aperte", da: "2026-09-28", a: "2026-10-17", stato: "pianificato", avanzamento: 0, milestone: "Modalità di default, accantonamento automatico pianificato, debiti chiusi" },
  ],

  puntiAperti: [
    { id: "OP-021", titolo: "Collaudo a schermo dei moduli nuovi", tipo: "Analisi", priorita: "alta", owner: "ediioriodev", apertoIl: "2026-09-17", scadenza: "—", note: "IN CORSO dal 19/09 sera: casi 1 (versionamento del tetto), 2 (l'accantonamento cala il disponibile: versati 600 € e «Puoi spendere» sceso di 600) e 4 (scontrini) PASSATI. Caso 3 eseguito in parte su un gruppo di prova con due utenti: passati il fondo comune che resta fuori dal conguaglio, la chiusura, l'esclusione di una spesa inserita a periodo già saldato e la riapertura che ricalcola includendola. Restano la compensazione fra due anticipanti e la verifica delle quote non uguali, che dipende da OP-039 — il caso 3 ha infatti fatto emergere che il conguaglio calcolava su quote che l'interfaccia non mostrava. Caso 5 (modalità) rimandato per mancanza di un secondo dispositivo: non bloccante, si farà con l'account di test. Restano il caso 3 (quote e conguaglio) e il caso 6 (due utenti di gruppi diversi), entrambi riscritti passo per passo in design/COLLAUDO.md — il caso 3 anche come copione concreto in otto passi con gli importi da inserire e i saldi attesi (§3.0), su un gruppo di prova con due utenti perché richiedono preparazione — il 3 un gruppo con due membri, il 6 un secondo account in un gruppo nuovo. Dal caso 3 è già uscito un rilievo, OP-037, e la constatazione che il caso 3.4 non è eseguibile dall'interfaccia. Gli ostacoli sono stati tolti la sera del 19/09: OP-033 (le modali perdevano il fuoco a ogni carattere) e OP-039 (le quote sparivano al salvataggio) sono chiusi, quindi i casi che richiedono di scrivere in una modale si possono eseguire per quello che sono. Restano i casi 3 (i due passi finali: compensazione e quote non uguali, più il nuovo 3.4 sul rifiuto delle percentuali), 5 (modalità, serve un secondo dispositivo) e 6 (due utenti di GRUPPI DIVERSI: GruppoTest non basta, i suoi due utenti stanno nello stesso gruppo). Tutti e sei i casi sono ora dettagliati passo per passo in design/COLLAUDO.md, con importi ed esiti attesi. Primo minuto del collaudo: i casi 1.2 e 3.4 verificano che i trigger scattino ancora dopo la revoca dei privilegi del blocco 07. È l'unica affermazione della sessione non verificabile dal database, perché l'MCP è in sola lettura e servirebbe una scrittura; se desse permission denied si rimette il grant ad authenticated e si segnala. Il database è migrato e verificato, ma niente è ancora stato provato a schermo. Sei casi scritti in design/COLLAUDO.md, ognuno con l'esito atteso e cosa significa se non torna: versionamento del tetto, accantonamento che cala il disponibile, quote non uguali e conguaglio chiuso, scontrini anche sulle spese personali, modalità legata all'account. Il caso 6 è quello che non si può saltare: due utenti di gruppi diversi, l'unica prova vera delle policy RLS. Serve un secondo account registrato creando un gruppo nuovo, non accettando un invito. Stima mezza giornata." },
    { id: "OP-032", titolo: "Valutazione modulo per modulo: funzionalità, correttezza e chiarezza del dato", tipo: "Analisi", priorita: "alta", owner: "ediioriodev", apertoIl: "2026-09-19", scadenza: "—", note: "PRIMO GIRO FATTO il 19/09, da app web desktop: ne sono usciti tredici rilievi — dieci dalla revisione, tre altri emersi preparando ed eseguendo il collaudo — tutti registrati in design/REVISIONE.md con causa verificata sul codice, e tutti IMPLEMENTATI la sera stessa (OP-033…OP-039, chiusi). Restano da provare a schermo: nove prove elencate in design/REVISIONE.md §5.3. Il punto resta aperto perché il giro non è completo: sono stati guardati Oggi, Analisi, Report, Budget, Obiettivi e Fisse e abbonamenti — restano Spese, Famiglia, Promemoria, Altro e Impostazioni, e per tutti resta la prova su PWA installata, tablet e telefono, dove l'impaginazione cambia. Il lavoro passa in rassegna TUTTI i moduli su tre assi: la funzionalità (fa quello che serve), la correttezza del dato (i numeri tornano fra schermate diverse e con il database) e la chiarezza (il numero mostrato è quello che serve a decidere, e si capisce senza spiegazioni). L'asse della chiarezza è quello che il collaudo tecnico non tocca e che DIREZIONE-A pone come criterio di prodotto — ed è quello che ha prodotto più rilievi nel primo giro." },
    { id: "OP-022", titolo: "Pianificare run_auto_contributions() una volta al giorno", tipo: "Feature", priorita: "media", owner: "ediioriodev", apertoIl: "2026-09-17", scadenza: "—", note: "COS'È: un obiettivo può avere auto_importo e auto_giorno, ma il database non ha un orologio — finché nessuno chiama la funzione, quei campi restano numeri scritti e il salvadanaio non si riempie. COSA FA: per ogni obiettivo non archiviato il cui auto_giorno coincide col giorno del mese, inserisce un versamento, saltando chi ne ha già uno quel mese. COSA COMPORTA: va chiamata OGNI GIORNO, non ogni mese, perché il filtro è sul giorno esatto; un giorno saltato non si recupera e quel mese resta senza versamento; auto_giorno fra 29 e 31 non scatta mai a febbraio; sugli obiettivi di gruppo il versamento risulta fatto dall'amministratore. Chiamarla due volte in un giorno è innocuo (idempotente per mese). COME: pg_cron è installato, basta cron.schedule con select public.run_auto_contributions() — gira come postgres, nessuna service key. Dal 19/09 la funzione è revocata ad anon e authenticated, quindi da una Edge Function servirebbe la service key. Non bloccante: senza, i versamenti si fanno a mano. Dettaglio in design/DB-APPLICAZIONE.md." },
    { id: "OP-026", titolo: "DebugLog sostituisce i metodi di console e falsa l'attribuzione dei log", tipo: "Debito", priorita: "bassa", owner: "ediioriodev", apertoIl: "2026-09-16", scadenza: "—", note: "Montato solo in sviluppo. Ogni messaggio risulta originato da DebugLog.tsx:46 invece che dal file vero. Da decidere se toglierlo o farlo loggare senza sostituire console." },
    { id: "OP-027", titolo: "Warning ESLint preesistenti nei service e in register/inviti", tipo: "Debito", priorita: "bassa", owner: "ediioriodev", apertoIl: "2026-09-16", scadenza: "—", note: "no-explicit-any nei catch, entità non escapate. Mai introdotti dalla riscrittura e mai toccati: sistemabili in un passaggio dedicato." },
    { id: "OP-028", titolo: "Spese anteriori al 16/09 tutte attribuite al fondo comune", tipo: "Debito", priorita: "bassa", owner: "ediioriodev", apertoIl: "2026-09-16", scadenza: "—", note: "Scelta voluta: non si sa chi avesse anticipato, e «fondo comune» è l'unica interpretazione che non inventa debiti retroattivi. Se alcune erano anticipi reali si correggono una per una dalla modale di modifica." },
    { id: "OP-029", titolo: "Nessuna suite di test automatici nel repository", tipo: "Debito", priorita: "media", owner: "ediioriodev", apertoIl: "2026-09-19", scadenza: "—", note: "La verifica oggi è tsc --noEmit, eslint e la build. Le regole di src/lib/finance.ts (reale/previsto/accantonato) e la ripartizione delle quote sono i candidati naturali per i primi test." },
    { id: "OP-030", titolo: "users_group e groups_account sono leggibili per intero da ogni utente autenticato", tipo: "Debito", priorita: "media", owner: "ediioriodev", apertoIl: "2026-09-19", scadenza: "—", note: "Emerso dal controllo B. Entrambe hanno due policy SELECT con condizione «true», quindi chiunque abbia fatto accesso legge nomi, preferenze e push_token di tutti gli utenti e l'elenco di tutti i gruppi. Una delle due si chiama anche Insert_… pur essendo una SELECT. Preesistente, non introdotta dalle migrazioni nuove. Da restringere al proprio gruppo e da deduplicare (gli advisor la segnalano anche come multiple_permissive_policies). Dettaglio in design/RLS-BASELINE.md." },
    { id: "OP-031", titolo: "Sei funzioni SECURITY DEFINER invocabili senza aver fatto accesso", tipo: "Debito", priorita: "media", owner: "ediioriodev", apertoIl: "2026-09-19", scadenza: "—", note: "Baseline advisor del 19/09: accept_invite, cancel_invite, create_invite, notify_new_expense, register_user_with_group, validate_invite sono raggiungibili dal ruolo anon via /rest/v1/rpc/. Per registrazione e validazione invito è inevitabile, per le altre no — notify_new_expense è una funzione di trigger e non dovrebbe essere esposta affatto. Da rivedere revocando EXECUTE caso per caso." },
  ],

  puntiChiusi: [
    { id: "OP-033", titolo: "Le modali di Budget e Obiettivi perdono il fuoco a ogni carattere", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "Corretto in src/components/ui/kit.tsx. onClose vive in una ref, così l'effetto che porta il fuoco non dipende più da una funzione che cambia identità a ogni render; l'ascolto della tastiera e il fuoco iniziale sono due effetti distinti e dipendono solo dall'apertura; al primo fuoco si cerca il primo CAMPO e non il primo bottone, che in ordine di documento era la X. Nessuna pagina toccata: il difetto era tutto nel guscio. Da provare a schermo: REVISIONE.md §5.3 prova 1" },
    { id: "OP-034", titolo: "Vocabolario grafico: via i cerchi, scala sugli assi, eventi a barre", tipo: "Feature", chiusoIl: "2026-09-19", versione: "—", esito: "Cinque rilievi chiusi insieme. Gauge è diventato SplitBar (numero grande sopra, barra a segmenti sotto) e Ring è diventato MiniBar: nessuna forma circolare resta nell'app, e il numero di «Puoi spendere» non ha più niente sopra né dietro, quindi RIL-001 si chiude di conseguenza. AreaTrend dichiara la sua scala con cinque linee etichettate. «Andamento del saldo» in Oggi è passato ad adv-only. Il Report è a barre, con la serie costruita dall'intervallo invece che dai dati — così un giorno senza movimenti vale zero invece di sparire — e raggruppamento automatico dichiarato nell'intestazione. Le tre regole sono scritte in design/DIREZIONE-A.md §2. Da provare: §5.3 prove 5, 6, 7" },
    { id: "OP-035", titolo: "«Tetto per periodo» non dice di quale periodo si tratti", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "L'etichetta nomina il mese («Tetto per Settembre 2026»), l'aiuto dice «ogni mese» e la descrizione della modale dice da quale mese vale. Prima di scrivere si è accertato che il periodo del tetto è davvero l'intervallo di PeriodContext, sempre di lunghezza mensile: il testo dice la verità, non una semplificazione" },
    { id: "OP-036", titolo: "Fisse e abbonamenti: modifica in pagina, vita della voce, «Concluse»", tipo: "Feature", chiusoIl: "2026-09-19", versione: "—", esito: "«Scadute» è diventata «Concluse», con la data di fine finalmente formattata. Le righe si aprono su un dettaglio che mostra storico, previsto, «Nel 2026» e «In tutto»: nessuna tabella nuova, perché le occorrenze erano già righe di spese con recurring_parent_id. Il previsto si ferma al 31 dicembre e conta le occorrenze vere, non il «€/anno» già in pagina, che è una tariffa. Dallo stesso dettaglio si modifica la voce riusando EditExpenseModal. Chiude anche REQ-007 e REQ-008" },
    { id: "OP-037", titolo: "Le quote per percentuale vengono normalizzate di nascosto", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "Percentuali che non fanno 100 ora fermano il salvataggio, con l'errore sotto al riquadro e un avviso. Si è scelto di rifiutare invece di normalizzare dichiarandolo (decisione 5): nel resto dell'app un avviso significa che qualcosa non si può fare, e una normalizzazione silenziosa su una cifra che qualcuno dovrà rimborsare fa perdere fiducia nei numeri" },
    { id: "OP-038", titolo: "Una riga di CSS spegne il colore del testo di ogni pulsante", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "La regola di globals.css è stata divisa: font: inherit resta su campi e pulsanti, color: inherit solo sui campi, dove serviva a Safari. Il testo dei pulsanti torna a essere quello dichiarato dal variant, in entrambi i temi. Da provare a schermo in tema chiaro E scuro: §5.3 prova 2" },
    { id: "OP-039", titolo: "Le quote salvate non si vedono e si cancellano al salvataggio", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "La modale di modifica ora legge le quote della spesa e le mostra, e SplitEditor non avvisa più il genitore al montaggio — era quella notifica a far credere che l'utente avesse toccato le quote, con l'effetto di cancellarle al salvataggio. Era il difetto peggiore trovato nella revisione: silenzioso e su un dato che stabilisce chi deve quanto a chi. Da provare: §5.3 prova 3" },
    { id: "OP-001", titolo: "MVP: accesso, inserimento spese, storico, tema scuro", tipo: "Feature", chiusoIl: "2026-02-18", versione: "Beta 0.1.3", esito: "In uso" },
    { id: "OP-002", titolo: "Recupero password e refresh dell'app con dati corretti", tipo: "Bug", chiusoIl: "2026-02-21", versione: "Beta 0.1.6", esito: "Risolto dopo cinque iterazioni sul reindirizzamento" },
    { id: "OP-003", titolo: "Funzionalità Report", tipo: "Feature", chiusoIl: "2026-03-07", versione: "Beta 0.2.0", esito: "In uso" },
    { id: "OP-004", titolo: "Periodi personalizzati in storico e analisi, navigazione a barra", tipo: "Feature", chiusoIl: "2026-03-07", versione: "Beta 0.2.1", esito: "In uso" },
    { id: "OP-005", titolo: "Maggior dettaglio dati e visualizzazione in Spese", tipo: "Feature", chiusoIl: "2026-03-07", versione: "Beta 0.2.2", esito: "In uso" },
    { id: "OP-006", titolo: "Promemoria e notifiche per le spese ricorrenti da confermare", tipo: "Feature", chiusoIl: "2026-03-08", versione: "Beta 0.2.3", esito: "In uso" },
    { id: "OP-007", titolo: "Notifiche push: service worker, sottoscrizioni e deduplica", tipo: "Bug", chiusoIl: "2026-03-14", versione: "Beta 0.3.0", esito: "Risolto dopo sei rilasci consecutivi di correzione" },
    { id: "OP-008", titolo: "Audit UI/UX del frontend originale — 23 problemi", tipo: "Analisi", chiusoIl: "2026-09-16", versione: "—", esito: "Tutti risolti dalla riscrittura Direzione A. AUDIT.md resta come riferimento storico" },
    { id: "OP-009", titolo: "Fondamenta: design token, PeriodContext, finance.ts, libreria grafica, navigazione", tipo: "Feature", chiusoIl: "2026-09-16", versione: "Beta 0.3.1", esito: "In uso. Zoom riabilitato, contrasti a norma, un solo selettore di periodo" },
    { id: "OP-010", titolo: "Fondo comune vs anticipo (colonna paid_by)", tipo: "Feature", chiusoIl: "2026-09-16", versione: "Beta 0.3.1", esito: "Migrazione applicata e verificata sul database. In uso" },
    { id: "OP-011", titolo: "Budget a buste — frontend, service e pagine", tipo: "Feature", chiusoIl: "2026-09-17", versione: "—", esito: "Scritto e compilato; aspetta la migrazione" },
    { id: "OP-012", titolo: "Obiettivi di risparmio — frontend e sottrazione dal disponibile", tipo: "Feature", chiusoIl: "2026-09-17", versione: "—", esito: "Scritto e compilato; aspetta la migrazione" },
    { id: "OP-013", titolo: "Quote personalizzate e conguagli chiusi — frontend", tipo: "Feature", chiusoIl: "2026-09-17", versione: "—", esito: "Scritto e compilato; il pulsante «Segna come saldato» ora esiste davvero" },
    { id: "OP-014", titolo: "Scontrini — caricamento compresso su bucket privato", tipo: "Feature", chiusoIl: "2026-09-17", versione: "—", esito: "Scritto e compilato; aspetta la migrazione" },
    { id: "OP-015", titolo: "Modalità Semplice / Avanzata", tipo: "Feature", chiusoIl: "2026-09-17", versione: "—", esito: "Stesso markup, due classi CSS, nessun ramo di codice duplicato. In uso" },
    { id: "OP-016", titolo: "Tre correzioni al SQL prima di qualsiasi applicazione", tipo: "Bug", chiusoIl: "2026-09-17", versione: "—", esito: "get_settlement non inventa più debiti retroattivi; aggiunte get_settlement_totals, set_budget e clear_budget" },
    { id: "OP-020", titolo: "Applicare le cinque migrazioni rimanenti — metodo da decidere", tipo: "Dipendenza", chiusoIl: "2026-09-19", versione: "—", esito: "Applicate a mano dall'SQL editor con APPLICA_TUTTO.sql, in una transazione sola: l'MCP è rimasto in sola lettura per tutto il tempo. Il bundle è cresciuto a otto blocchi, con il 06 (view_mode, per non fare due deploy) e il 07 (correzione privilegi). Primo tentativo fallito per un errore nello script che aveva assemblato il bundle, non nel SQL: la transazione ha annullato tutto senza lasciare niente a metà. VERIFICA_moduli_nuovi.sql senza ❌" },
    { id: "OP-024", titolo: "La modalità Semplice/Avanzata è per dispositivo, non per utente", tipo: "Feature", chiusoIl: "2026-09-19", versione: "—", esito: "Colonna users_group.view_mode e sincronizzazione al login in ModeContext, con lo stesso meccanismo che ThemeContext usa per dark_mode. localStorage resta come copia locale per dipingere prima che risponda il database; se divergono vince il database. NULL significa «non ha ancora scelto». Da verificare a schermo: COLLAUDO.md caso 5" },
    { id: "OP-025", titolo: "Modalità di default: oggi Avanzata, la specifica dice Semplice", tipo: "Richiesta", chiusoIl: "2026-09-19", versione: "—", esito: "Default portato a Semplice come vuole DIREZIONE-A §4. Si è potuto chiudere solo insieme a OP-024: la migrazione 06 scrive view_mode = 'advanced' sui dieci utenti esistenti, così il cambio riguarda chi arriva da ora e non toglie blocchi a chi li usava — che era l'obiezione che teneva ferma la decisione. Allineati MODE_DEFAULT, getSnapshot e lo script di bootstrap di layout.tsx" },
    { id: "OP-019", titolo: "Nessun MCP configurato sul database di questo progetto", tipo: "Dipendenza", chiusoIl: "2026-09-19", versione: "—", esito: "Risolto con un .mcp.json di progetto: server supabase-cloud su rxpbqwvnmaxjzlobgebc, --read-only. A parità di nome oscura quello globale solo in questa cartella, e il database aziendale non è più raggiungibile da qui. Il file non è versionato: va ricreato su ogni macchina" },
    { id: "OP-017", titolo: "Controlli preventivi sul database prima del rilascio (PRE-RILASCIO.md, passi 0 e A-K)", tipo: "Analisi", chiusoIl: "2026-09-19", versione: "—", esito: "Eseguiti tutti via MCP in sola lettura: cancello verde, nessun bloccante rosso. Esiti, policy lette e baseline advisor in design/RLS-BASELINE.md. Ne sono usciti due punti nuovi (OP-030, OP-031) e la conferma che l'MCP in sola lettura condiziona il metodo di deploy" },
    { id: "OP-018", titolo: "Policy RLS già attive non presenti nel repository", tipo: "Debito", chiusoIl: "2026-09-19", versione: "—", esito: "Lette dal database e trascritte in design/RLS-BASELINE.md. Usano la stessa convenzione «un utente, un gruppo» di current_group_id(): niente da conciliare prima del deploy. La prova con due utenti di gruppi diversi resta in OP-021" },
    { id: "OP-023", titolo: "Corpo di get_spese_personali sconosciuto: receipt_path potrebbe non arrivare", tipo: "Bug", chiusoIl: "2026-09-19", versione: "—", esito: "Nessun intervento necessario: usa to_jsonb(s) come get_spese_condivise, quindi receipt_path arriverà al frontend anche sulle spese personali e la graffetta comparirà. Entrambe sono SECURITY INVOKER, come il collaudo pretende" },
  ],

  rilasci: [
    { versione: "Beta 0.4.0", data: "—", stato: "pianificato", ambiente: "—", contenuti: ["Budget a buste", "Obiettivi di risparmio", "Quote personalizzate e conguagli chiusi", "Scontrini"], note: "Il codice è già scritto: il rilascio coincide con l'applicazione delle migrazioni e il collaudo a schermo." },
    { versione: "Beta 0.3.1", data: "2026-09-16", stato: "completato", ambiente: "Sviluppo locale", contenuti: ["Riscrittura Direzione A", "Design token e libreria grafica", "Fondo comune (paid_by)", "Pagine Famiglia, Ricorrenti, Altro"], note: "Migrazione paid_by applicata e verificata sul database il 16/09." },
    { versione: "Beta 0.3.0", data: "2026-03-14", stato: "completato", ambiente: "Produzione", contenuti: ["Gestione promemoria migliorata", "Deduplica delle notifiche"], note: "Chiude sei rilasci consecutivi dedicati alle notifiche push." },
    { versione: "Beta 0.2.4", data: "2026-03-08", stato: "completato", ambiente: "Produzione", contenuti: ["Rifinitura impostazioni", "Gestione sottoscrizioni push esistenti"], note: "" },
    { versione: "Beta 0.2.0", data: "2026-03-07", stato: "completato", ambiente: "Produzione", contenuti: ["Funzionalità Report"], note: "" },
    { versione: "Beta 0.1.6", data: "2026-02-21", stato: "completato", ambiente: "Produzione", contenuti: ["Recupero password", "Refresh app con dati corretti"], note: "" },
  ],

  richiesteCliente: [
    { id: "REQ-007", data: "2026-09-19", fonte: "Revisione dell'app del 19/09 — design/REVISIONE.md", richiesta: "Poter correggere una spesa fissa o un abbonamento direttamente dalla pagina «Fisse e abbonamenti», oltre che dal percorso ordinario", stato: "accettata", impatto: "media", versioneTarget: "Beta 0.4.0" },
    { id: "REQ-008", data: "2026-09-19", fonte: "Revisione dell'app del 19/09 — design/REVISIONE.md", richiesta: "Per ogni spesa fissa, consultare storico e previsto: quante volte è già stata pagata, se l'importo è cambiato, quanto peserà da qui in avanti", stato: "accettata", impatto: "media", versioneTarget: "Beta 0.4.0" },
    { id: "REQ-009", data: "2026-09-19", fonte: "Revisione dell'app del 19/09 — design/REVISIONE.md", richiesta: "Niente grafici circolari in tutta l'app: quantità e proporzioni si leggono per lunghezza, quindi a barre", stato: "accettata", impatto: "media", versioneTarget: "Beta 0.4.0" },
    { id: "REQ-001", data: "2026-09-16", fonte: "DIREZIONE-A §10 — decisioni di prodotto aperte", richiesta: "Come chiamare il numero principale: «Puoi spendere», «Ti resta» o «Disponibile»", stato: "da valutare", impatto: "bassa", versioneTarget: "da definire" },
    { id: "REQ-002", data: "2026-09-16", fonte: "DIREZIONE-A §10", richiesta: "Il conguaglio familiare si azzera ogni mese o resta un saldo progressivo?", stato: "da valutare", impatto: "media", versioneTarget: "da definire" },
    { id: "REQ-003", data: "2026-09-16", fonte: "DIREZIONE-A §10", richiesta: "L'accantonamento è solo virtuale (etichetta sui soldi) o legato a un conto reale?", stato: "da valutare", impatto: "media", versioneTarget: "da definire" },
    { id: "REQ-004", data: "2026-09-17", fonte: "DIREZIONE-A §10 + STATO §7", richiesta: "Modalità di default: Semplice per tutti, Avanzata come oggi, o chiesta al primo avvio", stato: "in analisi", impatto: "media", versioneTarget: "da definire" },
    { id: "REQ-005", data: "2026-09-16", fonte: "DIREZIONE-A §10", richiesta: "La quinta voce della barra: «Altro» come nei mockup, oppure «Famiglia» fissa con Analisi dentro Altro", stato: "da valutare", impatto: "bassa", versioneTarget: "da definire" },
    { id: "REQ-006", data: "2026-09-17", fonte: "STATO §7 priorità 4", richiesta: "Legare la modalità all'account invece che al dispositivo", stato: "in analisi", impatto: "media", versioneTarget: "da definire" },
  ],

  analisi: [
    { titolo: "Revisione dell'app — rilievi e piano d'azione", versione: "19/09/2026", stato: "approvato", aggiornato: "2026-09-19", riferimento: "design/REVISIONE.md", sintesi: "I dieci rilievi del primo giro di revisione (OP-032), ognuno con la causa verificata sul codice, e il piano d'azione in quattro lotti con l'ordine di esecuzione. È il documento da cui parte l'implementazione dei fix." },
    { titolo: "Stato del lavoro — punto di ripresa", versione: "17/09/2026", stato: "approvato", aggiornato: "2026-09-17", riferimento: "design/STATO.md", sintesi: "Il documento da leggere per primo: stato per modulo, migrazioni, note operative, cosa fare in ordine, debiti e decisioni prese." },
    { titolo: "Controlli preventivi al rilascio sul database", versione: "—", stato: "approvato", aggiornato: "2026-09-19", riferimento: "design/PRE-RILASCIO.md", sintesi: "Passo 0 (identità del progetto) più undici controlli in sola lettura, con il cancello dei bloccanti e dei non bloccanti. Eseguiti il 19/09: cancello verde. Resta la procedura da rifare prima di ogni nuovo passaggio sul database." },
    { titolo: "Baseline del database e policy RLS attive", versione: "19/09/2026", stato: "approvato", aggiornato: "2026-09-19", riferimento: "design/RLS-BASELINE.md", sintesi: "Esito controllo per controllo dei preventivi, corpo delle funzioni di lettura, baseline degli advisor security e performance. È l'unica copia nel repository delle policy RLS attive, che vivono solo sul database: serve anche da termine di confronto dopo il deploy." },
    { titolo: "Come applicare le migrazioni", versione: "—", stato: "approvato", aggiornato: "2026-09-19", riferimento: "design/DB-APPLICAZIONE.md", sintesi: "Le due strade di deploy — SQL editor o MCP — con pro e contro. Contiene la spiegazione estesa di run_auto_contributions: cos'è, cosa fa, cosa comporta pianificarla e i suoi casi limite (giorno saltato, auto_giorno 29-31, attribuzione all'amministratore)." },
    { titolo: "Collaudo a schermo dei moduli nuovi", versione: "19/09/2026", stato: "approvato", aggiornato: "2026-09-19", riferimento: "design/COLLAUDO.md", sintesi: "Sei casi con cosa fare, esito atteso e interpretazione dell'esito sbagliato. Copre budget, obiettivi, quote e conguagli, scontrini, modalità Semplice/Avanzata e la prova a due utenti di gruppi diversi, che è l'unica verifica possibile delle policy RLS." },
    { titolo: "Direzione A — specifica di prodotto", versione: "—", stato: "approvato", aggiornato: "2026-09-16", riferimento: "design/DIREZIONE-A.md", sintesi: "Le due regole (una domanda per schermata, tre blocchi), il vocabolario grafico, la formula di «Puoi spendere», il linguaggio, l'ordine di costruzione." },
    { titolo: "Moduli che richiedono nuove strutture dati", versione: "—", stato: "approvato", aggiornato: "2026-09-17", riferimento: "design/SPEC-MODULI-NUOVI.md", sintesi: "Specifica di Budget, Obiettivi, Quote e conguagli, Scontrini. Implementata per intero il 17/09." },
    { titolo: "Cosa è stato implementato", versione: "—", stato: "approvato", aggiornato: "2026-09-17", riferimento: "design/IMPLEMENTAZIONE.md", sintesi: "Dettaglio della riscrittura: fondamenta, vocabolario grafico, pagine, moduli nuovi, correzioni non cosmetiche e verifiche." },
    { titolo: "Audit UI/UX del frontend originale", versione: "—", stato: "approvato", aggiornato: "2026-09-16", riferimento: "design/AUDIT.md", sintesi: "I 23 problemi del frontend precedente, con file e riga. Riferimento storico: risolti." },
    { titolo: "Schema delle tabelle", versione: "—", stato: "approvato", aggiornato: "2026-09-19", riferimento: "DB_Table_schema.sql", sintesi: "Dieci tabelle. Verificato il 19/09 contro il database reale: tutti i tipi coincidono. Non contiene le policy RLS attive né il corpo delle funzioni di lettura, che ora stanno in design/RLS-BASELINE.md." },
    { titolo: "Laboratorio dei mockup", versione: "—", stato: "approvato", aggiornato: "2026-09-16", riferimento: "design/mockups.html", sintesi: "Mockup navigabili offline, editor dei token, pannello di valutazione. Resta come laboratorio per le decisioni aperte." },
  ],

  rischi: [
    { titolo: "Le policy RLS già attive non sono nel repository", probabilita: "bassa", impatto: "alta", mitigazione: "Rientrato il 19/09 col controllo B: lette sul database, trascritte in design/RLS-BASELINE.md, confermate compatibili con current_group_id(). Resta la verifica con due utenti di gruppi diversi dopo il deploy. Il file però è una fotografia: se le policy cambiano dalla dashboard non se ne accorge nessuno.", stato: "monitorato" },
    { titolo: "Anagrafiche e push_token leggibili da ogni utente autenticato", probabilita: "alta", impatto: "media", mitigazione: "Emerso dal controllo B: users_group e groups_account hanno SELECT a «true». Tracciato come OP-030, da restringere al proprio gruppo. Preesistente e indipendente dalle migrazioni nuove, quindi non blocca il deploy.", stato: "aperto" },
    { titolo: "I quattro moduli nuovi non sono mai stati collaudati a schermo", probabilita: "alta", impatto: "alta", mitigazione: "Cinque scenari definiti in STATO §7, da eseguire subito dopo il deploy. Il collaudo non è rinviabile: è la parte che fa emergere il resto.", stato: "aperto" },
    { titolo: "L'MCP Supabase di questo PC punta a un altro progetto", probabilita: "bassa", impatto: "alta", mitigazione: "Rientrato il 19/09: .mcp.json di progetto con lo stesso nome del server globale lo oscura dentro questa cartella, e punta a rxpbqwvnmaxjzlobgebc in sola lettura. Resta il Passo 0 a ogni sessione, perché il file non è versionato e su un'altra macchina tornerebbe attivo quello globale.", stato: "monitorato" },
    { titolo: "Il deploy manuale non registra le migrazioni nello storico Supabase", probabilita: "alta", impatto: "bassa", mitigazione: "Avvenuto: il 19/09 si è scelta la strada manuale e list_migrations resta vuoto. Le migrazioni sono idempotenti, quindi un db push futuro non romperebbe nulla, ma lo storico è bugiardo e va ricordato. Per riallinearlo servirebbe un supabase migration repair dedicato.", stato: "monitorato" },
    { titolo: "get_spese_personali potrebbe non serializzare le colonne nuove", probabilita: "bassa", impatto: "bassa", mitigazione: "Escluso dal controllo G del 19/09: la funzione usa to_jsonb(s), quindi receipt_path arriverà da sé. Rischio chiuso, resta a verbale perché il corpo vive solo sul database.", stato: "chiuso" },
    { titolo: "Il deploy via MCP richiede di togliere il --read-only", probabilita: "media", impatto: "alta", mitigazione: "Se si sceglie quella strada, l'MCP diventa in scrittura sul database di produzione: il Passo 0 va rifatto subito prima e il flag va rimesso subito dopo. In alternativa la strada manuale non espone mai una connessione in scrittura.", stato: "aperto" },
    { titolo: "In Supabase «revoke from public» non protegge da anon", probabilita: "media", impatto: "alta", mitigazione: "Scoperto il 19/09 rileggendo gli advisor dopo il deploy: un alter default privileges assegna execute ad anon e authenticated su ogni funzione creata in public, con grant nominali che una revoca a PUBLIC non tocca. run_auto_contributions, SECURITY DEFINER e scrivente su tutti i gruppi, era invocabile senza aver fatto accesso. Corretto col blocco 07. Regola per il futuro: se una funzione non deve essere pubblica, va revocata nominalmente, e gli advisor vanno riletti dopo ogni deploy.", stato: "monitorato" },
    { titolo: "Il progetto vive su un disco esterno", probabilita: "media", impatto: "media", mitigazione: "Se compaiono errori di percorso assurdi (moduli non trovati su file esistenti), controllare che l'unità sia montata prima di cercare la causa nel codice.", stato: "monitorato" },
    { titolo: "Sovrascrittura accidentale di .env.local", probabilita: "bassa", impatto: "alta", mitigazione: "Mai scrivere dentro il file: per le build di verifica si passano le variabili inline da PowerShell. È già successo una volta, il 16/09.", stato: "monitorato" },
  ],

  decisioni: [
    { data: "2026-09-19", contesto: "Quote di spesa", decisione: "Percentuali che non fanno 100 fermano il salvataggio, invece di essere normalizzate dichiarandolo. Nel resto dell'app un avviso significa che qualcosa non si può fare, e una normalizzazione silenziosa su una cifra che qualcuno dovrà rimborsare è il tipo di sorpresa che fa perdere fiducia nei numeri. L'altra strada resta praticabile: mostrare le quote in euro e togliere il blocco è più breve che scriverlo.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Vocabolario grafico", decisione: "Il numero principale di Oggi, tolto l'anello, diventa il numero grande sopra e una barra divisa in segmenti sotto (speso, impegnato, da parte, libero), con la legenda che c'è già. Togliendo l'anello si chiude da sé anche l'illeggibilità del numero a schermo largo: non ha più niente sopra né dietro.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Grafico del Report", decisione: "Il raggruppamento delle barre segue una soglia automatica a tre scalini invece di essere fisso o scelto a mano: una barra al giorno fino a 35 giorni, una a settimana (lunedì-domenica, somma degli importi) fino a sei mesi, una al mese oltre. Il riquadro dichiara sempre quale sta usando, perché un totale settimanale letto come giornaliero sarebbe un errore peggiore di quello che si sta correggendo. Scartato il settimanale fisso, che rompe l'altro estremo (una settimana sola = una barra sola, due anni = 104 barre), e il selettore manuale, che aggiunge un comando a una pagina che ha già filtri, categorie e intervallo.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Fisse e abbonamenti", decisione: "Il «previsto» di una spesa fissa si ferma al 31 dicembre dell'anno in corso, e si conta sulle occorrenze vere, non sul «€/anno» già mostrato in pagina: quello è una tariffa (importo × occorrenze annue) e su un abbonamento aperto a novembre direbbe 143,88 € dove il costo reale dell'anno è 23,98 €. Accanto resta un totale «in tutto» che copre la vita della voce. Scartato l'orizzonte a dodici mesi scorrevoli, che non risponde alla domanda «quanto mi costa quest'anno», e quello fino alla fine della ricorrenza: le occorrenze future esistono già a database ma arrivano fino a dieci anni quando manca una data di fine, e un totale su quell'arco non significa niente.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Revisione dell'app", decisione: "La didascalia del grafico in Analisi («barra piena = già successo, tratteggiata = ancora previsto», dove però c'è una linea) resta com'è: osservata durante la revisione ma non segnalata come rilievo, non si tocca.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Vocabolario grafico", decisione: "Niente forme circolari in tutta l'app: un arco non si confronta a occhio, una lunghezza sì. Gauge e Ring escono dalla libreria e al loro posto vanno barre. Con loro cadono due regole scritte: eventi (spese ed entrate) a barre e saldo a linea, perché un movimento esiste solo quando accade mentre un saldo esiste sempre; e ogni grafico dichiara la sua scala, perché un asse senza valori mostra la forma e nasconde la quantità.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Revisione dell'app", decisione: "I rilievi si raccolgono uno alla volta mentre si guarda l'app, senza cercarne la causa sul momento, e la fase di risoluzione si apre solo a raccolta chiusa. Cercare la causa a ogni rilievo avrebbe spezzato il giro di revisione, e a raccolta chiusa è emerso che dieci rilievi si riducevano a quattro interventi: molti condividevano la causa.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Modalità di default", decisione: "Il default passa a Semplice come dice la specifica, ma solo dopo aver scritto view_mode = 'advanced' sugli utenti esistenti: il cambio vale per chi arriva da ora. L'obiezione che teneva ferma la decisione non era sul merito, era sul non togliere blocchi a chi li usa — e si risolve con un travaso, non con una rinuncia.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Deploy delle migrazioni", decisione: "Strada manuale dall'SQL editor invece che via MCP: tiene l'MCP in sola lettura e fa tutto in una transazione. Lo storico Supabase resta disallineato, ma il controllo K aveva già mostrato che era vuoto, quindi non si è rinunciato a niente di reale.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Deploy delle migrazioni", decisione: "La colonna view_mode (OP-024) entra nello stesso bundle invece di andare in un deploy successivo: una migrazione in più nello stesso passaggio costa meno di un secondo giro sul database di produzione.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Accesso al database da questa cartella", decisione: "MCP di progetto con lo stesso nome di quello globale (supabase-cloud), così a parità di nome lo oscura dentro questa sola directory: il database aziendale non è più raggiungibile da qui, invece di restare accanto a quello giusto con un nome diverso.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Accesso al database da questa cartella", decisione: "L'MCP resta in sola lettura come impostazione predefinita. La scrittura si abilita solo per il deploy, di proposito e con un Passo 0 subito prima, e si richiude dopo: il costo è un riavvio, il beneficio è che nessun comando distratto può scrivere.", decisoDa: "ediioriodev" },
    { data: "2026-09-19", contesto: "Controlli preventivi", decisione: "Le policy RLS lette dal database si trascrivono nel repository (design/RLS-BASELINE.md) invece di restare solo nella cronologia della sessione: sono l'unica copia e servono come termine di confronto dopo il deploy.", decisoDa: "ediioriodev" },
    { data: "2026-09-17", contesto: "Implementazione moduli nuovi", decisione: "Il versionamento del tetto e la chiusura dei budget stanno sul database (set_budget, clear_budget), non sul client: dal client l'operazione non è atomica e può lasciare una categoria senza tetto attivo.", decisoDa: "ediioriodev" },
    { data: "2026-09-17", contesto: "Modalità Semplice", decisione: "Il default resta Avanzata invece di Semplice come diceva la specifica: passare a Semplice farebbe sparire blocchi a chi già li usa.", decisoDa: "ediioriodev" },
    { data: "2026-09-17", contesto: "Obiettivi di risparmio", decisione: "I soldi accantonati escono dal disponibile («Puoi spendere»). Senza questa riga l'obiettivo di risparmio sarebbe decorativo.", decisoDa: "ediioriodev" },
    { data: "2026-09-17", contesto: "Quote di spesa", decisione: "Zero righe in expense_splits significa parti uguali: nessuna migrazione dei dati esistenti e nessun caso speciale nel codice.", decisoDa: "ediioriodev" },
    { data: "2026-09-17", contesto: "Scontrini", decisione: "Il bucket è privato e si usano sempre URL firmate a tempo, con compressione lato client prima del caricamento.", decisoDa: "ediioriodev" },
    { data: "2026-09-16", contesto: "Fondo comune", decisione: "paid_by NULL significa fondo comune ed è il default: non si inventano debiti se nessuno dichiara di aver anticipato. Le spese storiche restano tutte a fondo comune.", decisoDa: "ediioriodev" },
    { data: "2026-09-16", contesto: "Direzione A", decisione: "Un solo numero in cima: «Puoi spendere» = saldo reale − impegnato − accantonato. Calcolo prudente, non conta le entrate ancora attese.", decisoDa: "ediioriodev" },
    { data: "2026-09-16", contesto: "Direzione A", decisione: "Un solo periodo per tutta l'app (PeriodContext), non uno per pagina: prima c'erano tre implementazioni diverse e i totali non tornavano fra le schermate.", decisoDa: "ediioriodev" },
    { data: "2026-09-16", contesto: "Direzione A", decisione: "Token semantici, mai colori Tailwind grezzi nei componenti; il colore non è mai l'unico segnale, ogni stato ha icona o parola accanto.", decisoDa: "ediioriodev" },
    { data: "2026-09-16", contesto: "Navigazione", decisione: "Il «+» è un'azione, non una tab; Budget prende il posto di Analisi nella barra in basso, perché il tetto è la domanda di ogni giorno.", decisoDa: "ediioriodev" },
  ],

  /* ---------------------------------------------------------------------------
     VISTA TECNICA INTERNA — dettaglio per il team di sviluppo
     ------------------------------------------------------------------------ */
  tecnicaInterna: {
    sintesi:
      "PWA Next.js con App Router e backend Supabase: nessun server applicativo proprio. Il client parla direttamente con Postgres via PostgREST e RPC; le regole che non possono essere atomiche dal client (versionamento dei budget, conguaglio) stanno in funzioni SQL. Lo stato dei moduli che dipendono da tabelle non ancora create è riconosciuto a runtime e mostrato all'utente invece di generare errori.",
    stack: [
      { area: "Frontend", tecnologia: "Next.js 16.1.6 (App Router, webpack), React 19.2.3, TypeScript 5", note: "19 route, build 20 pagine" },
      { area: "Stile", tecnologia: "Tailwind CSS 4 con @theme inline", note: "Token semantici in globals.css: bg-surface, text-muted, border-line" },
      { area: "Backend e dati", tecnologia: "Supabase — Postgres, Auth, Storage, Edge Functions", note: "RLS sulle tabelle; funzioni RPC per le operazioni non atomiche" },
      { area: "Grafica", tecnologia: "SVG inline (charts.tsx) + Recharts 3.7", note: "Recharts entra solo in /report, lato client via next/dynamic" },
      { area: "PWA e notifiche", tecnologia: "next-pwa 5.6 con custom worker, Web Push (VAPID)", note: "Edge Function send-reminders per i promemoria" },
      { area: "Qualità", tecnologia: "tsc --noEmit, ESLint 9 (eslint-config-next)", note: "Nessuna suite di test automatici — vedi OP-029" },
    ],
    componenti: [
      { nome: "src/lib/finance.ts", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Il modello reale/previsto/accantonato in un posto solo: buildOverview()" },
      { nome: "src/components/ui/charts.tsx", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Gauge, Ring, Bars, AreaTrend, StackBar, ProgressTrack. Pieno = reale, tratteggiato = previsto" },
      { nome: "src/components/ui/kit.tsx", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Primitive UI: Modal con ESC, focus trap e ripristino del focus" },
      { nome: "src/lib/moduleState.ts", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Distingue «la tabella non esiste ancora» da «qualcosa è andato storto» (42P01, 42883, 42703, PGRST202, PGRST205)" },
      { nome: "src/context (Period, Mode, Theme, Auth, Scope)", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Tema e modalità vivono nel DOM, scritti prima della prima pittura; React li legge con useSyncExternalStore" },
      { nome: "src/services/budgetService.ts + /budget", responsabile: "ediioriodev", stato: "bloccato", copertura: "—", note: "Scritto e compilato. Aspetta 20260101000100_budgets.sql" },
      { nome: "src/services/goalService.ts + /obiettivi", responsabile: "ediioriodev", stato: "bloccato", copertura: "—", note: "Scritto e compilato. Aspetta 20260101000200_goals.sql" },
      { nome: "src/services/familyService.ts + /famiglia", responsabile: "ediioriodev", stato: "in corso", copertura: "—", note: "In uso con fallback: senza le tabelle nuove il conguaglio resta in parti uguali, com'era prima" },
      { nome: "src/services/receiptService.ts + ReceiptPicker", responsabile: "ediioriodev", stato: "bloccato", copertura: "—", note: "Aspetta 20260101000400_receipts.sql e il bucket privato receipts" },
      { nome: "src/services/recurringService.ts + /ricorrenti", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Normalizza ogni cadenza a costo mensile e annuale" },
      { nome: "src/services/notificationService.ts + Edge Function send-reminders", responsabile: "ediioriodev", stato: "completato", copertura: "—", note: "Web Push con deduplica; candidata a ospitare run_auto_contributions" },
      { nome: "supabase/migrations", responsabile: "ediioriodev", stato: "bloccato", copertura: "—", note: "6 file + APPLICA_TUTTO.sql (idempotente) + due script di verifica. Una sola applicata" },
    ],
    ambienti: [
      { nome: "Sviluppo locale", versione: "Beta 0.3.1", url: "localhost:3000", stato: "in corso", note: ".env.local obbligatorio e non versionato. La build va lanciata da PowerShell, con le variabili inline: sotto Git Bash la conversione dei percorsi MSYS fa fallire webpack" },
      { nome: "Database Supabase", versione: "1 migrazione su 6", url: "https://rxpbqwvnmaxjzlobgebc.supabase.co", stato: "in corso", note: "PostgreSQL 17.6. MCP di progetto configurato il 19/09 in sola lettura; policy RLS attive trascritte in design/RLS-BASELINE.md. Controlli preventivi verdi: restano le cinque migrazioni da applicare" },
      { nome: "Produzione", versione: "Beta 0.3.0", url: "—", stato: "in corso", note: "La destinazione di deploy non è documentata nel repository: campo da completare" },
    ],
    debitoTecnico: [
      { voce: "Policy RLS attive non versionate: l'originale resta sul database, la copia del 19/09 è in design/RLS-BASELINE.md e non si aggiorna da sola", impatto: "media", effort: "—", stato: "in corso" },
      { voce: "users_group e groups_account hanno SELECT a «true»: ogni autenticato legge anagrafiche e push_token di tutti (OP-030)", impatto: "media", effort: "—", stato: "pianificato" },
      { voce: "Sei funzioni SECURITY DEFINER esposte al ruolo anon via /rest/v1/rpc/ (OP-031)", impatto: "media", effort: "—", stato: "pianificato" },
      { voce: "Nessuna suite di test automatici (finance.ts e le quote sono i primi candidati)", impatto: "media", effort: "—", stato: "pianificato" },
      { voce: "Modalità legata al dispositivo invece che all'account", impatto: "media", effort: "0,5 gg", stato: "pianificato" },
      { voce: "DebugLog sostituisce console e falsa l'attribuzione dei messaggi", impatto: "bassa", effort: "—", stato: "pianificato" },
      { voce: "Warning ESLint preesistenti (no-explicit-any nei catch, entità non escapate)", impatto: "bassa", effort: "—", stato: "pianificato" },
      { voce: "Corpo di get_spese_personali sconosciuto (non nel repository)", impatto: "bassa", effort: "—", stato: "pianificato" },
      { voce: "Artefatti PWA rigenerati a ogni build: vanno ripristinati o sporcano il diff", impatto: "bassa", effort: "—", stato: "in corso" },
    ],
    metriche: [
      { label: "File TypeScript in src/", valore: "74" },
      { label: "Righe di codice in src/", valore: "14.387" },
      { label: "Route della build", valore: "20" },
      { label: "Service", valore: "12" },
      { label: "Tabelle a schema", valore: "10 + 6 dalle migrazioni" },
      { label: "Migrazioni applicate", valore: "1 su 6" },
    ],
  },

  /* ---------------------------------------------------------------------------
     VISTA FUNZIONALE INTERNA — dettaglio analisi e regole
     ------------------------------------------------------------------------ */
  funzionaleInterna: {
    sintesi:
      "Due portafogli — Famiglia e Personale — con lo stesso impianto: un periodo condiviso da tutta l'app, un modello unico reale/previsto e una sola parola per ogni concetto. Ogni schermata risponde a una domanda sola; la modalità Semplice riduce quanto si vede senza spostare nulla.",
    moduli: [
      { nome: "Oggi (home)", stato: "completato", copertura: "Tachimetro «Puoi spendere», tre tile, spese da confermare, andamento, modale «Come si calcola»", aperti: "—" },
      { nome: "Movimenti", stato: "completato", copertura: "Ricerca, chip dei filtri sempre visibili, barre settimanali, raggruppamento per giorno, eliminazione con Annulla", aperti: "—" },
      { nome: "Nuova spesa e modifica", stato: "completato", copertura: "Importo con virgola, validazione al blur, categorie recenti, chi ha pagato, ricorrenza, quote, scontrino", aperti: "Quote e scontrino aspettano il database" },
      { nome: "Spese ricorrenti", stato: "completato", copertura: "Fisse e abbonamenti, costo annuale, peso sulle uscite, conferma delle previste", aperti: "—" },
      { nome: "Famiglia", stato: "in corso", copertura: "Chi ha anticipato, conguaglio a trasferimenti minimi, membri, fisse condivise", aperti: "OP-020 — quote e conguagli chiusi aspettano le tabelle" },
      { nome: "Budget a buste", stato: "bloccato", copertura: "Anello totale, tacca «dove dovresti essere oggi», griglia di buste, dettaglio busta", aperti: "OP-020" },
      { nome: "Obiettivi di risparmio", stato: "bloccato", copertura: "Salvadanai, versamenti e prelievi, accantonamento automatico, crescita mese per mese", aperti: "OP-020, OP-022" },
      { nome: "Scontrini", stato: "bloccato", copertura: "Foto compressa lato client, bucket privato, URL firmate, graffetta nell'elenco", aperti: "OP-020, OP-023" },
      { nome: "Analisi e Report", stato: "completato", copertura: "Confronto mesi, composizione, top negozi, tabella alternativa per screen reader", aperti: "—" },
      { nome: "Promemoria e notifiche", stato: "completato", copertura: "Promemoria, notifiche push deduplicate, conferma delle ricorrenti", aperti: "—" },
      { nome: "Accesso, profilo, inviti, impostazioni", stato: "completato", copertura: "Registrazione, recupero password, inviti al gruppo, periodo personalizzato, tema, modalità", aperti: "OP-024" },
    ],
    attori: [
      { attore: "Titolare del portafoglio familiare", bisogno: "Sapere quanto resta da spendere e chi deve a chi", volumi: "—" },
      { attore: "Membro del gruppo", bisogno: "Inserire spese, dichiarare un anticipo, vedere il conguaglio", volumi: "—" },
      { attore: "Membro limitato (pensato per i figli)", bisogno: "Aggiungere spese senza toccare budget e obiettivi", volumi: "—" },
      { attore: "Amministratore del gruppo", bisogno: "Invitare membri e riaprire un conguaglio chiuso", volumi: "—" },
    ],
    flussi: [
      { nome: "Nuova spesa", passi: "Importo → categoria → chi ha pagato → (quote) → (scontrino) → salva", stato: "completato", note: "Quote e scontrino sono accessori: se falliscono la spesa resta salvata e l'app lo dice" },
      { nome: "Conferma di una spesa ricorrente", passi: "La spesa nasce prevista → resta impegnata → conferma in linea → diventa reale", stato: "completato", note: "L'impegnato è esattamente il totale delle spese da confermare: il numero torna a vista" },
      { nome: "Conguaglio familiare", passi: "Anticipi del periodo → quote → trasferimenti minimi → «Segna come saldato»", stato: "in corso", note: "Il fondo comune non entra nel conguaglio. Chiudere il periodo richiede la tabella settlements" },
      { nome: "Tetto di una busta", passi: "Imposta il tetto → si chiude la versione in corso → se ne apre una nuova", stato: "bloccato", note: "Operazione atomica lato database (set_budget): dal client lascerebbe la categoria senza tetto attivo" },
      { nome: "Accantonamento su un obiettivo", passi: "Versamento (manuale o automatico) → il saldo si somma dai contributi → il disponibile cala", stato: "bloccato", note: "Il saldo non è una colonna: si legge dalla vista goals_progress" },
      { nome: "Allegare uno scontrino", passi: "Scatto → compressione lato client → upload sul bucket privato → collegamento alla spesa", stato: "bloccato", note: "Se il collegamento fallisce il file viene rimosso: niente orfani nel bucket" },
    ],
    regole: [
      { codice: "RG-01", regola: "Puoi spendere = saldo reale − impegnato − accantonato. Le entrate ancora attese non si contano.", origine: "DIREZIONE-A §3, decisione 16/09" },
      { codice: "RG-02", regola: "Pieno = reale, tratteggiato = previsto. Unica convenzione grafica, valida per tachimetro, barre e linea.", origine: "DIREZIONE-A §2" },
      { codice: "RG-03", regola: "paid_by NULL significa fondo comune: la spesa è già di tutti e non entra nel conguaglio. Un uuid significa che quel membro ha anticipato.", origine: "Migrazione paid_by, 16/09" },
      { codice: "RG-04", regola: "Zero righe in expense_splits significa parti uguali. Non è un caso da gestire: è il default.", origine: "SPEC-MODULI-NUOVI §3" },
      { codice: "RG-05", regola: "Un tetto non si cancella, si chiude: mai DELETE su budgets. Il tetto che valeva a settembre deve restare leggibile guardando settembre.", origine: "Decisione 17/09" },
      { codice: "RG-06", regola: "Un conguaglio chiuso è un fatto storico: si riapre, non si modifica. La riapertura è riservata all'amministratore del gruppo.", origine: "Decisione 17/09" },
      { codice: "RG-07", regola: "Il bucket degli scontrini è privato: sempre URL firmate a tempo, mai conservate, nessun link pubblico.", origine: "Decisione 17/09" },
      { codice: "RG-08", regola: "Semplice e Avanzata cambiano quanto si vede, mai dove si trova: stesso markup, due classi CSS, nessun ramo di codice duplicato.", origine: "DIREZIONE-A §4" },
      { codice: "RG-09", regola: "Il colore non è mai l'unico segnale: ogni stato ha icona o parola accanto. Vale anche per i tre stati del budget.", origine: "DIREZIONE-A §2" },
      { codice: "RG-10", regola: "Stati di una busta: in linea sotto l'85%, quasi finito fra 85% e 100%, superato oltre il 100%.", origine: "SPEC-MODULI-NUOVI §1" },
      { codice: "RG-11", regola: "Un utente appartiene a un solo gruppo. È l'assunzione di current_group_id() ed è confermata sul database il 19/09: 10 utenti, 10 righe in users_group, nessun duplicato e nessun orfano.", origine: "PRE-RILASCIO, controllo A" },
    ],
  },

  /* ---------------------------------------------------------------------------
     VISTE PER IL CLIENTE — linguaggio esplicativo, zero gergo tecnico
     ------------------------------------------------------------------------ */
  clienteFunzionale: {
    sintesi:
      "Cash Flow Pilot serve a sapere, in ogni momento, quanto si può ancora spendere. Una schermata, una domanda: l'app mostra un numero solo in cima, già al netto delle spese fisse che arriveranno e dei soldi messi da parte. Si usano due portafogli separati — quello di casa e quello personale — e si passa dall'uno all'altro con un tocco.",
    cosaDisponibile: [
      { funzione: "Quanto posso spendere", descrizione: "Un solo numero in cima, con il disegno di come si divide il mese: già speso, già impegnato, ancora libero. Un link spiega come si calcola.", stato: "completato" },
      { funzione: "Spese e movimenti", descrizione: "Elenco con ricerca e filtri sempre visibili, raggruppato per giorno, con l'iniziale di chi ha pagato. Le eliminazioni si possono annullare.", stato: "completato" },
      { funzione: "Spese fisse e abbonamenti", descrizione: "Quanto costano all'anno e quanto pesano sulle uscite. Le spese che si ripetono restano previste finché non le si conferma.", stato: "completato" },
      { funzione: "Promemoria e notifiche", descrizione: "L'app avvisa quando c'è una spesa ricorrente da confermare, anche a telefono chiuso.", stato: "completato" },
      { funzione: "Spese di casa fra più persone", descrizione: "Si indica chi ha anticipato una spesa e l'app calcola chi deve a chi, con il minor numero di passaggi di denaro.", stato: "in corso" },
      { funzione: "Tetti di spesa per categoria", descrizione: "Un tetto mensile per ogni categoria, con una tacca che dice dove si dovrebbe essere oggi: se si corre troppo si vede subito.", stato: "in corso" },
      { funzione: "Obiettivi di risparmio", descrizione: "Salvadanai con avanzamento. I soldi messi da parte escono dal disponibile, così non si spendono per sbaglio.", stato: "in corso" },
      { funzione: "Scontrini allegati", descrizione: "Si fotografa lo scontrino e resta attaccato alla spesa, consultabile in qualsiasi momento.", stato: "in corso" },
      { funzione: "Analisi e report", descrizione: "Confronto fra i mesi, dove vanno i soldi, quanto pesano gli abbonamenti.", stato: "completato" },
      { funzione: "Vista Semplice o Avanzata", descrizione: "Un interruttore decide quanto dettaglio mostrare. Le cose restano sempre nello stesso posto: cambia solo quante se ne vedono.", stato: "completato" },
    ],
    beneficiCliente: [
      "Un numero solo da guardare, invece di quattro saldi con quattro nomi diversi",
      "Le spese di casa si dividono da sole: nessuna discussione su chi ha pagato cosa",
      "I risparmi sono protetti, perché escono dal disponibile invece di restare un buon proposito",
      "Funziona anche da telefono come app installata, con le notifiche per non dimenticare nulla",
    ],
    cosaServeDaVoi: [
      { richiesta: "Autorizzare l'aggiornamento dell'archivio dati", entro: "—", perche: "Quattro funzioni sono pronte ma restano spente finché l'archivio non viene aggiornato: tetti di spesa, obiettivi, divisione delle spese e scontrini." },
      { richiesta: "Mezza giornata per la prova d'uso", entro: "—", perche: "Dopo l'aggiornamento le funzioni nuove vanno provate davvero, meglio in due persone: è il modo per accorgersi subito se qualcosa non torna." },
      { richiesta: "Scegliere come si chiama il numero principale", entro: "—", perche: "«Puoi spendere», «Ti resta» o «Disponibile»: è la prima parola che si legge aprendo l'app." },
      { richiesta: "Decidere se il conguaglio si azzera ogni mese", entro: "—", perche: "Cambia il significato di quello che si legge nella schermata Famiglia: saldo del mese o saldo complessivo." },
      { richiesta: "Decidere la vista di partenza", entro: "—", perche: "Oggi l'app parte in Avanzata. Partire in Semplice mostrerebbe meno cose a chi apre l'app per la prima volta." },
    ],
  },

  clienteTecnica: {
    sintesi:
      "L'app si apre dal telefono o dal computer e si può installare come una normale applicazione. I dati non stanno sul dispositivo: sono conservati su un servizio dedicato, protetti da credenziali personali, e ogni persona vede soltanto il proprio portafoglio e quello del gruppo di cui fa parte.",
    puntiChiave: [
      { titolo: "Dove stanno i dati", spiegazione: "Su un servizio gestito, non sul telefono. Cambiando dispositivo si ritrova tutto entrando con le proprie credenziali." },
      { titolo: "Chi vede cosa", spiegazione: "Ogni persona vede il proprio portafoglio personale e quello del gruppo di cui fa parte. Le spese personali non sono visibili agli altri membri." },
      { titolo: "Gli scontrini", spiegazione: "Le foto sono conservate in un archivio chiuso: non esiste nessun indirizzo pubblico per aprirle. Ogni volta che si guarda uno scontrino viene generato un accesso temporaneo." },
      { titolo: "Le notifiche", spiegazione: "Arrivano anche ad app chiusa, per ricordare le spese che si ripetono. Si possono disattivare dalle impostazioni." },
      { titolo: "Funziona da telefono e da computer", spiegazione: "Sotto una certa larghezza l'app usa la barra in basso; su schermo grande passa a un menu laterale. Le funzioni sono le stesse." },
      { titolo: "Accessibilità", spiegazione: "Zoom sempre consentito, contrasti verificati, ogni grafico accompagnato dal testo corrispondente per i lettori di schermo, animazioni ridotte per chi le ha disattivate nel sistema." },
      { titolo: "Aggiornamenti", spiegazione: "L'app si aggiorna da sola alla riapertura. Le funzioni che richiedono un aggiornamento dell'archivio restano spente e lo dicono, invece di dare errore." },
    ],
    prestazioni: [
      { label: "Schermate dell'app", valore: "19", target: "—" },
      { label: "Funzioni attive", valore: "10 su 14", target: "14 su 14" },
      { label: "Installabile come app", valore: "sì", target: "—" },
    ],
  },

  clienteRoadmap: {
    messaggio:
"L'app è stata interamente ridisegnata: linguaggio, schermate e grafici sono quelli definitivi, ed è già utilizzabile tutti i giorni. Il 19 settembre è stato aggiornato l'archivio dati: le quattro funzioni nuove — tetti di spesa, obiettivi di risparmio, divisione delle spese e scontrini — sono ora accese. Resta la prova d'uso, che conviene fare in due persone: è l'unico modo di verificare che ciascuno veda solo i propri dati.",
    tappe: [
      { periodo: "Febbraio 2026", titolo: "Prima versione utilizzabile", stato: "completato", cosaSignifica: "Accesso, inserimento delle spese e storico: l'app comincia a servire a qualcosa." },
      { periodo: "Marzo 2026", titolo: "Report, periodi e promemoria", stato: "completato", cosaSignifica: "Analisi del periodo, periodi personalizzati e avvisi per le spese che si ripetono." },
      { periodo: "Settembre 2026", titolo: "Ridisegno completo", stato: "completato", cosaSignifica: "Un solo numero in cima, un linguaggio solo, grafici leggibili e una versione che funziona bene anche da computer." },
      { periodo: "Settembre 2026", titolo: "Quattro funzioni nuove", stato: "completato", cosaSignifica: "Tetti di spesa, obiettivi di risparmio, divisione delle spese e scontrini: scritte e pronte all'uso." },
      { periodo: "Settembre 2026", titolo: "Accensione delle funzioni nuove", stato: "completato", cosaSignifica: "L'archivio dati è stato aggiornato il 19 settembre: tetti di spesa, obiettivi, divisione delle spese e scontrini sono disponibili." },
      { periodo: "Prossimo passo", titolo: "Prova d'uso", stato: "in corso", cosaSignifica: "Verifica a schermo delle funzioni nuove, meglio in due persone: serve a controllare che ognuno veda soltanto i dati di casa propria." },
      { periodo: "A seguire", titolo: "Rifiniture e scelte di lingua", stato: "pianificato", cosaSignifica: "Accantonamento automatico dei risparmi, vista di partenza e i nomi ancora da decidere." },
    ],
    prossimiPassi: [
      { cosa: "Verifiche preventive sull'archivio dati — fatte, nessun ostacolo", quando: "19 settembre 2026", chi: "Sviluppo" },
      { cosa: "Aggiornamento dell'archivio — fatto, le quattro funzioni sono accese", quando: "19 settembre 2026", chi: "Sviluppo" },
      { cosa: "Prova d'uso delle funzioni nuove, in due persone", quando: "prossimo passo", chi: "Chi usa l'app" },
      { cosa: "Scelte aperte: nome del numero principale, conguaglio, vista di partenza", quando: "—", chi: "Chi usa l'app" },
    ],
  },

  changelog: [
    { data: "2026-09-19", fonte: "Implementazione dei rilievi della revisione", modifiche: "Chiusi tutti e sette i punti nati dalla revisione, nell'ordine deciso nel piano. OP-033 e OP-038 per primi, perché falsavano ogni altra verifica: le modali non si rimontano più a ogni carattere battuto e il testo dei pulsanti torna leggibile in tema chiaro. Poi OP-039, il difetto peggiore — le quote salvate ora si vedono e non spariscono più al salvataggio — e OP-037, che ferma il salvataggio invece di normalizzare di nascosto percentuali che non fanno 100. Quindi le parole (OP-035, «Tetto per Settembre 2026»), le fisse e abbonamenti (OP-036: «Concluse», dettaglio con storico e previsto fino al 31 dicembre, modifica in pagina) e per ultimo il vocabolario grafico (OP-034): Gauge e Ring sostituiti da SplitBar e MiniBar, nessuna forma circolare residua, scala sugli assi Y, Report a barre con i giorni vuoti a zero e raggruppamento automatico dichiarato. Le tre regole grafiche sono ora scritte in design/DIREZIONE-A.md §2. Verificato con npx tsc --noEmit, npx eslint e npm run build: nessun errore nuovo. NIENTE è ancora stato provato a schermo: le nove prove sono elencate in design/REVISIONE.md §5.3. Avanzamento da 82 a 88." },
    { data: "2026-09-19", fonte: "Collaudo, caso 3 su gruppo di prova", modifiche: "Eseguito il caso 3 (quote e conguaglio) su GruppoTest con due utenti: tre spese da 100 €, una dal fondo comune e due anticipate. Passati quattro passi su sei — il fondo comune non genera debiti, la chiusura azzera e lascia lo storico, una spesa inserita in un periodo già saldato resta fuori dai conti, la riapertura ricalcola includendola (da 90 a 100 €). Il caso ha però fatto emergere il difetto per cui esiste: il conguaglio calcolava 90 € dove le schermate mostravano parti uguali dappertutto, perché la modale di modifica non carica le quote salvate e riparte sempre da «Parti uguali», e al salvataggio le cancella (RIL-013 → OP-039). Restano da rifare, dopo la correzione, la prova delle quote non uguali e quella della compensazione fra due anticipanti. Registrato anche OP-038: una riga di CSS fuori da ogni @layer impone color:inherit a ogni pulsante e rende illeggibile il testo dei pulsanti primari in tema chiaro." },
    { data: "2026-09-19", fonte: "Collaudo a schermo, prima parte (OP-021)", modifiche: "Eseguiti i casi 1, 2 e 4: versionamento del tetto, accantonamento che cala il disponibile (600 € versati, «Puoi spendere» sceso di 600) e scontrini. Tutti passati. Caso 5 rimandato: serve un secondo dispositivo, non è bloccante. I casi 3 e 6 sono stati riscritti passo per passo in design/COLLAUDO.md, con il contesto di cosa si sta verificando: il 3 richiede un gruppo con almeno due membri, il 6 un secondo account registrato creando un gruppo nuovo. Preparando il caso 3 è emerso un rilievo nuovo (RIL-011 → OP-037): l'editor delle quote per percentuale avvisa che i numeri non fanno 100 e poi li normalizza, salvando valori diversi da quelli digitati. Ne consegue che il caso 3.4 non è eseguibile dall'interfaccia, perché quote incoerenti con l'importo l'app non sa produrle; il trigger check_splits_sum resta comunque esercitato dal caso 3.3." },
    { data: "2026-09-19", fonte: "Decisioni sul piano della revisione", modifiche: "Chiuse le quattro scelte che il piano di design/REVISIONE.md non poteva prendere da solo, prima di scrivere codice. 1) Il numero principale di Oggi, tolto l'anello, diventa numero grande più barra a segmenti con la legenda esistente. 2) Il grafico del Report raggruppa a soglia automatica — giorno fino a 35 giorni, settimana lunedì-domenica fino a sei mesi, mese oltre — dichiarando sempre quale raggruppamento usa. 3) Il previsto delle spese fisse si ferma al 31 dicembre dell'anno in corso e si conta sulle occorrenze vere: leggendo il codice è emerso che il «€/anno» in pagina è una tariffa (importo × occorrenze annue) e che le occorrenze future a database arrivano fino a dieci anni quando manca una data di fine, quindi né l'uno né l'altro erano una risposta mostrabile. 4) La didascalia del grafico in Analisi resta com'è. Aggiornati di conseguenza OP-034 e OP-036 e il piano in §4.3, §4.5 e §4.6." },
    { data: "2026-09-19", fonte: "Primo giro di revisione dell'app (OP-032)", modifiche: "Revisione a schermo da web desktop: dieci rilievi raccolti e registrati in design/REVISIONE.md, con prove a schermo in design/revisione-assets/. Per ognuno la causa è stata poi verificata leggendo il codice, e ne sono usciti quattro punti nuovi invece di dieci, perché molti rilievi condividevano la causa: OP-033 (il guscio delle modali perde il fuoco a ogni carattere: un solo difetto in kit.tsx che rende inutilizzabile la compilazione di Budget e Obiettivi), OP-034 (vocabolario grafico: via i cerchi, scala sugli assi Y, eventi a barre — cinque rilievi, sei pagine), OP-035 (la parola «periodo» nel tetto delle buste: accertato che il periodo è il mese corrente dell'app) e OP-036 (Fisse e abbonamenti: modifica in pagina, storico e previsto, «Scadute» che diventa «Concluse»). Tre rilievi erano richieste di prodotto e non difetti: registrate come REQ-007, REQ-008 e REQ-009. Il giro non è completo — restano Spese, Famiglia, Promemoria, Altro e Impostazioni, e tutte le prove su telefono e PWA — quindi OP-032 resta aperto. Il collaudo OP-021 non è stato eseguito e non è sostituito da questa revisione." },
    { data: "2026-09-19", fonte: "Chiusura sessione — correzione dei privilegi e pianificazione del lavoro successivo", modifiche: "Eseguito il blocco 07, che però ha corretto solo due funzioni su tre: il revoke nominale ad anon e authenticated non bastava su run_auto_contributions, perché restava il grant al pseudo-ruolo PUBLIC ereditato dal default di Postgres (in proacl si legge come =X/postgres, senza nome davanti). Blocco 07 corretto con «from public, anon, authenticated» e rieseguito: verificato sul database, nessuna funzione ha più una voce =X/ in proacl e run_auto_contributions è ora del solo service_role. La lezione, con il modo di accorgersene, è in design/RLS-BASELINE.md insieme al delta advisor misurato: NON è zero ma +2, voluti — current_group_id e is_group_admin restano eseguibili da authenticated perché le policy RLS le chiamano, e revocarle bloccherebbe ogni lettura delle tabelle nuove. +2 è la nuova linea di base. Aperto OP-032 (valutazione modulo per modulo su funzionalità, correttezza e chiarezza del dato), che insieme a OP-021 è il lavoro della prossima sessione." },
    { data: "2026-09-19", fonte: "Deploy delle migrazioni e implementazione di OP-024 e OP-025", modifiche: "Migrazioni applicate a mano dall'SQL editor: otto blocchi in una transazione, VERIFICA_moduli_nuovi.sql senza ❌. Chiusi OP-020 (deploy), OP-024 (la modalità segue l'account: colonna users_group.view_mode e sincronizzazione in ModeContext) e OP-025 (default a Semplice, possibile solo dopo il travaso di view_mode sugli utenti esistenti). Aggiunti al bundle i blocchi 06 (view_mode) e 07 (privilegi). Rileggendo gli advisor dopo il deploy è emerso che «revoke from public» non protegge da anon in Supabase: run_auto_contributions, SECURITY DEFINER e scrivente su tutti i gruppi, era invocabile senza accesso — corretta col blocco 07 e registrata come rischio. OP-021 riscritto e dettagliato in design/COLLAUDO.md (sei casi con esito atteso); OP-022 documentato per esteso in design/DB-APPLICAZIONE.md. Avanzamento da 71 a 82." },
    { data: "2026-09-19", fonte: "Esecuzione dei controlli preventivi sul database via MCP (design/PRE-RILASCIO.md)", modifiche: "Chiusi OP-019 (MCP di progetto configurato su rxpbqwvnmaxjzlobgebc), OP-017 (controlli 0 e A-K eseguiti, cancello verde), OP-018 (policy RLS lette e trascritte in design/RLS-BASELINE.md, convenzione «un utente, un gruppo» confermata) e OP-023 (get_spese_personali usa to_jsonb: receipt_path arriverà da sé). Aperti OP-030 (users_group e groups_account leggibili per intero da ogni autenticato) e OP-031 (sei funzioni SECURITY DEFINER invocabili da anon), entrambi preesistenti e non bloccanti. Aggiornati OP-020 e OP-022 con quanto emerso: l'MCP è in sola lettura e condiziona il metodo di deploy, pg_cron è già installato con un job da cui copiare. Nuovo documento design/RLS-BASELINE.md con la baseline degli advisor per il confronto dopo il deploy." },
    { data: "2026-09-19", fonte: "Prima compilazione da documentazione di progetto", modifiche: "Roadmap creata da design/*.md, git log, package.json e supabase/migrations. Ricostruiti storico rilasci (Beta 0.1.3 → 0.3.1), 16 punti chiusi, 13 aperti, 7 rischi, 10 decisioni. Le date delle due fasi future sono una finestra di pianificazione derivata dalle stime di STATO.md §7, non scadenze concordate." },
  ],
};
