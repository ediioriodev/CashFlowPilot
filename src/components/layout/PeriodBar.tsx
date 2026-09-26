"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check, RotateCcw, X } from "lucide-react";
import { usePeriod } from "@/context/PeriodContext";
import { IconButton, Button } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

/**
 * L'unico selettore di periodo dell'app.
 * Prima esistevano tre implementazioni diverse (home, storico, analisi)
 * e i totali non tornavano tra le pagine.
 */
export default function PeriodBar({ className }: { className?: string }) {
  const { range, label, progressLabel, isCurrentPeriod, shift, reset, setRange } = usePeriod();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(range);

  const openEditor = () => {
    setDraft(range);
    setEditing(true);
  };

  const dirty = draft.start !== range.start || draft.end !== range.end;
  const valid = draft.start <= draft.end;

  return (
    <div className={cn("flex items-center gap-1 rounded-md border border-line bg-surface p-1", className)}>
      <IconButton label="Periodo precedente" icon={ChevronLeft} onClick={() => shift("prev")} className="h-10 w-10" />

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            type="date"
            aria-label="Data di inizio"
            value={draft.start}
            onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            className="min-h-10 w-full min-w-0 rounded-sm border border-line bg-transparent px-2 text-xs font-medium"
          />
          <span className="shrink-0 text-xs text-faint" aria-hidden>–</span>
          <input
            type="date"
            aria-label="Data di fine"
            value={draft.end}
            onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            className="min-h-10 w-full min-w-0 rounded-sm border border-line bg-transparent px-2 text-xs font-medium"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-sm px-2 text-center text-sm font-semibold transition-colors hover:bg-surface-3"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          <span className="truncate">{label}</span>
          {isCurrentPeriod && <span className="hidden text-xs font-medium text-faint sm:inline">· {progressLabel}</span>}
        </button>
      )}

      <IconButton label="Periodo successivo" icon={ChevronRight} onClick={() => shift("next")} className="h-10 w-10" />

      {editing ? (
        <>
          <IconButton label="Annulla modifica periodo" icon={X} onClick={() => setEditing(false)} className="h-10 w-10" />
          <Button
            size="sm"
            variant="primary"
            icon={Check}
            disabled={!dirty || !valid}
            onClick={() => {
              setRange(draft);
              setEditing(false);
            }}
            className="h-10 px-3"
          >
            <span className="sr-only sm:not-sr-only">Applica</span>
          </Button>
        </>
      ) : (
        !isCurrentPeriod && (
          <IconButton label="Torna al periodo corrente" icon={RotateCcw} onClick={reset} className="h-10 w-10" />
        )
      )}
    </div>
  );
}
