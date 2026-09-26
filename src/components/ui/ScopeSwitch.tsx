"use client";

import { Users, User } from "lucide-react";
import { useScope } from "@/context/ScopeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Quale portafoglio sto guardando.
 * Sempre icona + nome: il colore da solo non basta (WCAG 1.4.1),
 * e due blu quasi identici — com'era prima — non comunicano nulla.
 */
export default function ScopeSwitch({
  className,
  inSidebar = false,
}: {
  className?: string;
  /** Da desktop la sidebar porta già lo switch: nell'intestazione della
      pagina sarebbe il secondo identico, uno sopra l'altro. */
  inSidebar?: boolean;
}) {
  const { scope, setScope, availableScopes } = useScope();
  const { profile } = useAuth();

  if (!availableScopes.hasPersonal || !availableScopes.hasShared) return null;

  const options = [
    { value: "C" as const, label: profile?.group_name || "Famiglia", icon: Users },
    { value: "P" as const, label: profile?.first_name || "Personale", icon: User },
  ];

  return (
    <div
      role="group"
      aria-label="Portafoglio attivo"
      className={cn(
        "flex gap-0.5 rounded-pill border border-line bg-surface-3 p-1",
        !inSidebar && "lg:hidden",
        className
      )}
    >
      {options.map((o) => {
        const active = scope === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => setScope(o.value)}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-pill px-3.5 text-[13px] font-semibold transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-faint hover:text-ink"
            )}
          >
            <o.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
