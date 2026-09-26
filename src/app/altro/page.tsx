"use client";

import Link from "next/link";
import { ChevronRight, LogOut, Moon, Sun } from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import { Avatar, Card, Toggle } from "@/components/ui/kit";
import ModeSwitch from "@/components/ui/ModeSwitch";
import InstallCard from "@/components/install/InstallCard";
import { useMode } from "@/context/ModeContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BOTTOM_NAV, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav";
import packageInfo from "../../../package.json";

/**
 * Su mobile la barra in basso ha 4 voci: tutto il resto vive qui.
 * Su desktop queste stesse voci sono già nella sidebar.
 */
export default function AltroPage() {
  const { user, profile, signOut } = useAuth();
  const { isDarkMode, setTheme } = useTheme();
  const { isSimple } = useMode();

  // Le destinazioni già presenti nella barra in basso non si ripetono qui:
  // si ricava da BOTTOM_NAV, così cambiare le tab non lascia doppioni.
  const tabs = new Set(BOTTOM_NAV.map((n) => n.href));
  const principali = PRIMARY_NAV.filter((n) => !tabs.has(n.href));

  return (
    <ProtectedRoute>
      <PageHeader title="Altro" subtitle="Tutto quello che non sta nella barra" />

      <PageBody
        main={
          <>
            <Card className="flex items-center gap-3 p-4">
              <Avatar id={user?.id ?? "me"} name={profile?.first_name || user?.email || "Profilo"} size={46} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Il tuo profilo"}
                </p>
                <p className="truncate text-xs text-faint">{user?.email}</p>
              </div>
              <Link
                href="/account"
                className="flex min-h-11 items-center gap-1 rounded-md px-3 text-xs font-semibold text-accent"
              >
                Modifica
              </Link>
            </Card>

            <InstallCard />

            <Card>
              <ul>
                {principali.map((n) => (
                  <NavRow key={n.href} {...n} />
                ))}
              </ul>
            </Card>

            <Card>
              <ul>
                {SECONDARY_NAV.map((n) => (
                  <NavRow key={n.href} {...n} />
                ))}
              </ul>
            </Card>

            <Card className="flex flex-col gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">Quanto vedere</p>
                <p className="mt-0.5 text-xs leading-relaxed text-faint">
                  {isSimple
                    ? "Semplice: il disegno e il numero. Le cose restano dove sono."
                    : "Avanzata: ritmi, proiezioni, tabelle e confronti."}
                </p>
              </div>
              <ModeSwitch />
            </Card>

            <Card className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
                  {isDarkMode ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
                </span>
                <div>
                  <p className="text-sm font-semibold">Tema scuro</p>
                  <p className="text-xs text-faint">Si salva sul tuo profilo.</p>
                </div>
              </div>
              <Toggle checked={isDarkMode} onChange={(v) => setTheme(v)} label="Tema scuro" />
            </Card>

            {/* Azione distruttiva: separata e in fondo, mai fra le voci di navigazione. */}
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-card border border-line bg-surface text-sm font-semibold text-neg transition-colors hover:bg-neg-soft"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Esci
            </button>

            <p className="pb-2 text-center text-[11px] text-faint">Cash Flow Pilot v{packageInfo.version}</p>
          </>
        }
      />
    </ProtectedRoute>
  );
}

function NavRow({
  href,
  label,
  desc,
  icon: Icon,
}: {
  href: string;
  label: string;
  desc?: string;
  icon: React.ElementType;
}) {
  return (
    <li className="border-b border-line last:border-0">
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{label}</span>
          {desc && <span className="block truncate text-xs text-faint">{desc}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      </Link>
    </li>
  );
}
