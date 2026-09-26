#!/usr/bin/env node
/* =============================================================================
   LOGO DEL DOSSIER

   Scrive `branding.logo` dentro dossier.config.js. Di default incorpora
   l'immagine come data:URI, perché è l'unica forma che sopravvive ovunque:
   nella cartella, nei file unici emessi e negli export fatti dal browser
   (che non possono leggere i file locali).

   Uso (dalla cartella docs/dossier del progetto):
       node set-logo.js assets/mio-logo.png    incorpora l'immagine
       node set-logo.js --preset sc-italia     usa un logo presente in assets/
       node set-logo.js --list                 mostra i preset disponibili
       node set-logo.js --none                 toglie il logo (default del template)
       node set-logo.js --path assets/x.png    tiene il percorso, non incorpora

   Opzioni comuni:
       --dir <cartella>   lavora su un'altra cartella dossier
       --alt "<testo>"    imposta anche branding.logoAlt
       --height <px>      imposta anche branding.logoAltezza

   Formati: png, jpg, jpeg, gif, webp, svg.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const TIPI = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};
const LIMITE_KB = 512; // oltre, i file emessi diventano pesanti

const USO = [
  "",
  "  Logo dei documenti — scrive branding.logo in dossier.config.js",
  "",
  "    node set-logo.js assets/mio-logo.png    incorpora l'immagine (consigliato)",
  "    node set-logo.js --preset sc-italia     usa un logo presente in assets/",
  "    node set-logo.js --list                 mostra i preset disponibili",
  "    node set-logo.js --none                 toglie il logo",
  "    node set-logo.js --path assets/x.png    tiene il percorso, non incorpora",
  "",
  "    --dir <cartella>   lavora su un'altra cartella dossier",
  "    --alt \"<testo>\"    imposta anche branding.logoAlt",
  "    --height <px>      imposta anche branding.logoAltezza",
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
const opt = { dir: null, alt: null, height: null, modo: null, valore: null };

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dir") opt.dir = argv[++i];
  else if (a === "--alt") opt.alt = argv[++i];
  else if (a === "--height") opt.height = argv[++i];
  else if (a === "--none") opt.modo = "none";
  else if (a === "--list") opt.modo = "list";
  else if (a === "--preset") { opt.modo = "preset"; opt.valore = argv[++i]; }
  else if (a === "--path") { opt.modo = "path"; opt.valore = argv[++i]; }
  else if (a === "--help" || a === "-h") opt.modo = "help";
  else if (a.startsWith("--")) errore("opzione sconosciuta: " + a + "   (node set-logo.js --help)");
  else if (!opt.valore) { opt.modo = opt.modo || "incorpora"; opt.valore = a; }
  else errore("troppi argomenti: " + a);
}

const dir = path.resolve(opt.dir || __dirname);
const configFile = path.join(dir, "dossier.config.js");

if (opt.modo === "help" || !opt.modo) {
  console.log(USO);
  process.exit(opt.modo === "help" ? 0 : 1);
}

// --- preset disponibili: qualunque assets/logo-*.<immagine> --------------------
function preset() {
  const cartella = path.join(dir, "assets");
  if (!fs.existsSync(cartella)) return [];
  return fs.readdirSync(cartella)
    .filter((f) => /^logo-.+/.test(f) && TIPI[path.extname(f).toLowerCase()])
    .map((f) => ({ nome: f.replace(/^logo-/, "").replace(/\.[^.]+$/, ""), rel: "assets/" + f }));
}

if (opt.modo === "list") {
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
  errore("manca dossier.config.js in " + dir +
    "\n    Lancia lo script dalla cartella docs/dossier, o passala con --dir.");
}

// --- valore da scrivere --------------------------------------------------------
function dataUri(rel) {
  const f = path.resolve(dir, rel);
  if (!fs.existsSync(f)) errore("non trovo l'immagine " + rel + " (cercata in " + f + ")");
  const tipo = TIPI[path.extname(f).toLowerCase()];
  if (!tipo) {
    errore("formato non gestito: " + path.extname(f) + "\n    Usa png, jpg, gif, webp o svg.");
  }
  const kb = Math.round(fs.statSync(f).size / 1024);
  if (kb > LIMITE_KB) {
    console.warn("\n  ! il logo pesa " + kb + " KB: finirà dentro ogni file emesso." +
      "\n    Un logo di intestazione sta bene sotto i 50 KB — valuta di ridurlo.");
  }
  return "data:" + tipo + ";base64," + fs.readFileSync(f).toString("base64");
}

let valore, descrizione;
if (opt.modo === "none") {
  valore = "";
  descrizione = "nessun logo";
} else if (opt.modo === "path") {
  if (!opt.valore) errore("--path vuole il percorso dell'immagine.");
  const f = path.resolve(dir, opt.valore);
  if (!fs.existsSync(f)) errore("non trovo l'immagine " + opt.valore);
  valore = opt.valore.split(path.sep).join("/");
  descrizione = "percorso " + valore;
  console.warn("\n  ! percorso relativo: il logo si vede nella cartella e nei file emessi," +
    "\n    ma sparisce dagli export HTML fatti dal browser. Senza --path viene incorporato.");
} else if (opt.modo === "preset") {
  const p = preset().find((x) => x.nome === opt.valore);
  if (!p) {
    errore("preset \"" + opt.valore + "\" non trovato." +
      "\n    Disponibili: " + (preset().map((x) => x.nome).join(", ") || "nessuno") +
      "   (node set-logo.js --list)");
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
    errore("non trovo la chiave " + chiave + " in dossier.config.js." +
      "\n    Il file è stato riscritto: reimposta " + etichetta + " a mano.");
  }
  codice = codice.replace(rx, (t, prefisso) => prefisso + nuovoValore);
}

scrivi("logo", JSON.stringify(valore), "il logo");
if (opt.alt !== null) scrivi("logoAlt", JSON.stringify(opt.alt), "il testo alternativo");
if (opt.height !== null) {
  const n = Number(opt.height);
  if (!(n > 0)) errore("--height vuole un numero di pixel maggiore di zero.");
  scrivi("logoAltezza", String(n), "l'altezza");
}

// Rilettura di controllo: meglio accorgersene qui che davanti a una pagina bianca.
fs.writeFileSync(configFile, codice, "utf8");
global.window = {};
try {
  delete require.cache[require.resolve(configFile)];
  require(configFile);
} catch (e) {
  errore("dossier.config.js non è più valido dopo la modifica: " + e.message);
}
const scritto = ((global.window.dossierConfig || {}).branding || {}).logo;
if (scritto !== valore) errore("la scrittura non ha avuto effetto: controlla dossier.config.js a mano.");

const kb = Math.round(Buffer.byteLength(valore, "utf8") / 1024);
console.log("\n  ✔ branding.logo aggiornato: " + descrizione + (kb ? "  (" + kb + " KB)" : ""));
console.log("    " + configFile);
console.log("\n    Rigenera i file da consegnare:  node build.js\n");
