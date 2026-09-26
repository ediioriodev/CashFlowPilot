# Collaudo a schermo dei moduli nuovi — OP-021

> Da eseguire **dopo** il deploy del 19/09/2026. Il SQL che passa dice solo che le strutture
> esistono: questi casi dicono se fanno la cosa giusta.
>
> Stima: **mezza giornata**. Sei casi più la prova a due utenti, che è l'unica non rimandabile.

> ✅ **I due ostacoli sono stati tolti il 19/09.** Le modali perdevano il fuoco a ogni carattere
> battuto (OP-033) e le quote salvate non si vedevano, anzi sparivano al salvataggio (OP-039):
> entrambi correttti, quindi i casi che chiedono di scrivere in una modale — il tetto di una
> busta, le quote — si possono ora eseguire per quello che sono, senza combattere con lo
> strumento. Dettaglio in `REVISIONE.md §5`.

Come si usa: ogni caso ha **cosa fare**, **cosa deve succedere** e **cosa significa se non
succede**. L'ultima colonna è quella che conta — un esito sbagliato non è «un bug generico», è
un indizio preciso su dove guardare.

Segna l'esito mentre procedi. Se un caso fallisce, fermati su quello: gli altri possono
dipenderne.

---

## Esiti — aggiornati il 26/09/2026

| Caso | Esito | Note |
|---|---|---|
| **1 · Budget, versionamento del tetto** | ✅ **passato** | Provato il 19/09 |
| **2 · Obiettivi, accantonamento sul disponibile** | ✅ **passato** | Primo versamento di 600 € su «Ristrutturazione»: «Da parte» 600,00 € e «Puoi spendere» sceso a 86,32 € |
| **3 · Quote e conguaglio** | ✅ **passato** | Copione §3.0 rifatto per intero il 26/09 su **GruppoTest** (A = Manu Di Io, B = Edi Dev), dopo aver cestinato le spese di prova del 19/09: passi 0-7 tutti con i saldi attesi (50 → 30 → 30 → 10 → saldato → invariato → 20). 3.4 passato: 70/20 bloccato con errore e avviso, 70/30 salvato. Trigger `check_splits_sum` esercitato senza *permission denied*. Anomalia dei 90 € chiusa: §3.9 |
| **4 · Scontrini** | ✅ **passato** | Graffetta, apertura e chiusura verificate |
| **5 · Modalità Semplice/Avanzata** | ✅ **passato** (5.1-5.4, 5.6) · 5.5 per costruzione | 26/09: il cambio scrive `view_mode` sull'account, la navigazione non cambia, F5 non lampeggia, e con una copia locale opposta (altro dispositivo simulato) vince l'account. 5.5 non eseguibile con l'account di test, che ha già `view_mode` = `advanced`: verificato su colonna (`NULL`, nessun default) e `MODE_DEFAULT` |
| **6 · Due utenti di gruppi diversi** | ✅ **passato** sui moduli nuovi · ⚠️ OP-030 aperto | 26/09: A = Edi Dev (GruppoTest), B = «Bla Bla» (gruppo 14). 6.1 busta, 6.2 obiettivo, 6.3 conguaglio, 6.5 spese in entrambe le direzioni: B non vede niente di A. 6.4: URL pubblico e non firmato → 400; URL firmato valido fino a scadenza, poi 400 `InvalidJWT` — la firma durava un'ora, ora cinque minuti. 6.6: la modalità di B non tocca A. **Resta OP-030**, preesistente: `users_group` e `groups_account` hanno SELECT a `true`, quindi B può leggere anagrafiche e `push_token` di tutti |

**OP-021: i sei casi sono passati.** Il perimetro dei moduli nuovi tiene; l'isolamento completo fra
gruppi dipende ancora da OP-030, che non è di questo collaudo ma ne è l'unica riserva.

### Difetti trovati durante il collaudo del 26/09 e già corretti

