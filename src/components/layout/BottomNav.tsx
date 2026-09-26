"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BOTTOM_NAV, isNavActive } from "./nav";
import { cn } from "@/lib/utils";

/**
 * Quattro destinazioni con icona E testo (icon-only danneggia la
 * scopribilità) più il pulsante centrale: aggiungere una spesa è
 * un'azione, non una destinazione, quindi non è una tab.
 * Target minimo 48px, safe-area rispettata.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const [left, right] = [BOTTOM_NAV.slice(0, 2), BOTTOM_NAV.slice(2)];

  // «Aggiungi una spesa» ha già la sua barra «Salva» in fondo e la freccia
  // indietro: qui la barra copriva «Salva» con il «+» proprio al centro.
  if (pathname?.startsWith("/spese/nuova")) return null;

  const item = (href: string, label: string, Icon: React.ElementType) => {
    const active = isNavActive(href, pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-13 min-w-16 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10.5px] font-semibold transition-colors",
          active ? "text-accent" : "text-faint hover:text-ink"
        )}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.85} aria-hidden />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 flex items-start justify-around border-t border-line bg-surface/92 px-2 pt-2 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {left.map((n) => item(n.href, n.label, n.icon))}

      <Link
        href="/spese/nuova"
        aria-label="Aggiungi una spesa"
        className="-mt-5 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-pop transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.4} aria-hidden />
      </Link>

      {right.map((n) => item(n.href, n.label, n.icon))}
    </nav>
  );
}
