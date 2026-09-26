#!/usr/bin/env node
/* =============================================================================
   EMISSIONE DEI DOCUMENTI — una copia autonoma per documento.

   Genera un unico .html con dentro React, il runtime, la configurazione, il logo
   e i dati: si invia per mail o si carica su Teams e si apre con doppio clic,
   senza la cartella intorno e senza connessione.

   Uso (dalla cartella docs/dossier del progetto):
       node build.js                 tutti i documenti presenti
       node build.js manual          solo quel documento
       node build.js roadmap manual  più documenti
       node build.js --dir "D:/…/docs/dossier" test

   UN SOLO FILE PER DOCUMENTO, CON DENTRO LO STORICO.

   Nome del file:  <prefisso><Nome>_<Progetto>.html
       prefisso  da dossier.config.js → output.prefisso (default: nessuno)
       Nome      da output.nomi.<doc>

   Ogni emissione riscrive quel file aggiungendo la fotografia di oggi all'elenco
   delle precedenti: in alto compare un menù a tendina con le emissioni, e alla
   riapertura si vede sempre l'ultima. Le emissioni datate già presenti nella
   cartella (<…>_vAAAAMMGG.nn.html, lo schema di prima) vengono lette e
   incorporate la prima volta: i file restano dove sono, non li tocca nessuno.

   Quante ne tiene: output.storicoMax (default 20, le più vecchie escono).
   output.storico: false torna allo schema di prima, un file datato per emissione.

   Aggiungere un documento: una voce in DOCUMENTI e niente altro.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const DOCUMENTI = {
  roadmap: { vista: "Roadmap.dc.html", dati: "roadmap.data.js", nome: "Roadmap", etichetta: "Roadmap & SAL" },
  manual: { vista: "Manuali.dc.html", dati: "manual.data.js", nome: "Manual", etichetta: "Manuale utente" },
  test: { vista: "Manuali.dc.html", dati: "test.data.js", nome: "TestPlan", etichetta: "Manuale di test" },
  install: { vista: "Manuali.dc.html", dati: "install.data.js", nome: "Install", etichetta: "Manuale di installazione" },
};

const TIPI_IMMAGINE = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};

function errore(msg) {
  console.error("\n  ✖ " + msg + "\n");
  process.exit(1);
}

// --- argomenti ----------------------------------------------------------------
const argv = process.argv.slice(2);
let dir = __dirname;
const chiesti = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dir") { dir = argv[++i] || dir; continue; }
  if (a === "--help" || a === "-h") {
    console.log("\n  node build.js [--dir <cartella>] [" + Object.keys(DOCUMENTI).join("|") + "|all]\n");
    process.exit(0);
  }
  if (a === "all") { chiesti.push(...Object.keys(DOCUMENTI)); continue; }
  if (!DOCUMENTI[a]) {
    errore("documento sconosciuto: " + a + "\n    Previsti: " + Object.keys(DOCUMENTI).join(", ") + ", all.");
  }
  chiesti.push(a);
}
dir = path.resolve(dir);

// Senza argomenti: tutti i documenti che hanno un file dati nella cartella.
const presenti = Object.keys(DOCUMENTI).filter((k) => fs.existsSync(path.join(dir, DOCUMENTI[k].dati)));
const daFare = (chiesti.length ? [...new Set(chiesti)] : presenti);
if (!daFare.length) {
  errore("nessun documento da emettere in " + dir +
    "\n    Manca ogni <doc>.data.js: lancia lo script dalla cartella docs/dossier, o passala con --dir.");
}

// --- configurazione (comune a tutti i documenti) ------------------------------
function caricaModulo(file, obbligatorio) {
  const f = path.join(dir, file);
  if (!fs.existsSync(f)) {
    if (obbligatorio) errore("manca " + file + " in " + dir);
    return false;
  }
  try {
    delete require.cache[require.resolve(f)];
    require(f);
    return true;
  } catch (e) {
    errore(file + " non è valido: " + e.message +
      "\n    Correggi la sintassi (di solito una virgola o una virgoletta) e riprova.");
  }
}

global.window = {};
caricaModulo("dossier.config.js", false);          // assente = tutti i default
const cfg = global.window.dossierConfig || {};
const branding = cfg.branding || {};
const uscita = cfg.output || {};
const nomiDoc = uscita.nomi || {};

// --- logo: dal percorso al data:URI -------------------------------------------
// Un logo configurato come percorso funziona solo dentro la cartella: nel file
// spedito per mail punterebbe a un'immagine che il destinatario non ha.
function logoInline(valore) {
  const v = String(valore || "").trim();
  if (!v) return "";
  if (/^data:/i.test(v)) return v;
  if (/^https?:/i.test(v)) return v;
  const f = path.resolve(dir, v);
  if (!fs.existsSync(f)) {
    console.warn("\n  ! branding.logo punta a " + v + ", che non esiste: i file escono senza logo.");
    return "";
  }
  const tipo = TIPI_IMMAGINE[path.extname(f).toLowerCase()];
  if (!tipo) {
    console.warn("\n  ! formato logo non gestito (" + path.extname(f) + "): i file escono senza logo.");
    return "";
  }
  return "data:" + tipo + ";base64," + fs.readFileSync(f).toString("base64");
}

const logoOriginale = String(branding.logo || "").trim();
const logoDataUri = logoInline(logoOriginale);

function sostituisciLogo(codice, valore) {
  const rx = /(\n[ \t]*logo[ \t]*:[ \t]*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/;
  if (!rx.test(codice)) {
    console.warn("\n  ! non trovo la chiave branding.logo in dossier.config.js:" +
      " il file esce senza logo incorporato.");
    return codice;
  }
  return codice.replace(rx, (tutto, prefisso) => prefisso + JSON.stringify(valore));
}

function nomePulito(s) {
  const pulito = String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim().split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return pulito;
}

const oggi = new Date();
const giorno = String(oggi.getFullYear()) +
  String(oggi.getMonth() + 1).padStart(2, "0") +
  String(oggi.getDate()).padStart(2, "0");

// --- storico delle emissioni ---------------------------------------------------
/* Le fotografie precedenti viaggiano dentro il file, fra due marcatori: alla
   riemissione si rileggono da lì invece di rigenerarle, e la vista le espone
   nel menù a tendina in alto. */