| Dove | Difetto | Correzione |
|---|---|---|
| Famiglia | «ha anticipato 30 €» accanto a 100 € anticipati: era il saldo, non l'anticipo | «deve ricevere 30 €» |
| Famiglia | tacca della «quota equa» a metà anche con quote 70/30 | la tacca è la quota vera di ciascuno |
| Famiglia | «0 spese» sempre, nel percorso via database | conteggio reale, «N anticipi» |
| Famiglia | a periodo saldato «Speso insieme 0,00 € · Nessuna spesa condivisa» | mostra lo speso vero, «saldato» per membro |
| Famiglia / form spesa | un anticipo datato in un periodo già saldato resta fuori dai conti senza che nessuno lo sappia | avviso nel form («Chi ha pagato») e in Famiglia, con chi può riaprire |
| Famiglia | un non amministratore non capiva perché non poteva riaprire | «Può riaprirlo solo ‹admin›» |
| `reopenSettlement` | una delete negata da RLS non dà errore: «Conguaglio riaperto» anche quando non lo era | controllo sulle righe cancellate |
| Budget | stessa causa: un membro non amministratore «toglie» una busta nata nel mese, l'app dice «Tetto rimosso» e la busta resta | rilettura dopo `clear_budget`, errore esplicito |
| Quote | «Per percentuale» partiva vuoto con «fanno 0%» già in rosso | parte dalle parti uguali |
| Quote | con 70/20 l'anteprima mostrava 77,78 € e 22,22 € (normalizzati) | mostra le cifre digitate |
| Quote | «A metà» identico a «Parti uguali» con due membri | nascosto sotto i tre membri |
| Quote | l'avviso «non fanno 100%» restava a schermo dopo il salvataggio riuscito | si chiude da solo |
| Scontrini | URL firmata valida un'ora | cinque minuti, rifirmata a ogni apertura |
| Movimenti | «Nessun risultato · Azzera i filtri» senza filtri attivi; «1 voci»; «-0,00 €» | stato vuoto corretto, singolare, zero senza segno |
| Ovunque | «1000,00 €» | «1.000,00 €» |
| Ovunque | avviso di idratazione su ogni pagina causato da estensioni del browser | `suppressHydrationWarning` sul `body` |

Durante la preparazione dei passi del caso 3 è emerso un rilievo nuovo, **RIL-011**
(`REVISIONE.md`): l'editor delle quote per percentuale avvisa che i numeri non fanno 100 ma poi
li normalizza e salva altri valori.

---

## Prima di cominciare

| Serve | Perché |
|---|---|
| **Due account in gruppi diversi** | È l'unico modo di provare le policy RLS. Non simulabile da un account solo: l'isolamento che si vuole verificare è proprio fra gruppi. |
| **Un'immagine qualsiasi** (foto, screenshot) | Per il caso 5, scontrini. Va bene un JPG o un PNG sotto i 5 MB. |
| **Almeno una spesa già a registro nel periodo corrente** | I casi 1 e 3 hanno bisogno di qualcosa su cui calcolare. |

Il secondo account si crea dalla registrazione normale creando un **gruppo nuovo**, non
accettando un invito: accettare un invito lo metterebbe nel tuo stesso gruppo e il test
perderebbe senso.

### Prima di tutto, un minuto: i trigger scattano ancora?

Il blocco 07 ha revocato `execute` su `touch_updated_at()` e `check_splits_sum()` anche ad
`authenticated`. Questo **non** dovrebbe impedire ai trigger di scattare — PostgreSQL verifica
il privilegio al `create trigger`, non a ogni attivazione — ma è l'unica affermazione della
sessione del 19/09 che non è stato possibile verificare dal database, perché l'MCP è in sola
lettura e servirebbe una scrittura.

I casi **1.2** e **3.4** la mettono alla prova per primi: cambiare il tetto di una busta esercita
`touch_updated_at`, salvare quote non uguali esercita `check_splits_sum`. Se uno dei due dà
*permission denied for function*, l'analisi era sbagliata: si rimette il grant con

```sql
grant execute on function public.touch_updated_at(), public.check_splits_sum() to authenticated;
```

e si segnala. È l'unica cosa che potrebbe bloccare le scritture, quindi conviene esaurirla
subito invece di scoprirla a metà collaudo.

---

## 1 · Budget: il versionamento del tetto

È il caso che la migrazione 01 è stata riscritta apposta per gestire. Cambiare un tetto è
«chiudi la versione in corso, aprine una nuova»: se va storto, la busta compare **due volte**
nello stesso periodo o resta senza tetto attivo per un istante.

### Le operazioni, con gli importi

Da `/budget`, sul periodo corrente. Usa una categoria che **usi davvero**, così lo speso non è
zero e il passo 1.1 dice qualcosa.

