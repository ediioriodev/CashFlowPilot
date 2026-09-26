"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Mail, Smartphone, Wallet } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { translateAuthError } from "@/lib/formatUtils";
import { Button, Card, Field, IconButton, inputClass } from "@/components/ui/kit";
import { useInstall } from "@/context/InstallContext";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

type View = "login" | "forgot" | "sent";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const { canInstall, install } = useInstall();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.refresh();
      router.push("/");
    } catch (err) {
      setError(translateAuthError(errorMessage(err)) || "Accesso non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
      if (error) throw error;
      setView("sent");
    } catch (err) {
      setResetError(translateAuthError(errorMessage(err)) || "Invio dell'email non riuscito.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-card bg-accent text-accent-ink">
            <Wallet className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow Pilot</h1>
            <p className="mt-1 text-sm text-muted">Sai sempre quanto puoi spendere davvero.</p>
          </div>
        </div>

        <Card className="p-6">
          {view === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <p role="alert" className="rounded-md bg-neg-soft p-3 text-sm font-medium text-neg">
                  {error}
                </p>
              )}

              <Field label="Email" htmlFor="email" required>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />
                  <IconButton
                    label={showPassword ? "Nascondi la password" : "Mostra la password"}
                    icon={showPassword ? EyeOff : Eye}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  />
                </div>
              </Field>

              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetError(null);
                  setView("forgot");
                }}
                className="-mt-1 self-end px-1 py-2 text-xs font-semibold text-accent"
              >
                Password dimenticata?
              </button>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Accedi
              </Button>

              <p className="text-center text-sm text-muted">
                Non hai un account?{" "}
                <Link href="/register" className="font-semibold text-accent">
                  Registrati
                </Link>
              </p>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold">Recupera la password</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Ti mandiamo un link per impostarne una nuova.
                </p>
              </div>

              {resetError && (
                <p role="alert" className="rounded-md bg-neg-soft p-3 text-sm font-medium text-neg">
                  {resetError}
                </p>
              )}

              <Field label="Email" htmlFor="reset-email" required>
                <input
                  id="reset-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className={inputClass}
                />
              </Field>

              <Button type="submit" variant="primary" size="lg" loading={resetLoading} className="w-full">
                Invia il link
              </Button>

              <Button type="button" variant="ghost" icon={ArrowLeft} onClick={() => setView("login")} className="mx-auto">
                Torna all&apos;accesso
              </Button>
            </form>
          )}

          {view === "sent" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="text-lg font-bold">Email inviata</h2>
              <p className="text-sm leading-relaxed text-muted">
                Abbiamo mandato il link a <strong className="font-semibold text-ink">{resetEmail}</strong>. Controlla
                anche la posta indesiderata.
              </p>
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("login")} className="mt-2">
                Torna all&apos;accesso
              </Button>
            </div>
          )}
        </Card>

        {/* Chi arriva qui dal browser del telefono spesso non ha ancora l'app:
            è il momento giusto per proporla. Su desktop non serve. */}
        {canInstall && (
          <Button variant="ghost" icon={Smartphone} onClick={() => install()} className="mt-4 w-full lg:hidden">
            Installa l&apos;app sul telefono
          </Button>
        )}
      </div>
    </main>
  );
}