const STORICO_INIZIO = "/* @dossier-storico-inizio */";
const STORICO_FINE = "/* @dossier-storico-fine */";
const storicoAttivo = uscita.storico !== false;
const storicoMax = Number(uscita.storicoMax) > 0 ? Math.floor(Number(uscita.storicoMax)) : 20;

/* Due sequenze non possono restare in chiaro dentro un file unico:
     "</script"  chiuderebbe il tag in anticipo;
     "<x-dc"     compare in un messaggio di support.js, e il runtime che rilegge
                 la pagina come testo la scambia per l'inizio del template,
                 finendo per stampare a video un pezzo del proprio codice.
   Sostituendo la "<" con < il codice eseguito è identico — le stringhe e le
   espressioni regolari valgono lo stesso — ma la sequenza sparisce dal file. */
const proteggi = (js) => js
  .replace(/<\/script/gi, "<\\/script")
  .replace(/<(\/?)x-dc/g, "\\u003c$1x-dc");
const ripristina = (js) => js
  .replace(/<\\\/script/gi, "</script")
  .replace(/\\u003c(\/?)x-dc/g, "<$1x-dc");

function isoLocale(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Una voce di storico: i dati più il poco che serve a riconoscerli nel menù. */
function voceStorico(dati, doc, id, emessoIl) {
  const p = doc === "roadmap" ? (dati.progetto || {}) : (dati.meta || {});
  return {
    id: id,
    emessoIl: emessoIl,
    versione: p.versioneCorrente || p.versione || "",
    aggiornatoIl: p.aggiornatoIl || "",
    dati: dati,
  };
}

/* Lo storico già incorporato in un file emesso con questo schema. */
function storicoDaHtml(html) {
  const a = html.indexOf(STORICO_INIZIO);
  const b = html.indexOf(STORICO_FINE);
  if (a < 0 || b <= a) return null;
  const corpo = html.slice(a + STORICO_INIZIO.length, b).trim()
    .replace(/^window\.dossierStorico\s*=\s*/, "").replace(/;\s*$/, "");
  try {
    const v = JSON.parse(ripristina(corpo));
    return Array.isArray(v) ? v : null;
  } catch (e) {
    console.warn("\n  ! lo storico dentro il file precedente non è leggibile: riparto da questa emissione.");
    return null;
  }
}

/* I dati di un'emissione fatta con lo schema datato: il blocco che build.js ha
   inlinato viene rieseguito in un contesto finto, che è l'unico modo di riavere
   l'oggetto senza chiedere all'utente i file dati di allora. */
function datiDaHtml(html, D, doc) {
  const rx = new RegExp("/\\* ---- " + D.dati.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " ---- \\*/([\\s\\S]*?)<\\/script>");
  const m = html.match(rx);
  if (!m) return null;
  const finestra = {};
  try {
    new Function("window", ripristina(m[1]))(finestra);
  } catch (e) {
    return null;
  }
  return doc === "roadmap" ? finestra.roadmap : (finestra.dossierDocs || {})[doc];
}

/* Emissioni già presenti nella cartella, nello schema datato o in quello nuovo.
   `radice` è il nome del file senza estensione e senza la parte _vAAAAMMGG.nn. */
function storicoEsistente(D, doc, radice) {
  const voci = [];
  const rxDatato = new RegExp("^" + radice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "_v(\\d{4})(\\d{2})(\\d{2})\\.(\\d{2})\\.html$", "i");
  const unico = radice + ".html";

  const fileUnico = path.join(dir, unico);
  if (fs.existsSync(fileUnico)) {
    const html = fs.readFileSync(fileUnico, "utf8");
    const s = storicoDaHtml(html);
    if (s) voci.push(...s);
    else {
      const d = datiDaHtml(html, D, doc);
      if (d) voci.push(voceStorico(d, doc, "file-precedente", isoLocale(fs.statSync(fileUnico).mtime)));
    }
  }

  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(rxDatato);
    if (!m) continue;
    const id = "v" + m[1] + m[2] + m[3] + "." + m[4];
    if (voci.some((v) => v.id === id)) continue;   // già incorporata in passato
    const p = path.join(dir, f);
    const d = datiDaHtml(fs.readFileSync(p, "utf8"), D, doc);
    if (!d) {
      console.warn("\n  ! " + f + ": non riesco a rileggerne i dati, resta fuori dallo storico.");
      continue;
    }
    const mt = fs.statSync(p).mtime;
    const stessoGiorno = isoLocale(mt).slice(0, 10) === m[1] + "-" + m[2] + "-" + m[3];
    voci.push(voceStorico(d, doc, id,
      stessoGiorno ? isoLocale(mt) : m[1] + "-" + m[2] + "-" + m[3] + "T00:" + m[4]));
  }

  voci.sort((a, b) => String(a.emessoIl).localeCompare(String(b.emessoIl)));
  return voci;
}