| # | Cosa fare, esattamente | Cosa deve succedere | Se non succede |
|---|---|---|---|
| 1.1 | «+ Busta» → categoria **Spesa** → tetto **400** → Salva | La busta compare con tetto 400 **e lo speso del periodo già calcolato**, non a zero | Speso a 0 con spese esistenti: `get_budget_status` non filtra il periodo come l'app |
| 1.2 | Apri la **stessa** busta, **nello stesso mese**, e porta il tetto da 400 a **500** | Resta **una sola** busta, con tetto 500 | Due righe per la stessa categoria: `set_budget` ha aperto una versione nuova invece di aggiornare quella nata nel periodo |
| 1.3 | Freccia **›** in cima per andare al **mese successivo**, poi cambia il tetto da 500 a **300** | Nel mese nuovo il tetto è 300. Tornando indietro con **‹** si rivede **500** | Se anche il passato diventa 300, il tetto non si versiona: si riscrive la riga |
| 1.4 | Sul mese corrente, apri la busta e usa **«Togli il tetto»** | La busta sparisce dall'elenco del periodo corrente, ma nei mesi precedenti i tetti storici ci sono ancora | Se sparisce anche dal passato, `clear_budget` cancella invece di chiudere |
| 1.5 | Ricrea un tetto da **250** sulla **stessa** categoria | Funziona, senza errore di indice unico | Un errore qui significa che la versione precedente non è stata chiusa davvero (`valido_a` ancora null) |

**Cosa si sta verificando.** Che il tetto sia un dato **versionato**: il 400 di settembre deve
restare 400 guardando settembre, anche dopo che a ottobre è diventato 300. Senza versionamento,
alzare il budget di un mese riscriverebbe la storia di tutti gli altri e i confronti fra mesi
direbbero il falso.

**Nota sull'etichetta.** Dal 19/09 il campo si chiama «Tetto per ‹mese›» e non più «Tetto per
periodo»: il periodo è sempre di lunghezza mensile, solare o a partire dal giorno scelto nelle
impostazioni. Se navighi su un mese passato e salvi, il tetto viene versionato **da quel mese**.

## 2 · Obiettivi: l'accantonamento incide sul disponibile

La regola di prodotto è che i soldi messi da parte **escono** da «Puoi spendere». Senza questo,
l'obiettivo di risparmio è un numero decorativo.

### Le operazioni, con gli importi

| # | Cosa fare, esattamente | Cosa deve succedere | Se non succede |
|---|---|---|---|
| 2.1 | In `/` (Oggi) **annota** il valore di «Puoi spendere» | — | — |
| 2.2 | `/obiettivi` → «+ Obiettivo» → «Test risparmio», traguardo **1.000 €** → Salva | L'obiettivo compare a 0 su 1.000 | — |
| 2.3 | Aprilo e versa **100 €** | Il progresso sale a 100 € | — |
| 2.4 | Torna in Oggi | «Puoi spendere» è **calato esattamente di 100 €** rispetto a 2.1, e nella legenda «Da parte» segna 100 € | Se non cambia, `finance.ts` non sottrae l'accantonato: è la regola centrale di `DIREZIONE-A`, non un dettaglio |
| 2.5 | Torna in Obiettivi e **preleva 40 €** | Progresso a 60 €, e in Oggi «Puoi spendere» **risale di 40** | Un prelievo che non risale significa che i versamenti si sommano e i prelievi no |
| 2.6 | **Archivia** l'obiettivo | Esce dall'elenco attivo e «Puoi spendere» torna **esattamente** al valore di 2.1 | Se il disponibile resta basso, l'archiviato continua a pesare |

⚠️ **L'accantonamento automatico non parte da solo.** Impostare «mettine da parte ogni mese» non
basta finché `run_auto_contributions()` non è pianificata sul database: è OP-022. Il riquadro
«Accantonamento automatico» lo mostra come se girasse: **non è un difetto da segnalare in questo
collaudo**, è un punto già aperto.

## 3 · Quote e conguaglio

> **Serve un gruppo con almeno due membri.** L'editor «Come si divide» non compare se nel gruppo
> c'è una persona sola (`SplitEditor.tsx:114`: sotto i due membri il componente non si disegna),
> e un conguaglio fra sé e sé non significa niente. Conta le persone in `/famiglia`: se sono una,
> questo caso si rimanda insieme al caso 6, che il secondo account ce l'ha già.
>
> Tieni **Famiglia** aperta in una scheda e **Spese** nell'altra: il caso è tutto un andirivieni
> fra le due.

### 3.0 · L'esempio concreto, con gli importi da inserire

> Un solo copione, otto passi, numeri scelti perché **ogni risultato si verifichi a mente**.
> Serve un **gruppo di prova con due utenti** — qui chiamati **Test A** (tu, che sei anche
> l'amministratore) e **Test B**. Tutte le spese vanno inserite nella scheda **condivisa** (il
> nome del gruppo, non quella personale) e **datate oggi**: il conguaglio si calcola sul periodo
> scelto in cima, e `get_settlement` ignora sia le spese future (`data_spesa <= current_date`) sia
> quelle **non confermate**.

