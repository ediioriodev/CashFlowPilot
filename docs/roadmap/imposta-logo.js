#!/usr/bin/env node
/* =============================================================================
   LOGO DELLA ROADMAP

   Scrive `branding.logo` dentro roadmap.config.js. Di default incorpora
   l'immagine come data:URI, perché è l'unica forma che sopravvive ovunque:
   nella cartella, nel file unico condivisibile e negli export fatti dal browser
   (che non possono leggere i file locali).

   Uso (dalla cartella docs/roadmap del progetto):
       node imposta-logo.js assets/mio-logo.png     incorpora l'immagine
       node imposta-logo.js --preset sc-italia      usa un logo già presente in assets/
       node imposta-logo.js --elenco                mostra i preset disponibili
       node imposta-logo.js --vuoto                 toglie il logo (default del template)
       node imposta-logo.js --percorso assets/x.png tiene il percorso, non incorpora

   Opzioni comuni:
       --dir <cartella>   lavora su un'altra cartella roadmap
       --alt "<testo>"    imposta anche branding.logoAlt
       --altezza <px>     imposta anche branding.logoAltezza

   Formati: png, jpg, jpeg, gif, webp, svg.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const TIPI = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};
const LIMITE_KB = 512; // oltre, il file unico e gli export diventano pesanti

const USO = [
  "",
  "  Logo della roadmap — scrive branding.logo in roadmap.config.js",
  "",
  "    node imposta-logo.js assets/mio-logo.png      incorpora l'immagine (consigliato)",
  "    node imposta-logo.js --preset sc-italia       usa un logo già presente in assets/",
  "    node imposta-logo.js --elenco                 mostra i preset disponibili",
  "    node imposta-logo.js --vuoto                  toglie il logo",
  "    node imposta-logo.js --percorso assets/x.png  tiene il percorso, non incorpora",
  "",
  "    --dir <cartella>   lavora su un'altra cartella roadmap",
  "    --alt \"<testo>\"    imposta anche branding.logoAlt",
  "    --altezza <px>     imposta anche branding.logoAltezza",
  "",
  "  Formati: png, jpg, jpeg, gif, webp, svg.",
  "",
].join("\n");

function errore(msg) {
  console.error("\n  ✖ " + msg + "\n");
  process.exit(1);
}

// --- argomenti ----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { dir: null, alt: null, altezza: null, modo: null, valore: null };

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dir") opt.dir = argv[++i];
  else if (a === "--alt") opt.alt = argv[++i];
  else if (a === "--altezza") opt.altezza = argv[++i];
  else if (a === "--vuoto") opt.modo = "vuoto";
  else if (a === "--elenco") opt.modo = "elenco";
  else if (a === "--preset") { opt.modo = "preset"; opt.valore = argv[++i]; }
  else if (a === "--percorso") { opt.modo = "percorso"; opt.valore = argv[++i]; }
  else if (a === "--aiuto" || a === "-h" || a === "--help") opt.modo = "aiuto";
  else if (a.startsWith("--")) errore("opzione sconosciuta: " + a + "   (node imposta-logo.js --aiuto)");
  else if (!opt.valore) { opt.modo = opt.modo || "incorpora"; opt.valore = a; }
  else errore("troppi argomenti: " + a);
}

const dir = path.resolve(opt.dir || __dirname);
const configFile = path.join(dir, "roadmap.config.js");

if (opt.modo === "aiuto" || !opt.modo) {
  console.log(USO);
  process.exit(opt.modo === "aiuto" ? 0 : 1);
}

// --- preset disponibili: qualunque assets/logo-*.<immagine> --------------------
function preset() {
  const cartella = path.join(dir, "assets");
  if (!fs.existsSync(cartella)) return [];
  return fs.readdirSync(cartella)
    .filter((f) => /^logo-.+/.test(f) && TIPI[path.extname(f).toLowerCase()])
    .map((f) => ({ nome: f.replace(/^logo-/, "").replace(/\.[^.]+$/, ""), rel: "assets/" + f }));
}

if (opt.modo === "elenco") {
  const p = preset();
  if (!p.length) {
    console.log("\n  Nessun preset in " + path.join(dir, "assets") +
      "\n  Aggiungine uno chiamandolo assets/logo-<nome>.png\n");
  } else {
    console.log("\n  Preset disponibili:");
    p.forEach((x) => console.log("    --preset " + x.nome + "   (" + x.rel + ")"));
    console.log("");
  }
  process.exit(0);
}

if (!fs.existsSync(configFile)) {
  errore("manca roadmap.config.js in " + dir +
    "\n    Lancia lo script dalla cartella docs/roadmap, o passala con --dir.");
}

// --- valore da scrivere --------------------------------------------------------
function dataUri(rel) {
  const f = path.resolve(dir, rel);
  if (!fs.existsSync(f)) errore("non trovo l'immagine " + rel + " (cercata in " + f + ")");
  const tipo = TIPI[path.extname(f).toLowerCase()];
  if (!tipo) {
    errore("formato non gestito: " + path.extname(f) +
      "\n    Usa png, jpg, gif, webp o svg.");
  }
  const kb = Math.round(fs.statSync(f).size / 1024);
  if (kb > LIMITE_KB) {
    console.warn("\n  ! il logo pesa " + kb + " KB: finirà dentro ogni file emesso." +
      "\n    Un logo di intestazione sta bene sotto i 50 KB — valuta di ridurlo.");
  }
  return "data:" + tipo + ";base64," + fs.readFileSync(f).toString("base64");
}

let valore, descrizione;
if (opt.modo === "vuoto") {
  valore = "";
  descrizione = "nessun logo";
} else if (opt.modo === "percorso") {
  if (!opt.valore) errore("--percorso vuole il percorso dell'immagine.");
  const f = path.resolve(dir, opt.valore);
  if (!fs.existsSync(f)) errore("non trovo l'immagine " + opt.valore);
  valore = opt.valore.split(path.sep).join("/");
  descrizione = "percorso " + valore;
  console.warn("\n  ! percorso relativo: il logo si vede nella cartella e nel file unico," +
    "\n    ma sparisce dagli export HTML fatti dal browser. Senza --percorso viene incorporato.");
} else if (opt.modo === "preset") {
  const p = preset().find((x) => x.nome === opt.valore);
  if (!p) {
    errore("preset \"" + opt.valore + "\" non trovato." +
      "\n    Disponibili: " + (preset().map((x) => x.nome).join(", ") || "nessuno") +
      "   (node imposta-logo.js --elenco)");
  }
  valore = dataUri(p.rel);
  descrizione = "preset " + p.nome + " incorporato da " + p.rel;
} else if (/^data:/i.test(opt.valore) || /^https?:/i.test(opt.valore)) {
  valore = opt.valore;
  descrizione = /^data:/i.test(opt.valore) ? "data:URI fornito" : "URL remoto (richiede connessione)";
} else {
  valore = dataUri(opt.valore);
  descrizione = "incorporato da " + opt.valore;
}

// --- scrittura nel file di configurazione ---------------------------------------
// Si tocca solo la riga interessata: commenti, ordine e resto della config restano.
let codice = fs.readFileSync(configFile, "utf8");

function scrivi(chiave, nuovoValore, etichetta) {
  const rx = new RegExp("(\\n[ \\t]*" + chiave + "[ \\t]*:[ \\t]*)(\"(?:[^\"\\\\]|\\\\.)*\"" +
    "|'(?:[^'\\\\]|\\\\.)*'|[0-9]+(?:\\.[0-9]+)?|true|false)");
  if (!rx.test(codice)) {
    errore("non trovo la chiave " + chiave + " in roadmap.config.js." +
      "\n    Il file è stato riscritto: reimposta " + etichetta + " a mano.");
  }
  codice = codice.replace(rx, (t, prefisso) => prefisso + nuovoValore);
}

scrivi("logo", JSON.stringify(valore), "il logo");
if (opt.alt !== null) scrivi("logoAlt", JSON.stringify(opt.alt), "il testo alternativo");
if (opt.altezza !== null) {
  const n = Number(opt.altezza);
  if (!(n > 0)) errore("--altezza vuole un numero di pixel maggiore di zero.");
  scrivi("logoAltezza", String(n), "l'altezza");
}

// Rilettura di controllo: meglio accorgersene qui che davanti a una pagina bianca.
fs.writeFileSync(configFile, codice, "utf8");
global.window = {};
try {
  delete require.cache[require.resolve(configFile)];
  require(configFile);
} catch (e) {
  errore("roadmap.config.js non è più valido dopo la modifica: " + e.message);
}
const scritto = ((global.window.roadmapConfig || {}).branding || {}).logo;
if (scritto !== valore) errore("la scrittura non ha avuto effetto: controlla roadmap.config.js a mano.");

const kb = Math.round(Buffer.byteLength(valore, "utf8") / 1024);
console.log("\n  ✔ branding.logo aggiornato: " + descrizione + (kb ? "  (" + kb + " KB)" : ""));
console.log("    " + configFile);
console.log("\n    Rigenera il file da consegnare:  node crea-file-unico.js\n");
