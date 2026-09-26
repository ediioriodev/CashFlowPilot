"use client";

import React, { useId } from "react";

/* ============================================================
   VOCABOLARIO GRAFICO — poche forme, sempre le stesse.

   Tre regole, decise il 19/09/2026 e scritte in DIREZIONE-A:
     1. NIENTE FORME CIRCOLARI. Né anelli, né ciambelle, né torte:
        un arco non si confronta a occhio, una lunghezza sì.
     2. EVENTI A BARRE, SALDO A LINEA. Una spesa esiste solo quando
        accade; un saldo esiste in ogni istante.
     3. OGNI GRAFICO DICHIARA LA SUA SCALA. Un asse senza valori
        mostra la forma e nasconde la quantità.

   Convenzione unica in tutta l'app:
     pieno        = reale (già successo)
     tratteggiato = previsto (deve ancora succedere)
   Tutti i colori passano dai token: mai hex nei componenti.
   ============================================================ */

export type Tone = "accent" | "pos" | "neg" | "warn" | "muted";

const STROKE: Record<Tone, string> = {
  accent: "var(--accent)",
  pos: "var(--pos)",
  neg: "var(--neg)",
  warn: "var(--warn)",
  muted: "var(--line-strong)",
};
const SOFT: Record<Tone, string> = {
  accent: "var(--accent-soft)",
  pos: "var(--pos-soft)",
  neg: "var(--neg-soft)",
  warn: "var(--warn-soft)",
  muted: "var(--surface-3)",
};

export const toneStroke = (t: Tone) => STROKE[t];

/** Importo in forma corta per gli assi: 1.240 → «1,2k». */
export function compatto(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) {
    const k = v / 1000;
    return `${(Math.abs(k) >= 10 ? Math.round(k) : Math.round(k * 10) / 10).toString().replace(".", ",")}k`;
  }
  return Math.round(v).toString();
}
export const toneSoft = (t: Tone) => SOFT[t];

/* ------------------------------------------------------------
   1. SPLIT BAR — come si divide un totale, in orizzontale.
   Sostituisce il vecchio Gauge ad anello: il numero non sta più
   DENTRO una figura che non cresce con lui, quindi non ci finisce
   sopra a nessuna larghezza di finestra.
   ------------------------------------------------------------ */
export interface SplitSegment {
  value: number;
  tone: Tone;
  /** disegna il segmento tratteggiato: è una previsione, non un fatto */
  planned?: boolean;
  label: string;
}