| Passo | Chi | Cosa inserisce | Dove si guarda | Cosa deve dire |
|---|---|---|---|---|
| **0** | A | niente | `/famiglia` | «Siete in pari: nessuno deve niente a nessuno» |
| **1** | A | **100 €** · «Test 1» · **Chi ha pagato: Test A** · Parti uguali | `/famiglia` | «**Test B deve 50,00 € a Test A**» |
| **2** | A | modifica «Test 1» → quote **Per percentuale**: A **70**, B **30** | `/famiglia` | «**Test B deve 30,00 € a Test A**» |
| **3** | A | **60 €** · «Test 2» · **Chi ha pagato: fondo comune** | `/famiglia` | resta **30,00 €**: il fondo comune non entra |
| **4** | **B** | **40 €** · «Test 3» · **Chi ha pagato: Test B** · Parti uguali | `/famiglia` | «**Test B deve 10,00 € a Test A**» |
| **5** | A | «Segna come saldato» → «Sì, è saldato» | `/famiglia` | pastiglia **«saldato»**, «Conguaglio chiuso il …», «Test B ha dato 10,00 € a Test A» |
| **6** | A | **20 €** · «Test 4» · **Chi ha pagato: Test A** · Parti uguali, **datata oggi** | `/famiglia` | **niente cambia**: il periodo è chiuso, la spesa nuova resta fuori |
| **7** | A | «Riapri il conguaglio» | `/famiglia` | tornano tutte: «**Test B deve 20,00 € a Test A**» |

**Da dove escono i numeri** — utile per capire *quale* passo è sbagliato quando uno non torna:

| Dopo il passo | Ha anticipato A | Ha anticipato B | Deve A | Deve B | Saldo |
|---|---|---|---|---|---|
| 1 | 100 | 0 | 50 | 50 | B → A **50** |
| 2 | 100 | 0 | 70 | 30 | B → A **30** |
| 3 | 100 | 0 | 70 | 30 | B → A **30** (i 60 € del fondo non contano) |
| 4 | 100 | 40 | 90 | 50 | B → A **10** |
| 7 | 120 | 40 | 100 | 60 | B → A **20** |

**Cosa si sta verificando, passo per passo**

- **1** — gli anticipi entrano nel conguaglio e le parti uguali funzionano *senza* scrivere niente
  su `expense_splits` (convenzione «zero righe = parti uguali»).
- **2** — le quote personalizzate vengono scritte e lette. **È anche la prova del trigger**:
  `expense_splits_sum` scatta a ogni insert, quindi se il blocco 07 avesse tolto davvero il
  privilegio vedresti *permission denied for function*. Se salva, la domanda rimasta aperta il
  19/09 è chiusa.
- **3** — il fondo comune è già di tutti e non genera debiti.
- **4** — gli anticipi **si compensano**: B ne ha messi 40 di tasca sua e il suo debito scende da
  30 a 10, non resta 30 con un credito separato da qualche parte.
- **5** — la chiusura azzera e lascia lo **storico** dei trasferimenti.
- **6** — è il passo che conta davvero, più del «vai al periodo successivo»: `get_settlement`
  esclude ogni spesa la cui data cade dentro un periodo già chiuso. Se i 20 € di «Test 4»
  comparissero, un conguaglio chiuso non proteggerebbe niente e si ripagherebbero due volte gli
  stessi anticipi.
- **7** — riaprire riporta **tutto** dentro, compresa la spesa inserita a periodo chiuso: 20 €, non
  10. Un conguaglio chiuso è uno storico: si riapre, non si modifica.

**Se un numero non torna**, prima di aprire un punto controlla tre cose che il calcolo richiede e
che è facile sbagliare in un test: la spesa è **confermata**, è **datata oggi** (non domani) ed è
nella scheda **condivisa**, non in quella personale.

**Alla fine**, se il conguaglio è rimasto aperto, le quattro spese di prova si cancellano dal
cestino in `/spese`. Se lo hai lasciato chiuso, riaprilo prima: su un periodo chiuso la
cancellazione non cambierebbe lo storico già registrato.

---

> I passi 3.1-3.8 qui sotto sono la versione generica dello stesso copione, con «cosa
> significa se non succede» per ogni esito.


---

### 3.9 · Esito della sessione del 19/09 e l'anomalia da chiarire

Eseguito su **GruppoTest** (Edi Dev, amministratore · Manu Di Io) con tre spese da **100 €**
invece degli importi del copione: Test 1 dal fondo comune, Test 2 e Test 3 anticipate da Edi.

