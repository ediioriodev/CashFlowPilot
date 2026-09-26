"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

/**
 * Intestazione di pagina. Dice sempre DOVE sei — cosa che l'header
 * precedente non faceva. Il "torna indietro" è gerarchico (backHref),
 * non basato sulla cronologia: da un deep link o da una notifica
 * router.back() portava fuori dall'app.
 */
export default function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
  /** filtri, selettore di periodo, tab: restano appiccicati in alto */
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-bg/85 px-4 pb-3 backdrop-blur-xl lg:px-8",
        className
      )}
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="page flex min-h-12 items-center gap-2">
        {backHref && (
          <IconButton
            label="Torna indietro"
            icon={ChevronLeft}
            onClick={() => router.push(backHref)}
            // «Altro» è il menu del telefono: da desktop tutto sta già nella
            // barra laterale, e la freccia portava a una pagina che lì non serve.
            className={cn("-ml-2 shrink-0", backHref === "/altro" && "lg:hidden")}
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-faint">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children && <div className="page mt-3 flex flex-col gap-3">{children}</div>}
    </header>
  );
}

/** Corpo della pagina: due colonne da 1024px in su. */
export function PageBody({
  main,
  side,
  className,
}: {
  main: React.ReactNode;
  side?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page px-4 py-4 lg:px-8 lg:py-6", className)}>
      {/* Flex e non grid: se la colonna laterale sparisce (in Semplice, quando
          contiene solo blocchi .adv-only) la principale prende tutto lo spazio. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-[1.6_1_0%] lg:gap-6">{main}</div>
        {side && <div className="page-side flex min-w-0 flex-col gap-4 lg:flex-[1_1_0%] lg:gap-6">{side}</div>}
      </div>
    </div>
  );
}
