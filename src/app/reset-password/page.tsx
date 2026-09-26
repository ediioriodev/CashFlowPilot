"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, ShieldCheck, XCircle } from "lucide-react";
import { translateAuthError } from "@/lib/formatUtils";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Controlla se ci sono errori nell'hash dell'URL (es. link scaduto)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const errorDesc = hashParams.get("error_description");
    const errorCode = hashParams.get("error_code");

    if (errorCode || errorDesc) {
      setLinkError(
        translateAuthError(errorDesc || errorCode || "") || 
        "Il link di recupero non è valido o è scaduto."
      );
    }
  }, []);

  const passwordsMatch = confirmPassword === "" || newPassword === confirmPassword;
  const confirmTouched = confirmPassword !== "";

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
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(translateAuthError(err.message) || "Errore durante il salvataggio della password.");
    } finally {
      setLoading(false);
    }
  };

  if (linkError) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-neg-soft p-4 rounded-full">
            <XCircle className="w-8 h-8 text-neg" />
          </div>
          <h1 className="text-xl font-bold text-ink">Link non valido o scaduto</h1>
          <p className="text-muted text-sm">
            {linkError}
            <br />Richiedi un nuovo link dalla pagina di login.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 text-accent hover:underline text-sm font-medium"
          >
            Torna al login
          </button>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-pos-soft p-4 rounded-full">
            <ShieldCheck className="w-8 h-8 text-pos" />
          </div>
          <h1 className="text-xl font-bold text-ink">Password aggiornata!</h1>
          <p className="text-muted text-sm">
            La tua password è stata salvata con successo.
            <br />Verrai reindirizzato al login tra pochi secondi…
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">Nuova password</h1>
        <p className="text-muted text-sm mt-1">
          Scegli una nuova password per il tuo account.
        </p>
      </div>

      {error && (
        <div className="bg-neg-soft text-neg p-3 rounded-md text-sm border border-neg">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-muted mb-1">
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
              className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface pr-10"
              placeholder="Minimo 8 caratteri"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-muted dark:hover:text-muted"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-muted mb-1">
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-ink dark:bg-surface pr-10 ${
                confirmTouched && !passwordsMatch
                  ? "border-neg focus:ring-neg"
                  : confirmTouched && passwordsMatch
                  ? "border-pos focus:ring-pos"
                  : "border-line focus:border-accent"
              }`}
              placeholder="Ripeti la nuova password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-muted dark:hover:text-muted"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {confirmTouched && !passwordsMatch && (
            <p className="text-xs text-neg mt-1">Le password non coincidono.</p>
          )}
          {confirmTouched && passwordsMatch && (
            <p className="text-xs text-pos mt-1">Le password coincidono.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (confirmTouched && !passwordsMatch)}
          className="w-full bg-accent text-white py-2 px-4 rounded-md hover:brightness-110 focus:outline-none focus:border-accent focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva nuova password"}
        </button>
      </form>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md bg-surface rounded-lg shadow-md p-6 space-y-6">
        {children}
      </div>
    </div>
  );
}

