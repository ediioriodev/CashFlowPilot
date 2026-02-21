"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ShieldCheck, XCircle } from "lucide-react";
import { translateAuthError } from "@/lib/formatUtils";

type PageState = "waiting" | "ready" | "success" | "expired";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("waiting");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // ── 1. PKCE flow: URL contains ?code=XXXX ──────────────────────────────
      const code = searchParams.get("code");
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled) {
            setPageState(error ? "expired" : "ready");
          }
        } catch {
          if (!cancelled) setPageState("expired");
        }
        return;
      }

      // ── 2. Implicit flow: URL hash contains #access_token=...&type=recovery ─
      // The Supabase client processes the hash automatically and fires
      // PASSWORD_RECOVERY via onAuthStateChange. We listen for it with a timeout.
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        const unsub = supabase.auth.onAuthStateChange((event) => {
          if (cancelled) return;
          if (event === "PASSWORD_RECOVERY") {
            setPageState("ready");
            unsub.data.subscription.unsubscribe();
          }
        });

        const timeout = setTimeout(() => {
          if (!cancelled) setPageState("expired");
          unsub.data.subscription.unsubscribe();
        }, 8_000);

        return () => {
          cancelled = true;
          clearTimeout(timeout);
          unsub.data.subscription.unsubscribe();
        };
      }

      // ── 3. No token at all ──────────────────────────────────────────────────
      if (!cancelled) setPageState("expired");
    };

    init();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPageState("success");
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(translateAuthError(err.message) || "Errore durante il salvataggio della password.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Views ────────────────────────────────────────────────────────────────

  if (pageState === "waiting") {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 text-center py-4">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Verifica del link in corso…</p>
        </div>
      </Layout>
    );
  }

  if (pageState === "expired") {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Link non valido o scaduto</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Il link di recupero è scaduto o è già stato utilizzato.
            <br />Richiedi un nuovo link dalla pagina di login.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Torna al login
          </button>
        </div>
      </Layout>
    );
  }

  if (pageState === "success") {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
            <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Password aggiornata!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            La tua password è stata salvata con successo.
            <br />Verrai reindirizzato al login tra pochi secondi…
          </p>
        </div>
      </Layout>
    );
  }

  // pageState === "ready"
  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuova password</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Scegli una nuova password per il tuo account.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nuova password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900 pr-10"
              placeholder="Minimo 8 caratteri"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Conferma password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900 pr-10"
              placeholder="Ripeti la nuova password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva nuova password"}
        </button>
      </form>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
        {children}
      </div>
    </div>
  );
}