| Passo | Esito | Cosa si è visto |
|---|---|---|
| Fondo comune escluso | ✅ | 300 € spesi, di cui «100,00 € dal fondo comune · 200,00 € anticipati dai membri»: nel conguaglio entrano solo i 200 |
| Chiusura del conguaglio | ✅ | Pastiglia «saldato», «Conguaglio chiuso il 19/09/2026», storico «Manu Di Io ha dato 90,00 € a Edi Dev» |
| Spesa nuova a periodo chiuso | ✅ | Inserita una spesa da 20 € nel periodo già saldato: **non compare**, il conguaglio resta a zero. È il passo che protegge dal pagare due volte |
| Riapertura | ✅ | Tornano tutte, **compresa** quella inserita a periodo chiuso: da 90 € a **100 €**. La riapertura ricalcola, non ripristina una fotografia |
| Compensazione fra due anticipanti | ⏳ **non provata** | Tutte e tre le spese sono state anticipate da Edi o dal fondo comune: nessuna anticipata da Manu, quindi la compensazione — il passo 4 del copione — non è stata esercitata |
| Quote non uguali | ⚠️ **non attendibile** | Vedi sotto |

**L'anomalia.** Con due anticipi da 100 € entrambi in parti uguali, Manu dovrebbe dover
**100 €** (la metà di 200). Il conguaglio diceva **90 €**, e le schermate di modifica di Test 2 e
Test 3 mostravano «Parti uguali · 50,00 € e 50,00 €».

Non è un errore di calcolo: `get_settlement` usa le righe di `expense_splits` quando ci sono, e
90 € è il risultato coerente di quote **non** uguali su una delle due spese (per esempio 60/40).
Il problema è che quelle quote **non si vedevano**, perché la modale di modifica non le carica
mai e riparte sempre da «Parti uguali» — è **RIL-013 / OP-039**, trovato proprio da qui.

Quindi il caso 3 ha fatto il suo mestiere: ha mostrato una discrepanza fra ciò che l'app dice e
ciò che il database contiene.

**Per chiudere l'anomalia**, dall'SQL editor di Supabase (sola lettura):

```sql
select s.id, s.ambito, s.importo, s.paid_by, s.confermata, es.user_id, es.quota
from public.spese s
left join public.expense_splits es on es.spesa_id = s.id
where s.ambito like 'Test%'
order by s.id, es.user_id;
```

Se compaiono righe di `expense_splits` su Test 2 o Test 3, l'anomalia è spiegata e si chiude con
OP-039. Se **non** ce ne sono, il conto di `get_settlement` è sbagliato per conto suo e va aperto
un punto a sé.

✅ **Dal 19/09 c'è una strada più corta.** OP-039 è stato corretto: la modale di modifica ora
**carica e mostra** le quote salvate. Riaprendo Test 2 e Test 3 si vede subito se hanno quote
personalizzate — se il riquadro mostra «Per percentuale» con valori diversi da 50 e 50, l'anomalia
è spiegata senza passare dall'SQL. La query resta come controprova.

**Da rifare dopo OP-039**: i passi 1, 2 e 4 del copione — quote non uguali con il conguaglio che
cambia in modo verificabile, e una spesa anticipata da Manu per la compensazione. Gli altri passi
non vanno ripetuti.

---

### 3.1 · La fotografia iniziale

1. Apri `/famiglia` **senza toccare niente**, sul periodo corrente.
2. Guarda il riquadro del conguaglio e segnati i valori.

**Deve dire zero, o quasi.** Le spese anteriori al 16/09 sono tutte a fondo comune per scelta
(OP-028), e il fondo comune non entra nel conguaglio.

**Se compaiono debiti su spese vecchie**, fermati: `get_settlement` sta ricadendo su «chi ha
inserito la spesa» invece che su «chi ha anticipato». È esattamente il bug corretto il 17/09, e
vorrebbe dire che la correzione non è arrivata al database.

### 3.2 · Una spesa anticipata da te, in parti uguali

1. `/spese/nuova`, importo **100**, categoria qualsiasi.
2. Nel riquadro **«Chi ha pagato»** scegli **te stesso** (non il fondo comune). È questo che
   trasforma la spesa in un anticipo: lasciando il fondo comune, l'editor delle quote non compare
   neppure.
3. Nel riquadro **«Come si divide»** che appare sotto, lascia **«Parti uguali»**.
4. Salva.
5. Torna in `/famiglia`.

**Deve risultare che gli altri ti devono la loro quota.** In due, 50 € a testa: hai anticipato
100 e ne dovevi 50.

> Nota: «Parti uguali» **non scrive niente** su `expense_splits` — è la convenzione «zero righe =
> parti uguali» decisa il 17/09. Il conguaglio deve tornare lo stesso: se qui è già sbagliato, il
> problema è nel calcolo, non nelle quote.

### 3.3 · Quote non uguali

1. In `/spese`, trova quella spesa e apri la **matita** (Modifica movimento).
2. Nel riquadro delle quote scegli **«Per percentuale»**.
3. Scrivi **70** a te e **30** all'altra persona.
4. Salva e torna in `/famiglia`.

