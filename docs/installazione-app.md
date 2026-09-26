# Installazione dell'app con un tocco

Cash Flow Pilot è una PWA. Questa funzione aggiunge un pulsante **"Installa l'app"** che avvia l'installazione dall'interno dell'app, senza passare dai menu del browser, là dove il browser lo consente. Negli altri casi apre una guida visiva con i passi esatti.

## Cosa succede su ogni piattaforma

| Piattaforma / browser | Cosa fa il pulsante | Tocchi per l'utente |
|---|---|---|
| Android: Chrome, Edge, Samsung Internet, Opera | apre il **dialogo nativo "Installa"** | 2 (Installa → Installa) |
| Desktop: Chrome, Edge | apre il dialogo nativo "Installa" | 2 |
| iPhone / iPad: Safari, Chrome, Edge, Firefox | apre la **guida**: Condividi → Aggiungi alla schermata Home → Aggiungi | 3, seguendo la guida |
| Android: Firefox, o Chrome quando il dialogo non è disponibile | apre la guida: menu ⋮ → Installa app | 3, seguendo la guida |
| Browser interno di un'altra app (Instagram, WhatsApp, Telegram, Facebook…) | apre la guida "Apri nel browser" con il pulsante **Copia link** | — |
| App già installata e aperta dalla Home | nessuna proposta di installazione | — |
| Desktop Safari / Firefox | nessuna proposta di installazione | — |

**Perché su iOS non basta un tocco.** Apple non offre ai siti web alcuna API per avviare l'installazione. L'unico modo è il menu Condividi di Safari, o degli altri browser da iOS 16.4 in poi. È un limite della piattaforma, non dell'app: su iOS si arriva al tocco singolo solo pubblicando sull'App Store, e per ora quella strada è esclusa.

## Dove compare

1. **Altro**: card "Installa l'app" subito sotto il profilo. È sempre presente finché l'app non è installata.
2. **Impostazioni**: la stessa card, prima di "Aspetto". Su iOS l'avviso delle notifiche ("funzionano solo con l'app installata") contiene il link **Guarda come installarla**, che apre la guida.
3. **Oggi**: banner in cima, solo sotto i 1024 px.
   - La **X** lo nasconde per **14 giorni**.
   - Dopo **3 chiusure** non ricompare più; resta la card in Altro.
   - Il rinvio è una preferenza del singolo dispositivo: si salva in `localStorage` (`install_banner_snooze_until`, `install_banner_dismissals`).
4. **Login**: pulsante "Installa l'app sul telefono" sotto il riquadro di accesso, solo sotto i 1024 px. Lo vede anche chi non ha ancora effettuato l'accesso.

Tutte le superfici spariscono da sole quando l'app risulta installata. Al termine di un'installazione dal dialogo nativo compare il messaggio "App installata: la trovi nella schermata Home".

## Come funziona

### Installabilità (`public/manifest.json`)
Chrome mostra il dialogo solo se il manifest è completo. Rispetto a prima sono stati aggiunti:
- `id`, `scope`, `description`, `lang`, `categories`;
- le icone **maskable** `icon-maskable-192x192.png` e `icon-maskable-512x512.png`, generate dall'icona originale su uno sfondo a pieno quadrato: Android ritaglia l'icona a cerchio o a squircle senza lasciare bordi bianchi;
- `theme_color` e `background_color` portati a `#F5F4F1` (lo sfondo del tema chiaro), così lo splash iniziale non lampeggia in bianco.

Il service worker è quello di next-pwa, già presente (`next.config.mjs`). In sviluppo è **disattivato**, quindi il dialogo nativo si prova solo con una build di produzione.

### Cattura dell'evento (`src/app/layout.tsx`)
Chromium lancia `beforeinstallprompt` **una sola volta** per caricamento, spesso prima che React abbia idratato la pagina. Per non perderlo, lo script inline `bootstrap`:
- lo intercetta con `preventDefault()`, per non mostrare la mini-barra automatica del browser;
- lo salva in `window.__cfpInstallEvt`;
- segnala l'arrivo con l'evento `cfp:installable`.

Allo stesso modo `appinstalled` imposta `window.__cfpInstalled` e lancia `cfp:installed`.

### Stato (`src/context/InstallContext.tsx`)
`InstallProvider` avvolge l'app in `layout.tsx` e sta sopra `AppShell`, quindi funziona anche nelle pagine di autenticazione. `useInstall()` espone:

| Campo | Significato |
|---|---|
| `platform` | `installed` · `prompt` · `ios` · `android-manual` · `in-app-browser` · `unsupported` (`null` prima dell'idratazione) |
| `canInstall` | c'è qualcosa da proporre: un pulsante o una guida |
| `canOneTap` | il dialogo nativo è disponibile |
| `install()` | apre il dialogo nativo se possibile, altrimenti la guida. Restituisce `accepted` · `dismissed` · `guide` |
| `openGuide()` | apre direttamente la guida |
| `bannerVisible` / `dismissBanner()` | stato e rinvio del banner in Oggi |

Come viene rilevata la piattaforma:
- **installata**: `display-mode: standalone` o `fullscreen`, oppure `navigator.standalone` su iOS;
- **iPad**: si riconosce come Mac con touch;
- **browser interni ad altre app**: si riconoscono dallo user agent (`FBAN`, `Instagram`, `WhatsApp`, `; wv)`…).

L'evento si può usare una volta sola. Dopo `prompt()` viene scartato: se l'utente rifiuta, Chrome ne lancerà uno nuovo più avanti e il pulsante tornerà al tocco singolo.

### Componenti (`src/components/install/`)
- `InstallGuideModal.tsx`: guida a passi numerati, basata su `Modal` del kit. È montata una sola volta, dentro il provider. Su iOS indica dove si trova il tasto Condividi in base al dispositivo e al browser: barra in basso su iPhone Safari, in alto su iPad, nella barra dell'indirizzo su Chrome/Edge per iOS.
- `InstallCard.tsx`: la card di Altro e Impostazioni.
- `InstallBanner.tsx`: il banner di Oggi.

## Come si verifica

1. `npm run build && npm run start`. In Chrome desktop: DevTools → Application → Manifest non segnala errori di installabilità e mostra le icone maskable. In console, `!!window.__cfpInstallEvt` vale `true`.
2. **Android reale** (serve HTTPS: dominio di produzione o tunnel). Toccando "Installa" in Altro si apre il dialogo nativo. Dopo l'installazione compare il messaggio e card e banner spariscono. Va provato anche dal login e dal banner di Oggi.
3. **iPhone con Safari**: il pulsante apre la guida e i passi corrispondono a ciò che si vede. Aperta dalla Home, l'app non mostra più nessuna proposta di installazione.
4. **Banner**: chiuderlo e ricaricare, non deve tornare. Poi mettere nel passato `install_banner_snooze_until` da DevTools e verificare che ricompaia.
5. **Link aperto da WhatsApp o Instagram**: compare la guida "Apri nel browser" e "Copia link" copia l'indirizzo.

## Limiti noti
- Su Android, se l'app è già installata ma la si apre nel browser, Chrome non lancia l'evento e il pulsante mostra la guida. La nota in fondo alla guida avvisa che l'app potrebbe essere già nella Home.
- Il rilevamento dei browser interni si basa sullo user agent: un browser nuovo o sconosciuto ricade nella guida Android o iOS, che resta comunque valida.
- La pubblicazione su Play Store (TWA) e App Store resta fuori da questa funzione. È un'eventuale fase futura, da valutare separatamente.
