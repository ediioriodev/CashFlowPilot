"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/kit";

/**
 * Durante il controllo della sessione mostriamo uno scheletro della
 * pagina, non uno spinner al centro: stessa forma del contenuto,
 * nessun salto di layout quando i dati arrivano.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="page px-4 py-6 lg:px-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Caricamento in corso…</span>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-6 h-64 w-full rounded-card" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
