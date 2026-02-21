"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { translateAuthError } from "@/lib/formatUtils";

type View = "login" | "forgot-password" | "forgot-password-sent";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Forgot password
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
    } catch (err: any) {
      setError(translateAuthError(err.message) || "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
      if (error) throw error;
      setView("forgot-password-sent");
    } catch (err: any) {
      setResetError(translateAuthError(err.message) || "Errore durante l'invio dell'email.");
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Views ────────────────────────────────────────────────────────────────

  const loginView = (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cash Flow Pilot</h1>
        <p className="text-gray-500 dark:text-gray-400">Accedi per gestire le tue spese</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900"
            placeholder="nome@esempio.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => { setResetEmail(email); setResetError(null); setView("forgot-password"); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Password dimenticata?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900 pr-10"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accedi"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Non hai un account?{" "}
        <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
          Registrati
        </Link>
      </div>
    </>
  );

  const forgotPasswordView = (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recupera password</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Inserisci la tua email e ti invieremo un link per reimpostare la password.
        </p>
      </div>

      {resetError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
          {resetError}
        </div>
      )}

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="reset-email"
            name="reset-email"
            type="email"
            required
            autoFocus
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900"
            placeholder="nome@esempio.com"
          />
        </div>

        <button
          type="submit"
          disabled={resetLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Invia link di recupero"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setView("login")}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna al login
      </button>
    </>
  );

  const forgotPasswordSentView = (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email inviata!</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Abbiamo inviato un link di recupero a{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{resetEmail}</span>.
          <br />Controlla la tua casella di posta (anche lo spam).
        </p>
      </div>

      <button
        type="button"
        onClick={() => setView("login")}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna al login
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
        {view === "login" && loginView}
        {view === "forgot-password" && forgotPasswordView}
        {view === "forgot-password-sent" && forgotPasswordSentView}
      </div>
    </div>
  );
}
