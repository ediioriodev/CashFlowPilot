"use client";

import { Database } from "lucide-react";
import { Card } from "@/components/ui/kit";

/**
 * Un modulo che aspetta la sua migrazione.
 *
 * Le tabelle nuove si applicano a mano (design/DB-APPLICAZIONE.md), a
 * volte da un altro computer. Finché non ci sono, la pagina esiste e
 * dice cosa manca invece di mostrare un errore o una schermata vuota
 * che sembra un guasto.
 */
export default function MigrationNotice({
  titolo,
  cosa,
  file,
}: {
  titolo: string;
  /** a cosa serve il modulo, in una riga */
  cosa: string;
  /** nome del file di migrazione da applicare */
  file: string;
}) {
  return (
    <Card className="p-5 lg:p-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-card bg-warn-soft text-warn">
          <Database className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="text-[15px] font-semibold">{titolo}</h3>
        <p className="max-w-[340px] text-xs leading-relaxed text-muted">{cosa}</p>
        <p className="max-w-[380px] text-xs leading-relaxed text-faint">
          Per attivarlo serve la migrazione{" "}
          <code className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-semibold text-muted">{file}</code>.
          Le istruzioni sono in <code className="text-muted">design/DB-APPLICAZIONE.md</code>.
        </p>
      </div>
    </Card>
  );
}
