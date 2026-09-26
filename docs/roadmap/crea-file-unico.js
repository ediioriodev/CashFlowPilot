#!/usr/bin/env node
/* =============================================================================
   COPIA CONDIVISIBILE IN UN SOLO FILE

   Genera una copia autonoma della roadmap interattiva: un unico .html con dentro
   React, il runtime, la configurazione, il logo e i dati. Si invia per mail o
   Teams e si apre con doppio clic, senza la cartella intorno e senza connessione.

   Uso (dalla cartella docs/roadmap del progetto):
       node crea-file-unico.js
   oppure indicando la cartella:
       node crea-file-unico.js "D:/percorso/docs/roadmap"

   È una fotografia: dopo ogni aggiornamento dei dati va rigenerata.

   Nome del file:  <prefisso>_NomeProgetto_vAAAAMMGG.nn.html
       prefisso  da roadmap.config.js → output.prefisso (default "RoadMap")
       AAAAMMGG  data di generazione del documento
       nn        progressivo della giornata, da 01, calcolato sui file già presenti
                 nella cartella: più revisioni nello stesso giorno non si sovrascrivono.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || __dirname);
const vista = path.join(dir, "Roadmap Progetto.dc.html");

function errore(msg) {
  console.error("\n  ✖ " + msg + "\n");
  process.exit(1);
}

if (!fs.existsSync(vista)) {
  errore("non trovo \"Roadmap Progetto.dc.html\" in " + dir +
    "\n    Lancia lo script dalla cartella docs/roadmap, o passala come argomento.");
}

let html = fs.readFileSync(vista, "utf8");

// --- configurazione e dati ----------------------------------------------------
// Servono per il nome del file, il titolo della scheda e il logo da incorporare.
global.window = {};

function carica(nome, obbligatorio) {
  const f = path.join(dir, nome);
  if (!fs.existsSync(f)) {
    if (obbligatorio) errore("manca " + nome + " in " + dir);
    return;
  }
  try {
    require(f);
  } catch (e) {
    errore(nome + " non è valido: " + e.message +
      "\n    Correggi la sintassi (di solito una virgola o una virgoletta) e riprova.");
  }
}

// La configurazione è facoltativa: senza, valgono i default (nessun logo).
carica("roadmap.config.js", false);
carica("roadmap.data.js", true);

const d = global.window.roadmap;
if (!d || !d.progetto) errore("roadmap.data.js non definisce window.roadmap: è la versione vecchia (export const roadmap).");
const pr = d.progetto;

const cfg = global.window.roadmapConfig || {};
const branding = cfg.branding || {};
const uscita = cfg.output || {};

// --- logo: dal percorso al data:URI -------------------------------------------
// Un logo configurato come percorso relativo funziona solo dentro la cartella:
// nel file spedito per mail punterebbe a un'immagine che il destinatario non ha.
// Qui viene incorporato, senza toccare il file di configurazione sorgente.
const TIPI_IMMAGINE = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};

function logoInline(valore) {
  const v = String(valore || "").trim();
  if (!v) return "";
  if (/^data:/i.test(v)) return v;                 // già incorporato
  if (/^https?:/i.test(v)) return v;               // remoto: resta tale, servirà la rete
  const f = path.resolve(dir, v);
  if (!fs.existsSync(f)) {
    console.warn("\n  ! branding.logo punta a " + v + ", che non esiste: il file esce senza logo.");
    return "";
  }
  const tipo = TIPI_IMMAGINE[path.extname(f).toLowerCase()];
  if (!tipo) {
    console.warn("\n  ! formato logo non gestito (" + path.extname(f) + "): il file esce senza logo.");
    return "";
  }
  return "data:" + tipo + ";base64," + fs.readFileSync(f).toString("base64");
}

const logoOriginale = String(branding.logo || "").trim();
const logoDataUri = logoInline(logoOriginale);

// Riscrive la sola riga "logo: …" nella copia inlinata della configurazione.
function sostituisciLogo(codice, valore) {
  const rx = /(\n[ \t]*logo[ \t]*:[ \t]*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/;
  if (!rx.test(codice)) {
    console.warn("\n  ! non trovo la chiave branding.logo in roadmap.config.js:" +
      " il file esce senza logo incorporato.");
    return codice;
  }
  return codice.replace(rx, (tutto, prefisso) => prefisso + JSON.stringify(valore));
}

// --- inline di ogni script locale ---------------------------------------------
// I contenuti vanno protetti: una sequenza "</script" dentro il codice chiuderebbe
// il tag in anticipo e romperebbe la pagina.
const inlinati = [];
html = html.replace(/<script src="\.\/([^"]+)"><\/script>/g, (tutto, rel) => {
  const f = path.join(dir, rel.split("/").join(path.sep));
  if (!fs.existsSync(f)) errore("manca il file " + rel + ": la cartella è incompleta.");
  inlinati.push(rel);
  let codice = fs.readFileSync(f, "utf8");
  if (rel === "roadmap.config.js" && logoDataUri !== logoOriginale) {
    codice = sostituisciLogo(codice, logoDataUri);
  }
  codice = codice.replace(/<\/script/gi, "<\\/script");
  return "<script>\n/* ---- " + rel + " ---- */\n" + codice + "\n</script>";
});

