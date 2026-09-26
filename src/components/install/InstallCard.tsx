"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";

import { Button, Card } from "@/components/ui/kit";
import { useInstall } from "@/context/InstallContext";

/**
 * Voce fissa "Installa l'app" per Altro e Impostazioni. Sparisce da sola
 * quando l'app è già installata o il browser non può installarla.
 */
export default function InstallCard({ className }: { className?: string }) {
  const { canInstall, canOneTap, install } = useInstall();
  const [busy, setBusy] = useState(false);

  if (!canInstall) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      await install();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`flex items-center gap-3 p-4 ${className ?? ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
        <Smartphone className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Installa l&apos;app</p>
        <p className="mt-0.5 text-xs leading-relaxed text-faint">
          {canOneTap
            ? "Un tocco e la trovi nella schermata Home, a tutto schermo."
            : "Ti mostriamo dove toccare: ci vogliono pochi secondi."}
        </p>
      </div>
      <Button size="sm" variant="primary" loading={busy} onClick={onClick} className="shrink-0">
        {canOneTap ? "Installa" : "Come fare"}
      </Button>
    </Card>
  );
}
