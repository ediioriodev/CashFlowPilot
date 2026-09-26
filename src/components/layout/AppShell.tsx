"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { AUTH_ROUTES } from "./nav";

/**
 * Struttura adattiva:
 *  - da 1024px: sidebar persistente, contenuto su colonne
 *  - sotto: barra in basso con 4 voci + azione centrale
 * Le pagine di autenticazione non hanno cornice.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const bare = AUTH_ROUTES.includes(pathname) || !user;
  if (bare) return <>{children}</>;

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* lo spazio in basso evita che l'ultimo elemento finisca sotto la barra */}
        <main className="min-w-0 flex-1 pb-28 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
