"use client";

import { Smartphone, X } from "lucide-react";

import { Button, IconButton } from "@/components/ui/kit";
import { useInstall } from "@/context/InstallContext";

/**
 * Invito in cima a Oggi, solo sotto i 1024px. Chiuso, torna dopo 14
 * giorni; dopo tre chiusure non torna più (resta la voce in Altro).
 */
export default function InstallBanner() {
  const { bannerVisible, canOneTap, install, dismissBanner } = useInstall();
  if (!bannerVisible) return null;

  return (
    <div className="anim-up flex items-center gap-3 rounded-card border border-line bg-surface p-3 pl-4 shadow-card lg:hidden">
      <Smartphone className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-semibold">Installa Cash Flow Pilot</span>
        <span className="block text-xs text-faint">Si apre dalla Home, come un&apos;app.</span>
      </p>
      <Button size="sm" variant="primary" onClick={() => install()} className="shrink-0">
        {canOneTap ? "Installa" : "Come fare"}
      </Button>
      <IconButton label="Non ora" icon={X} onClick={dismissBanner} className="-mr-1 h-9 w-9 shrink-0" />
    </div>
  );
}