// Controllo per nome, non per numero: chi aggiunge uno script alla vista non deve
// aggiornare un contatore, ma non può perdere per strada uno di questi cinque.
const ATTESI = [
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "roadmap.config.js",
  "roadmap.data.js",
  "support.js",
];
const mancanti = ATTESI.filter((f) => inlinati.indexOf(f) < 0);
if (mancanti.length) {
  errore("non ho inlinato " + mancanti.join(", ") +
    " (trovati: " + (inlinati.join(", ") || "nessuno") + ")." +
    "\n    La vista è stata modificata: controlla i <script src> nell'<head>.");
}

// --- titolo della scheda e intestazione del file -------------------------------
const titolo = (pr.nome || "Roadmap") + " — Roadmap" + (pr.cliente ? " · " + pr.cliente : "");
// Il controllo va fatto solo sull'<head>: la stringa "<title>" compare anche nel
// codice JS inlinato (la funzione di export) e falserebbe il test.
const head = html.slice(0, html.search(/<\/head>/i));
if (!/<title>/i.test(head)) {
  html = html.replace(/<meta charset="utf-8">/i,
    '<meta charset="utf-8">\n<title>' + titolo.replace(/[<>]/g, "") + "</title>");
}
html = html.replace(/^<!DOCTYPE html>/i,
  "<!DOCTYPE html>\n<!-- Copia autonoma generata il " + new Date().toISOString().slice(0, 10) +
  " da " + inlinati.length + " file. Dati aggiornati al " + (pr.aggiornatoIl || "—") +
  ". Non modificare a mano: rigenerare con crea-file-unico.js. -->");

// --- nome del file: <prefisso>_NomeProgetto_vAAAAMMGG.nn.html -------------------
// AAAAMMGG = data di generazione (non quella dei dati); nn = progressivo della
// giornata, da 01 in su, per distinguere più revisioni emesse lo stesso giorno.
function nomeProgetto(s) {
  const pulito = String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    // via gli accenti
    .replace(/[^A-Za-z0-9]+/g, " ")                      // via punteggiatura e simboli
    .trim().split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return pulito || "Progetto";
}

const oggi = new Date();
const giorno = String(oggi.getFullYear()) +
  String(oggi.getMonth() + 1).padStart(2, "0") +
  String(oggi.getDate()).padStart(2, "0");

// Prefisso e nome del progetto sono configurabili (output.prefisso,
// output.nomeProgetto): serve a chi ha una convenzione di nomi propria.
const radice = nomeProgetto(uscita.prefisso || "RoadMap") + "_" +
  nomeProgetto(uscita.nomeProgetto || pr.nome) + "_v" + giorno;

const rxProgressivo = new RegExp(
  "^" + radice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.(\\d{2})\\.html$", "i");
let ultimo = 0;
for (const f of fs.readdirSync(dir)) {
  const m = f.match(rxProgressivo);
  if (m) ultimo = Math.max(ultimo, parseInt(m[1], 10));
}
if (ultimo >= 99) errore("hai già 99 revisioni di oggi in questa cartella: fai pulizia prima di generarne un'altra.");

const nome = radice + "." + String(ultimo + 1).padStart(2, "0") + ".html";
const out = path.join(dir, nome);
fs.writeFileSync(out, html, "utf8");

const kb = Math.round(fs.statSync(out).size / 1024);
console.log("\n  ✔ " + nome + "  (" + kb + " KB, " + inlinati.length + " file inlinati)");
console.log("    " + out);
console.log("\n    Un solo file: si apre con doppio clic ovunque, anche offline.");

const sezioni = (cfg.vista || {}).sezioni || {};
const spente = Object.keys(sezioni).filter((k) => sezioni[k] === false);
console.log(spente.length
  ? "    Sezioni attive: tutte tranne " + spente.join(", ") + " (vedi roadmap.config.js)."
  : "    Contiene tutte e sei le sezioni, comprese quelle interne.");
console.log(logoDataUri
  ? "    Logo incorporato nel file."
  : "    Nessun logo: branding.logo è vuoto in roadmap.config.js.");
console.log("");