**Il conguaglio deve cambiare di conseguenza**: avendo anticipato 100 e dovendone 70, gli altri
ti devono 30 invece di 50.

**Se resta 50/50**, le righe di `expense_splits` non vengono scritte o non vengono lette.

> Questo passo è anche **la prova del trigger**: `expense_splits_sum` è un *constraint trigger*
> che scatta a ogni insert sulla tabella. Se il blocco 07 avesse tolto davvero il privilegio, qui
> vedresti *permission denied for function* invece del salvataggio. **Se il salvataggio va a
> buon fine, la domanda aperta del 19/09 è chiusa**: i trigger scattano ancora.

### 3.4 · Quote che non sommano — **l'app deve rifiutare**

1. Apri una spesa anticipata e scegli **«Per percentuale»**.
2. Scrivi **70** a te e **20** all'altra persona (fanno 90, non 100).
3. Premi **Salva**.

**Deve comparire l'errore** «Le percentuali fanno 90%: devono fare 100 per poter salvare» sotto
al riquadro, e un avviso «Le quote non fanno 100%». **Il salvataggio non parte.**

4. Correggi in **70** e **30** e salva: ora passa.

> **Com'era prima del 19/09.** Questo passo non era eseguibile: `ripartisci`
> (`SplitEditor.tsx`) normalizzava sempre, quindi 70 e 20 diventavano 77,78 € e 22,22 € e la
> somma tornava per costruzione. L'app avvisava «devono fare 100» e **salvava lo stesso**, con
> numeri che nessuno aveva scritto. Era RIL-011 → OP-037, corretto bloccando il salvataggio.
>
> Il *rifiuto lato database* (`check_splits_sum`) resta non provabile dall'interfaccia, perché
> ora l'interfaccia non è più in grado di produrre quote incoerenti. Non è una lacuna: il trigger
> è comunque esercitato da ogni salvataggio del passo 3.3.

### 3.5 · Fondo comune

1. Inserisci un'altra spesa lasciando **«Chi ha pagato» sul fondo comune**.
2. Torna in `/famiglia`.

**Non deve entrare nel conguaglio di nessuno.**

### 3.6 · Chiudere il conguaglio

1. In `/famiglia`, in fondo al riquadro, **«Segna come saldato»**.
2. Conferma («Sì, è saldato»).

**Il conguaglio si azzera** e compare la pastiglia «saldato».

### 3.7 · Il periodo dopo — **il passo che conta**

1. Con la freccia in cima, vai al **periodo successivo**.
2. Guarda il conguaglio.

**Le spese saldate non devono ricomparire nel calcolo.**

**Se tornano**, `settlements` non sta tagliando fuori il periodo chiuso: significa ripagare due
volte gli stessi anticipi, ed è il difetto più costoso dell'intero caso 3.

### 3.8 · Riaprire

1. Torna al periodo di prima e usa **«Riapri il conguaglio»**.

**Le spese di quel periodo tornano nel calcolo.** Un conguaglio chiuso è uno storico: si riapre,
non si modifica.


## 4 · Scontrini

Il bucket è privato e si usano URL firmate a tempo: il caso 4.6 è quello che verifica che sia
vero, e vale da solo quanto gli altri cinque.

### Le operazioni

| # | Cosa fare, esattamente | Cosa deve succedere | Se non succede |
|---|---|---|---|
| 4.1 | `/spese` → una spesa **condivisa** → graffetta → carica un JPG o un PNG sotto i 5 MB | La graffetta compare sulla riga della spesa | — |
| 4.2 | Tocca la graffetta e apri lo scontrino | L'immagine si vede | Un 404 o un errore di accesso: URL firmata non generata, o bucket configurato male |
| 4.3 | Ripeti su una spesa **personale** (scheda con il tuo nome, non il gruppo) | La graffetta compare **anche qui** | È la verifica di OP-023: `get_spese_personali` usa `to_jsonb`, quindi `receipt_path` deve arrivare da sé. Se manca **solo** sulle personali, l'analisi del 19/09 era sbagliata |
| 4.4 | Sostituisci lo scontrino con un'altra immagine | Si vede la nuova, non la vecchia | Il percorso non viene aggiornato, oppure è la cache del browser: ricarica con Ctrl+F5 prima di aprire un punto |
| 4.5 | Togli lo scontrino | La graffetta sparisce dalla riga | — |
| 4.6 | Apri di nuovo uno scontrino, **copia l'URL dell'immagine** (tasto destro → copia indirizzo), aspetta la scadenza della firma e riaprilo in una **finestra anonima** | **Non** si deve vedere | Se si vede, il bucket è pubblico o le URL non sono firmate: ogni scontrino sarebbe leggibile da chiunque abbia il link |

