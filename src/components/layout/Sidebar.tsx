"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wallet, Plus, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { PRIMARY_NAV, SECONDARY_NAV, isNavActive } from "./nav";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import ModeSwitch from "@/components/ui/ModeSwitch";
import { Avatar, Button, IconButton } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

/** Navigazione persistente da 1024px in su. Su mobile non esiste. */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const name = profile?.first_name || user?.email?.split("@")[0] || "Profilo";

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
      <Link href="/" className="mb-5 flex items-center gap-2.5 px-2 text-[15px] font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-ink">
          <Wallet className="h-4 w-4" aria-hidden />
        </span>
        Cash Flow Pilot
      </Link>

      <ScopeSwitch inSidebar className="mb-2" />
      <ModeSwitch className="mb-4" />

      <nav aria-label="Navigazione principale" className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-3 hover:text-ink"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <hr className="my-3 border-line" />

      <nav aria-label="Navigazione secondaria" className="flex flex-col gap-0.5">
        {SECONDARY_NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-3 hover:text-ink"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <Button variant="primary" icon={Plus} className="w-full" onClick={() => router.push("/spese/nuova")}>
          Aggiungi spesa
        </Button>

        <div className="mt-3 flex items-center gap-2.5">
          <Avatar id={user?.id ?? "me"} name={name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            <p className="truncate text-[11.5px] text-faint">{profile?.group_name || "Nessun gruppo"}</p>
          </div>
          <IconButton
            label={isDarkMode ? "Passa al tema chiaro" : "Passa al tema scuro"}
            icon={isDarkMode ? Sun : Moon}
            onClick={toggleTheme}
            className="h-9 w-9"
          />
        </div>

        {/* Azione distruttiva: separata dalle voci di navigazione. */}
        <button
          type="button"
          onClick={signOut}
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[13.5px] font-medium text-neg transition-colors hover:bg-neg-soft"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
          Esci
        </button>
      </div>
    </aside>
  );
}
