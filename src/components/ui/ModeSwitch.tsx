"use client";

import { SegTabs } from "@/components/ui/kit";
import { useMode, type ViewMode } from "@/context/ModeContext";

/**
 * Semplice o Avanzata.
 * Non è un comando di debug né una preferenza nascosta: è una funzione
 * dell'app, e sta dove l'utente la trova senza cercarla.
 */
export default function ModeSwitch({ className }: { className?: string }) {
  const { mode, setMode } = useMode();

  return (
    <SegTabs<ViewMode>
      ariaLabel="Quanto vedere"
      value={mode}
      onChange={setMode}
      options={[
        { value: "simple", label: "Semplice" },
        { value: "advanced", label: "Avanzata" },
      ]}
      className={className}
    />
  );
}
