"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Equal, Percent, User, Users } from "lucide-react";

import { Avatar, Chip, Field, inputClass } from "@/components/ui/kit";
import { formatCurrency } from "@/lib/formatUtils";
import type { Member, Split } from "@/services/familyService";

/* ============================================================
   COME SI DIVIDE UNA SPESA

   Parti uguali è il default e non scrive niente: zero righe in
   expense_splits significa "dividi in parti uguali". È il motivo per
   cui le spese già inserite non vanno migrate e il codice non ha un
   caso speciale per loro.

   Le altre modalità producono quote esplicite che sommano esattamente
   all'importo: il constraint trigger sul database rifiuta il resto.
   ============================================================ */

export type SplitMode = "uguali" | "meta" | "percentuale" | "una";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Distribuisce `importo` secondo i pesi dati, senza perdere centesimi:
 * l'ultimo prende il resto, così la somma torna all'ultimo centesimo.
 */
function ripartisci(importo: number, pesi: { userId: string; peso: number }[]): Split[] {
  const totale = pesi.reduce((s, p) => s + Math.max(0, p.peso), 0);
  if (totale <= 0 || importo <= 0) return [];

  const out: Split[] = [];
  let assegnato = 0;
  pesi.forEach((p, i) => {
    const ultimo = i === pesi.length - 1;
    const quota = ultimo
      ? round2(importo - assegnato)
      : round2((importo * Math.max(0, p.peso)) / totale);
    assegnato = round2(assegnato + quota);
    out.push({ userId: p.userId, quota });
  });
  return out.filter((s) => s.quota > 0);
}