export function SplitBar({
  segments,
  ariaLabel,
  children,
  height = 18,
  className = "",
}: {
  segments: SplitSegment[];
  ariaLabel: string;
  /** il numero grande: sta SOPRA la barra, non dentro */
  children?: React.ReactNode;
  height?: number;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const total = segments.reduce((s, p) => s + Math.max(0, p.value), 0);

  return (
    <div className={`flex w-full flex-col items-center gap-4 ${className}`}>
      {children}
      <div
        className="flex w-full overflow-hidden rounded-pill bg-surface-3"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
      >
        {total > 0 &&
          segments.map((seg, i) => {
            const quota = Math.max(0, seg.value) / total;
            if (quota <= 0) return null;
            return (
              <span
                key={`${seg.label}-${i}`}
                title={seg.label}
                className="block h-full first:rounded-l-pill last:rounded-r-pill"
                style={{
                  width: `${(quota * 100).toFixed(2)}%`,
                  background: seg.planned
                    ? `repeating-linear-gradient(45deg, ${STROKE[seg.tone]} 0 3px, ${SOFT[seg.tone]} 3px 7px)`
                    : STROKE[seg.tone],
                  boxShadow: i ? "inset 1px 0 0 var(--surface)" : undefined,
                }}
              />
            );
          })}
      </div>
      <span className="sr-only" id={`split-${uid}`}>
        {segments.map((sg) => `${sg.label}: ${sg.value}`).join(", ")}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------
   2. MINI BAR — una percentuale sola, in poco spazio.
   Sostituisce il vecchio Ring: stessa informazione, letta per
   lunghezza invece che per arco.
   ------------------------------------------------------------ */
export function MiniBar({
  percent,
  tone = "accent",
  width = 52,
  thickness = 8,
  children,
  ariaLabel,
  className = "",
}: {
  percent: number;
  tone?: Tone;
  /** larghezza della barra in px; il numero sta sopra */
  width?: number;
  thickness?: number;
  children?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <span
      className={`inline-flex shrink-0 flex-col items-center gap-1.5 ${className}`}
      style={{ width }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {children !== undefined && (
        <span className="tnum text-xs font-bold leading-none">{children}</span>
      )}
      <span
        className="block w-full overflow-hidden rounded-pill bg-surface-3"
        style={{ height: thickness }}
        aria-hidden
      >
        <span
          className="block h-full rounded-pill"
          style={{ width: `${p.toFixed(1)}%`, background: STROKE[tone] }}
        />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------
   3. BARS — il ritmo. Pieno = reale, tratteggiato = previsto.
   ------------------------------------------------------------ */
export interface BarItem {
  label: string;
  value: number;
  planned?: boolean;
  /** periodo in corso: pieno ma attenuato */
  partial?: boolean;
}

export function Bars({
  items,
  height = 150,
  tone = "accent",
  ariaLabel,
  formatValue = (v: number) => Math.round(v).toString(),
  className = "",
}: {
  items: BarItem[];
  height?: number;
  tone?: Tone;
  ariaLabel: string;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const w = 560;
  const top = 22;
  const base = height - 26;
  const n = Math.max(1, items.length);
  const gap = n > 8 ? 6 : 14;
  const bw = (w - gap * (n - 1)) / n;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={`w-full ${className}`}>
      {/* Tetto all'altezza: in una colonna larga (Semplice a colonna unica) il
          viewBox ingrandiva tutto in proporzione, etichette a 22px comprese. */}
      <svg
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="mx-auto block h-auto w-full"
        style={{ maxHeight: Math.round(height * 1.3) }}
      >
        <defs>
          <pattern id={`bars-${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" style={{ fill: "var(--surface-3)" }} />
            <rect width="3" height="7" style={{ fill: STROKE[tone], opacity: 0.42 }} />
          </pattern>
        </defs>
        <line x1="0" x2={w} y1={base} y2={base} strokeWidth="1" style={{ stroke: "var(--line)" }} />
        {items.map((it, i) => {
          const x = i * (bw + gap);
          const bh = it.value > 0 ? Math.max(4, (it.value / max) * (base - top)) : 0;
          const y = base - bh;
          const fill = it.planned
            ? `url(#bars-${uid})`
            : STROKE[tone];
          return (
            <g key={`${it.label}-${i}`}>
              {bh > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={bh}
                  rx={Math.min(6, bw / 3)}
                  style={{ fill, opacity: it.partial ? 0.72 : 1 }}
                />
              )}
              {it.value > 0 && n <= 8 && (
                <text
                  x={x + bw / 2}
                  y={y - 7}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  style={{ fill: "var(--muted)" }}
                >
                  {formatValue(it.value)}
                </text>
              )}
              <text
                x={x + bw / 2}
                y={height - 7}
                textAnchor="middle"
                fontSize="13"
                style={{ fill: "var(--faint)" }}
              >
                {it.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------
   4. AREA TREND — linea piena fino a oggi, tratteggiata dopo
   ------------------------------------------------------------ */
export function AreaTrend({
  values,
  cutIndex,
  startLabel,
  endLabel,
  todayLabel = "oggi",
  height = 170,
  tone = "accent",
  ariaLabel,
  className = "",
}: {
  values: number[];
  /** ultimo indice "reale"; da lì in poi la linea è tratteggiata */
  cutIndex: number;
  startLabel?: string;
  endLabel?: string;
  todayLabel?: string;
  height?: number;
  tone?: Tone;
  ariaLabel: string;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  /* padL tiene il posto alle etichette dell'asse Y: prima le linee di
     griglia c'erano ma nessuna diceva quanto valeva, e la curva mostrava
     la forma nascondendo la quantità. */
  const w = 560, pad = 10, padL = 52, padB = 22;
  if (values.length < 2) return null;

  /* Scala a numeri tondi (1, 2, 2,5, 5 × 10ⁿ): con i margini in percentuale
     le tacche uscivano come 38, −67, −173… — la quantità c'era, ma non si
     leggeva a colpo d'occhio. */
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const grezzo = (hi - lo || Math.abs(hi) || 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(grezzo));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= grezzo) ?? 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.max(Math.ceil(hi / step) * step, min + step);
  const rng = max - min;
  const tacche = Array.from({ length: Math.round(rng / step) + 1 }, (_, i) => max - i * step || 0); // niente «-0»

  const X = (i: number) => padL + (i * (w - padL - pad)) / (values.length - 1);
  const Y = (v: number) => pad + (height - pad - padB) * (1 - (v - min) / rng);
  const pts = values.map((v, i) => [X(i), Y(v)] as const);
  const path = (a: readonly (readonly [number, number])[]) =>
    a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const cut = Math.max(0, Math.min(cutIndex, values.length - 1));
  const solid = pts.slice(0, cut + 1);
  const dash = pts.slice(cut);
  const area =
    `${path(solid)} L${solid[solid.length - 1][0].toFixed(1)} ${height - padB} L${solid[0][0].toFixed(1)} ${height - padB} Z`;
  const [cxp, cyp] = pts[cut];
  const stroke = STROKE[tone];

  return (
    <div className={`w-full ${className}`}>
      <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
        <defs>
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: stroke, stopOpacity: 0.26 }} />
            <stop offset="100%" style={{ stopColor: stroke, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {tacche.map((valore) => {
          const y = Y(valore);
          return (
            <g key={valore}>
              <line x1={padL} x2={w - pad} y1={y} y2={y} strokeWidth="1" style={{ stroke: "var(--line)" }} />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                style={{ fill: "var(--faint)" }}
              >
                {compatto(valore)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#grad-${uid})`} />
        <path d={path(solid)} fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ stroke }} />
        {dash.length > 1 && (
          <path d={path(dash)} fill="none" strokeWidth="2.6" strokeDasharray="5 6" strokeLinecap="round" style={{ stroke, opacity: 0.55 }} />
        )}
        <line x1={cxp} x2={cxp} y1={pad} y2={height - padB} strokeWidth="1" strokeDasharray="3 4" style={{ stroke: "var(--line-strong)" }} />
        <circle cx={cxp} cy={cyp} r="5" strokeWidth="2.6" style={{ fill: "var(--surface)", stroke }} />
        <text x={cxp} y={height - 6} textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: "var(--faint)" }}>
          {todayLabel}
        </text>
        {startLabel && <text x={padL} y={height - 6} fontSize="11" style={{ fill: "var(--faint)" }}>{startLabel}</text>}
        {endLabel && <text x={w - pad} y={height - 6} textAnchor="end" fontSize="11" style={{ fill: "var(--faint)" }}>{endLabel}</text>}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------
   5. STACK BAR — la composizione di un totale in una riga
   ------------------------------------------------------------ */
export function StackBar({
  items,
  height = 16,
  ariaLabel,
  className = "",
}: {
  items: { label: string; value: number; color: string }[];
  height?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0) || 1;
  return (
    <div
      className={`flex w-full overflow-hidden rounded-pill bg-surface-3 ${className}`}
      style={{ height }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {items.map((i, idx) => (
        <span
          key={`${i.label}-${idx}`}
          title={i.label}
          className="block h-full first:rounded-l-pill last:rounded-r-pill"
          style={{
            width: `${((Math.max(0, i.value) / total) * 100).toFixed(2)}%`,
            background: i.color,
            boxShadow: idx ? "inset 1px 0 0 var(--surface)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   BARRA DI AVANZAMENTO con tacca "dove dovresti essere oggi"
   ------------------------------------------------------------ */
export function ProgressTrack({
  percent,
  tone = "accent",
  markAt,
  height = 10,
  ariaLabel,
  className = "",
}: {
  percent: number;
  tone?: Tone;
  /** 0-100: posizione della tacca di riferimento */
  markAt?: number;
  height?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`relative overflow-visible rounded-pill bg-surface-3 ${className}`}
      style={{ height }}
      role={ariaLabel ? "progressbar" : undefined}
      aria-label={ariaLabel}
      aria-valuenow={ariaLabel ? Math.round(percent) : undefined}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
    >
      <div className="h-full overflow-hidden rounded-pill">
        <div className="h-full rounded-pill transition-[width] duration-300" style={{ width: `${p}%`, background: STROKE[tone] }} />
      </div>
      {markAt !== undefined && (
        <span
          aria-hidden
          className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded-sm bg-line-strong"
          style={{ left: `${Math.max(0, Math.min(100, markAt))}%` }}
        />
      )}
    </div>
  );
}