## 5 · Modalità Semplice / Avanzata — OP-024 e OP-025

Nuovi dal 19/09: il default è **Semplice**, e la scelta segue l'account invece del dispositivo.

**Serve**: un secondo dispositivo o un altro browser (va bene una finestra anonima) e, per i
passi 5.5-5.6, un **account appena registrato** — lo stesso che serve al caso 6, quindi conviene
fare i due casi insieme.

### Le operazioni

| # | Cosa fare, esattamente | Cosa deve succedere | Se non succede |
|---|---|---|---|
| 5.1 | Entra con il **tuo** account di sempre | Vedi **Avanzata**, come prima: ci sono «Ritmo di spesa», «A fine periodo», «Andamento del saldo» | La migrazione 06 ha scritto `view_mode = 'advanced'` su chi c'era già: se ti ritrovi in Semplice, quel travaso non ha funzionato e stai perdendo blocchi che usavi |
| 5.2 | `/altro` → interruttore **Semplice** | I blocchi di dettaglio spariscono — fra cui «Andamento del saldo» in Oggi, che dal 19/09 è solo in Avanzata. La **navigazione non cambia**: stesse voci, stesse posizioni, stessi nomi | Se cambia anche **dove** stanno le cose, la modalità sta violando la sua unica regola |
| 5.3 | Ricarica la pagina (F5) | Resta Semplice, **senza lampeggiare**: non deve comparire per un istante la versione Avanzata | Un lampeggio significa che il default nello script inline di `layout.tsx` e `MODE_DEFAULT` in `ModeContext` non coincidono |
| 5.4 | Apri l'app da **un altro dispositivo** (o altro browser) con lo **stesso** account | È in **Semplice**: la scelta ha seguito l'account, non il dispositivo | Se è in Avanzata, `view_mode` non viene letto al login — è il cuore di OP-024 |
| 5.5 | Registra un account **nuovo** (quello del caso 6 va benissimo) | Parte in **Semplice** | Se parte in Avanzata, `MODE_DEFAULT` non è stato cambiato o il bootstrap di `layout.tsx` non è allineato |
| 5.6 | Con l'account nuovo passa ad **Avanzata**, poi riapri da un altro browser | Resta Avanzata | La preferenza non viene scritta su `users_group.view_mode` |

**Cosa si sta verificando.** Due cose distinte che sono state chiuse insieme: che la modalità
**segua l'account** (OP-024) e che il default per chi arriva da ora sia **Semplice** (OP-025),
senza che questo tolga blocchi a chi già usava l'app — ed è il motivo per cui il 5.1 è il primo
passo e non una formalità.

**Non bloccante.** A differenza del caso 6, un errore qui non ha implicazioni di riservatezza:
si vede subito e si corregge. Se manca il secondo dispositivo, il caso si rimanda senza
conseguenze.

## 6 · Due utenti di gruppi diversi — **il caso che non si può saltare**

### Che cosa si sta verificando, e perché a mano

Ogni tabella dell'app ha delle **policy RLS**: regole scritte sul database che dicono quali righe
un utente può vedere. Sono l'unica cosa che impedisce a chi ha un account di leggere i dati di
tutti gli altri — non il codice dell'app, che si limita a chiedere «dammi le buste» e riceve
quelle che il database gli concede.

La convenzione di questo progetto è **«un utente, un gruppo»**: `current_group_id()` restituisce
il gruppo di chi sta interrogando, e le policy confrontano quel valore con il `group_id` della
riga. Se una policy ha la condizione sbagliata — o non ce l'ha affatto — **l'app funziona
benissimo lo stesso**. Nessun errore, nessun rallentamento: semplicemente a un certo punto
qualcuno vede i dati di qualcun altro. È per questo che è l'unico caso non rimandabile.

E non è simulabile da un account solo: la cosa che si vuole provare **è** l'isolamento fra due
gruppi. Serve un secondo account che stia in un gruppo diverso.

Il 19/09 le policy sono state lette dal database e trascritte in `RLS-BASELINE.md`, e sulla carta
sono coerenti. Ma «sulla carta» è esattamente ciò che questo caso esiste per non accontentarsi.

### Preparazione

1. **Crea il secondo account.** Vai su `/register` in una **finestra anonima** e registrati con
   un'altra email. Durante la registrazione **crea un gruppo nuovo**: chiamalo per esempio
   *Test B*.

   ⚠️ **Non** accettare un invito del tuo gruppo. Un invito accettato mette il secondo account
   **nel tuo stesso gruppo**, e il test perde ogni senso: vedrebbe i tuoi dati per progetto, non
   per difetto.

   Se l'email di conferma è obbligatoria, serve una casella vera a cui accedi: va bene un alias
   (`tuonome+testb@gmail.com` arriva sulla tua casella).