export default function SplitEditor({
  members,
  importo,
  onChange,
  iniziali,
  onValiditaChange,
  className,
}: {
  members: Member[];
  /** importo corrente della spesa: le quote lo seguono */
  importo: number;
  /** elenco vuoto = parti uguali (nessuna riga su expense_splits) */
  onChange: (splits: Split[]) => void;
  /** quote già salvate sulla spesa: si aprono mostrando quelle, non «parti uguali» */
  iniziali?: Split[];
  /** false quando le percentuali non fanno 100: il genitore non deve salvare */
  onValiditaChange?: (valide: boolean) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<SplitMode>("uguali");
  const [scelti, setScelti] = useState<string[]>([]);
  const [percentuali, setPercentuali] = useState<Record<string, string>>({});
  /* Finché non si è letto cosa c'è già salvato non si tocca niente e non si
     avvisa nessuno: prima questo componente ripartiva sempre da «Parti uguali»
     e il solo aprirlo cancellava le quote della spesa. */
  const [pronto, setPronto] = useState(false);
  const firmaIniziale = JSON.stringify(iniziali ?? null);

  useEffect(() => {
    if (pronto) return;
    if (iniziali === undefined) return; // ancora in lettura
    if (iniziali.length > 0 && importo > 0) {
      setMode("percentuale");
      setPercentuali(
        Object.fromEntries(
          iniziali.map((q) => [
            q.userId,
            String(round2((q.quota / importo) * 100)).replace(".", ","),
          ])
        )
      );
    }
    setPronto(true);
    // firmaIniziale entra fra le dipendenze per rifare l'idratazione se la
    // spesa cambia mentre la modale è aperta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaIniziale, importo, pronto]);

  const splits = useMemo(() => {
    if (importo <= 0 || members.length === 0) return [];

    switch (mode) {
      case "uguali":
        return [];

      case "meta": {
        const due = scelti.slice(0, 2);
        if (due.length < 2) return [];
        return ripartisci(importo, due.map((userId) => ({ userId, peso: 1 })));
      }

      case "una": {
        const uno = scelti[0];
        if (!uno) return [];
        return [{ userId: uno, quota: round2(importo) }];
      }

      case "percentuale": {
        const pesi = members.map((m) => ({
          userId: m.userId,
          peso: Number((percentuali[m.userId] ?? "").replace(",", ".")) || 0,
        }));
        return ripartisci(importo, pesi);
      }
    }
  }, [mode, scelti, percentuali, importo, members]);

  /* Si avvisa il form solo quando il risultato cambia davvero: senza
     questo confronto ogni render rimanderebbe lo stesso elenco. */
  const ultimo = useRef<string | null>(null);
  useEffect(() => {
    if (!pronto) return;
    const firma = JSON.stringify(splits);
    /* Primo giro dopo l'idratazione: si registra il valore di partenza e
       basta. Avvisare qui significherebbe dire al genitore che l'utente ha
       toccato le quote quando ha solo aperto la finestra. */
    if (ultimo.current === null) {
      ultimo.current = firma;
      return;
    }
    if (firma === ultimo.current) return;
    ultimo.current = firma;
    onChange(splits);
  }, [splits, onChange, pronto]);

  const sommaPercentuali = useMemo(
    () =>
      members.reduce(
        (s, m) => s + (Number((percentuali[m.userId] ?? "").replace(",", ".")) || 0),
        0
      ),
    [percentuali, members]
  );

  /* In percentuale l'anteprima in euro è quella DIGITATA, non quella
     normalizzata: con 70 e 20 deve leggersi 70 € e 20 €, non 77,78 e 22,22,
     altrimenti la schermata mostra una terza cifra che nessuno salverà. */
  const quotaDi = (userId: string) =>
    mode === "percentuale"
      ? round2((importo * (Number((percentuali[userId] ?? "").replace(",", ".")) || 0)) / 100)
      : splits.find((s) => s.userId === userId)?.quota ?? 0;

  /* Si entra in «Per percentuale» partendo dalle parti uguali, non da
     campi vuoti con l'errore «fanno 0%» già acceso. */
  const apriPercentuale = () => {
    setMode("percentuale");
    setPercentuali((p) => {
      if (members.some((m) => (p[m.userId] ?? "").trim() !== "")) return p;
      const base = Math.floor(10000 / members.length) / 100;
      return Object.fromEntries(
        members.map((m, i) => [
          m.userId,
          String(i === members.length - 1 ? round2(100 - base * (members.length - 1)) : base).replace(".", ","),
        ])
      );
    });
  };

  /* Le percentuali che non fanno 100 non si salvano: prima l'avviso diceva
     «devono fare 100» ma ripartisci() normalizzava comunque, e finiva a
     database una terza cifra, né quella scritta né un rifiuto. */
  const erroreQuote =
    mode === "percentuale" && importo > 0 && Math.abs(sommaPercentuali - 100) > 0.5
      ? `Le percentuali fanno ${Math.round(sommaPercentuali)}%: devono fare 100 per poter salvare.`
      : null;

  useEffect(() => {
    onValiditaChange?.(erroreQuote === null);
  }, [erroreQuote, onValiditaChange]);

  if (members.length < 2) return null;

  const aiuto =
    mode === "uguali"
      ? `Ogni membro ne prende ${formatCurrency(importo / members.length)}.`
      : mode === "meta"
        ? "Scegli le due persone fra cui dividerla."
        : mode === "una"
          ? "La spesa è tutta di una persona sola."
          : `Le percentuali fanno ${Math.round(sommaPercentuali)}%.`;

  return (
    <Field label="Come si divide" className={className} help={aiuto} error={erroreQuote}>
      <div className="no-bar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <Chip active={mode === "uguali"} icon={Users} onClick={() => setMode("uguali")}>
          Parti uguali
        </Chip>
        {/* In due «A metà» è identico a «Parti uguali»: un doppione che fa
            solo chiedere quale sia la differenza. */}
        {members.length > 2 && (
          <Chip active={mode === "meta"} icon={Equal} onClick={() => { setMode("meta"); setScelti((s) => s.slice(0, 2)); }}>
            A metà
          </Chip>
        )}
        <Chip active={mode === "percentuale"} icon={Percent} onClick={apriPercentuale}>
          Per percentuale
        </Chip>
        <Chip active={mode === "una"} icon={User} onClick={() => { setMode("una"); setScelti((s) => s.slice(0, 1)); }}>
          Tutta a uno
        </Chip>
      </div>

      {mode === "uguali" && (
        <ul className="flex flex-col gap-1.5">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2.5 text-sm">
              <Avatar id={m.userId} name={m.name} size={24} />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <span className="tnum font-semibold text-muted">
                {formatCurrency(importo / members.length)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(mode === "meta" || mode === "una") && (
        <div className="flex flex-col gap-2">
          <div className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {members.map((m) => {
              const on = scelti.includes(m.userId);
              const max = mode === "meta" ? 2 : 1;
              return (
                <Chip
                  key={m.userId}
                  active={on}
                  onClick={() =>
                    setScelti((prev) =>
                      on
                        ? prev.filter((u) => u !== m.userId)
                        : [...prev, m.userId].slice(-max)
                    )
                  }
                >
                  <Avatar id={m.userId} name={m.name} size={20} />
                  {m.name}
                </Chip>
              );
            })}
          </div>
          {splits.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {splits.map((s) => {
                const m = members.find((x) => x.userId === s.userId);
                return (
                  <li key={s.userId} className="flex items-center gap-2.5 text-sm">
                    <Avatar id={s.userId} name={m?.name ?? "Membro"} size={24} />
                    <span className="min-w-0 flex-1 truncate">{m?.name ?? "Membro"}</span>
                    <span className="tnum font-semibold text-muted">{formatCurrency(s.quota)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {mode === "percentuale" && (
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2.5">
              <Avatar id={m.userId} name={m.name} size={26} />
              <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
              <span className="tnum w-20 shrink-0 text-right text-xs text-faint">
                {formatCurrency(quotaDi(m.userId))}
              </span>
              <div className="relative w-24 shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Percentuale di ${m.name}`}
                  value={percentuali[m.userId] ?? ""}
                  onChange={(e) =>
                    setPercentuali((p) => ({ ...p, [m.userId]: e.target.value }))
                  }
                  placeholder="0"
                  className={`${inputClass} tnum min-h-10 pr-7 text-right`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint" aria-hidden>
                  %
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