// --- emissione di un documento ------------------------------------------------
function emetti(doc) {
  const D = DOCUMENTI[doc];
  const vista = path.join(dir, D.vista);
  if (!fs.existsSync(vista)) errore("non trovo \"" + D.vista + "\" in " + dir);
  if (!fs.existsSync(path.join(dir, D.dati))) {
    errore("manca " + D.dati + ": il documento \"" + doc + "\" non è ancora stato creato.");
  }

  // Dati del documento: servono il nome del progetto e la data di aggiornamento.
  global.window = { dossierConfig: cfg };
  caricaModulo(D.dati, true);
  let progetto = "", aggiornatoIl = "", titoloDoc = D.etichetta, riservato = false, datiCorrenti = null;
  if (doc === "roadmap") {
    const d = global.window.roadmap;
    if (!d || !d.progetto) {
      errore(D.dati + " non definisce window.roadmap: se usa \"export const roadmap\" è la versione vecchia.");
    }
    datiCorrenti = d;
    progetto = d.progetto.nome || "";
    aggiornatoIl = d.progetto.aggiornatoIl || "";
  } else {
    const reg = global.window.dossierDocs || {};
    const d = reg[doc];
    if (!d) errore(D.dati + " non registra window.dossierDocs." + doc + ".");
    datiCorrenti = d;
    const m = d.meta || {};
    progetto = m.progetto || "";
    aggiornatoIl = m.aggiornatoIl || "";
    titoloDoc = d.titolo || D.etichetta;
    riservato = !!m.riservato;
  }

  // --- nome del file e storico delle emissioni ---------------------------------
  const radice = nomePulito(uscita.prefisso || "") +
    nomePulito(nomiDoc[doc] || D.nome) + "_" +
    (nomePulito(uscita.nomeProgetto || progetto) || "Progetto");

  let storico = [];
  let nuove = 0;
  if (storicoAttivo) {
    storico = storicoEsistente(D, doc, radice);
    const ultima = storico[storico.length - 1];
    const uguale = ultima && JSON.stringify(ultima.dati) === JSON.stringify(datiCorrenti);
    if (uguale) {
      /* Stessi dati dell'ultima fotografia: una voce in più direbbe solo che
         build.js è stato lanciato due volte. */
      console.log("\n  · " + doc + ": dati identici all'ultima emissione, lo storico non cresce.");
    } else {
      const delGiorno = storico.filter((v) => String(v.emessoIl).slice(0, 10) === isoLocale(oggi).slice(0, 10)).length;
      storico.push(voceStorico(datiCorrenti, doc,
        "v" + giorno + "." + String(delGiorno + 1).padStart(2, "0"), isoLocale(oggi)));
      nuove = 1;
    }
    if (storico.length > storicoMax) storico = storico.slice(storico.length - storicoMax);
  }

  // --- inline degli script locali ---------------------------------------------
  // Le sequenze "</script" nel codice chiuderebbero il tag in anticipo: vanno protette.
  // Dei file dati si inlina solo quello del documento emesso: gli altri tag spariscono.
  let html = fs.readFileSync(vista, "utf8");
  const altriDati = Object.keys(DOCUMENTI).map((k) => DOCUMENTI[k].dati).filter((f) => f !== D.dati);
  const inlinati = [];
  html = html.replace(/<script src="\.\/([^"]+)"><\/script>\n?/g, (tutto, rel) => {
    if (altriDati.indexOf(rel) >= 0) return "";
    const f = path.join(dir, rel.split("/").join(path.sep));
    if (!fs.existsSync(f)) errore("manca il file " + rel + ": la cartella è incompleta.");
    inlinati.push(rel);
    let codice = fs.readFileSync(f, "utf8");
    if (rel === "dossier.config.js" && logoDataUri !== logoOriginale) {
      codice = sostituisciLogo(codice, logoDataUri);
    }
    if (rel === D.dati && storicoAttivo) {
      /* Al posto del file dati: tutte le fotografie, e l'ultima come dati del
         documento. Le altre stanno lì per il menù a tendina della vista. */
      codice =
        STORICO_INIZIO + "\nwindow.dossierStorico = " + JSON.stringify(storico) + ";\n" + STORICO_FINE +
        "\nvar _ultima = window.dossierStorico[window.dossierStorico.length - 1].dati;\n" +
        (doc === "roadmap"
          ? "window.roadmap = _ultima;\n"
          : "window.dossierDocs = window.dossierDocs || {};\nwindow.dossierDocs." + doc + " = _ultima;\n");
    }
    if (rel === D.dati && D.vista === "Manuali.dc.html") {
      // Un solo documento nel file emesso: niente schede verso documenti assenti.
      codice = 'window.dossierSolo = ' + JSON.stringify(doc) + ';\n' + codice;
    }
    codice = proteggi(codice);
    return "<script>\n/* ---- " + rel + " ---- */\n" + codice + "\n</script>\n";
  });

  // Controllo per nome: chi aggiunge uno script alla vista non aggiorna un contatore,
  // ma non può perderne uno per strada.
  const attesi = [
    "vendor/react.production.min.js",
    "vendor/react-dom.production.min.js",
    "dossier.config.js",
    D.dati,
    "support.js",
  ];
  const mancanti = attesi.filter((f) => inlinati.indexOf(f) < 0);
  if (mancanti.length) {
    errore("non ho inlinato " + mancanti.join(", ") +
      " (trovati: " + (inlinati.join(", ") || "nessuno") + ")." +
      "\n    La vista è stata modificata: controlla i <script src> nell'<head>.");
  }

  // --- titolo e intestazione ---------------------------------------------------
  const titolo = (progetto || titoloDoc) + " — " + titoloDoc;
  const head = html.slice(0, html.search(/<\/head>/i));   // "<title>" compare anche nel JS inlinato
  if (!/<title>/i.test(head)) {
    html = html.replace(/<meta charset="utf-8">/i,
      '<meta charset="utf-8">\n<title>' + titolo.replace(/[<>]/g, "") + "</title>");
  }
  html = html.replace(/^<!DOCTYPE html>/i,
    "<!DOCTYPE html>\n<!-- " + titoloDoc + ": copia autonoma generata il " +
    new Date().toISOString().slice(0, 10) + " da " + inlinati.length +
    " file. Dati aggiornati al " + (aggiornatoIl || "—") +
    ". Non modificare a mano: rigenerare con build.js. -->");

  // --- nome del file -----------------------------------------------------------
  let nome;
  if (storicoAttivo) {
    /* Sempre lo stesso file: chi l'ha aperto una volta lo ritrova aggiornato,
       con dentro anche le emissioni di prima. */
    nome = radice + ".html";
  } else {
    const conData = radice + "_v" + giorno;
    const rxProgressivo = new RegExp(
      "^" + conData.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.(\\d{2})\\.html$", "i");
    let ultimo = 0;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(rxProgressivo);
      if (m) ultimo = Math.max(ultimo, parseInt(m[1], 10));
    }
    if (ultimo >= 99) errore("hai già 99 revisioni di oggi per " + doc + ": fai pulizia prima di generarne un'altra.");
    nome = conData + "." + String(ultimo + 1).padStart(2, "0") + ".html";
  }

  const out = path.join(dir, nome);
  fs.writeFileSync(out, html, "utf8");

  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log("\n  ✔ " + nome + "  (" + kb + " KB, " + inlinati.length + " file inlinati)");
  if (storicoAttivo) {
    console.log("    " + storico.length + " emission" + (storico.length === 1 ? "e" : "i") +
      " nel menù in alto" + (nuove ? ", l'ultima è questa" : "") +
      (storico.length === storicoMax ? " (tetto di output.storicoMax)" : "") + ".");
  }
  console.log("    " + out);
  return { doc, nome, out, riservato, versioni: storico.length };
}

// --- esecuzione ---------------------------------------------------------------
const fatti = daFare.map(emetti);

console.log("\n    Ogni file si apre con doppio clic, anche offline.");
if (storicoAttivo) {
  console.log("    Un file per documento: la prossima emissione riscrive questo, senza perdere le precedenti.");
}

if (fatti.some((f) => f.doc === "roadmap")) {
  const sezioni = ((cfg.vista || {}).roadmap || {}).sezioni || {};
  const spente = Object.keys(sezioni).filter((k) => sezioni[k] === false);
  console.log(spente.length
    ? "    Roadmap: sezioni attive tutte tranne " + spente.join(", ") + " (vedi dossier.config.js)."
    : "    Roadmap: tutte e sei le sezioni, comprese quelle interne.");
}

const riservati = fatti.filter((f) => f.riservato).map((f) => f.doc);
if (riservati.length) {
  console.log("    Documenti interni, da non mandare fuori: " + riservati.join(", ") + ".");
}

console.log(logoDataUri
  ? "    Logo incorporato nei file."
  : "    Nessun logo: branding.logo è vuoto in dossier.config.js.");
console.log("");