2. **Tieni due sessioni aperte in parallelo**: il tuo browser normale con l'account A (te), la
   finestra anonima con l'account B. Non fare avanti e indietro con lo stesso browser: usciresti
   e rientreresti ogni volta, e basta una disattenzione per attribuire a B quello che vedeva A.

3. **Con l'account B, inserisci un paio di dati suoi** (una spesa, una busta). Servono al passo
   6.5: due elenchi vuoti non dimostrano niente.

### Le prove

Per ognuna: A fa, B guarda. B **non deve vedere niente** di quello che ha fatto A.

| # | Con l'account A | Con l'account B | Esito atteso |
|---|---|---|---|
| 6.1 | Crea una busta in `/budget` (es. *Prova RLS*, 200 €) | Apri `/budget` | La busta di A **non c'è**. Ci sono solo le buste di B |
| 6.2 | Crea un obiettivo in `/obiettivi` (es. *Prova RLS*, 1.000 €) | Apri `/obiettivi` | L'obiettivo di A **non c'è** |
| 6.3 | Inserisci una spesa con «Chi ha pagato» = te e quote non uguali | Apri `/famiglia` | B vede il conguaglio **del suo gruppo**, che non contiene la spesa di A |
| 6.4 | Apri uno scontrino e **copia l'URL** dell'immagine dalla barra o col tasto destro | Incolla quell'URL nella finestra di B | **Non** si deve vedere l'immagine |
| 6.5 | Apri `/spese` | Apri `/spese` | **Nessuna spesa in comune** fra i due elenchi |
| 6.6 | — | Cambia la modalità da `/altro` (Semplice ↔ Avanzata) | La modalità di **A non cambia**: ricarica la pagina di A per esserne certo |

**Se anche una sola riga fallisce, fermati e non inserire altri dati.** Il problema è in una
policy: continuare a usare l'app significa solo spargere righe dentro un perimetro che non tiene,
e ogni riga aggiunta sarà da ricontrollare dopo la correzione. Apri un punto citando il numero
del caso (es. «OP-021 caso 6.4») e passa a quello.

### Dopo, con calma: l'utente senza gruppo

`current_group_id()` per un utente senza gruppo restituisce `null`. Le policy diventano
`group_id = null`, che in SQL non è vera per **nessuna** riga: un utente così deve vedere
**niente**, non tutto.

Vale la pena provarlo perché è l'errore classico di questa famiglia di policy, e il sintomo è il
peggiore possibile — un account mezzo configurato che vede il database intero. Oggi non ci sono
utenti senza gruppo (controllo A del 19/09: dieci su dieci ne hanno uno), quindi serve crearne
uno apposta, oppure aspettare il prossimo invito lasciato a metà.


## Dopo il collaudo

- [ ] Advisor di nuovo (`get_advisors`, security e performance), confrontati con
      **`RLS-BASELINE.md`**: interessa il *delta*, non il valore assoluto
- [ ] Se tutto passa: OP-021 si chiude, e `progetto.salute` in roadmap può tornare «in linea»
- [ ] Se qualcosa fallisce: aprire un punto per ciascun caso, citando il numero
      (es. «OP-021 caso 3.7»), così il documento resta il riferimento

---

## Non basta: la valutazione modulo per modulo (OP-032)

Questo documento verifica che i moduli **nuovi** facciano quello che devono. È necessario, non
sufficiente: un modulo può passare tutti e sei i casi e continuare a mostrare il numero sbagliato
per la domanda che chi guarda si sta facendo.

OP-032 è il passaggio più ampio, su **tutti** i moduli — anche quelli in uso da mesi — lungo tre
assi:

| Asse | La domanda | Come ci si accorge che non va |
|---|---|---|
| **Funzionalità** | fa quello che serve? | Manca un'azione ovvia, o richiede tre passaggi dove ne basterebbe uno |
| **Correttezza del dato** | i numeri tornano? | Lo stesso importo dice due cifre diverse in due schermate, o non combacia con il database |
| **Chiarezza** | si capisce? | Il numero è giusto ma non è quello che serve a decidere, o serve una spiegazione per leggerlo |

Il terzo asse è quello che nessuna verifica tecnica tocca, ed è il criterio di prodotto di
`DIREZIONE-A`: *una domanda per schermata*. Richiede di guardare le schermate, non i dati — e di
chiedersi, per ognuna, quale domanda sta rispondendo e se è quella giusta.

Conviene farlo **insieme** al collaudo, modulo per modulo: si è già dentro quella schermata, con
quei dati davanti.
