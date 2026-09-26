"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { inviteService, InviteResult } from "@/services/inviteService";
import { groupService } from "@/services/groupService";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationCode = searchParams.get("invite") || searchParams.get("invitation");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [groupName, setGroupName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!!invitationCode);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteResult | null>(null);

  useEffect(() => {
    const validate = async () => {
      if (!invitationCode) {
        setInitializing(false);
        return;
      }

      try {
        const result = await inviteService.validateInvite(invitationCode);
        if (result.success && result.valid) {
          setInviteData(result);
        } else {
          setError(result.error || "Invito non valido o scaduto");
        }
      } catch (err: any) {
        setError("Errore durante la verifica dell'invito");
      } finally {
        setInitializing(false);
      }
    };

    validate();
  }, [invitationCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error("Registrazione fallita (nessun utente creato)");

      // 2. Handle Group logic
      if (inviteData && inviteData.valid && invitationCode) {
        // Accept Invite
        const acceptResult = await inviteService.acceptInvite(
          invitationCode,
          user.id,
          firstName,
          lastName
        );

        if (!acceptResult.success) {
           throw new Error(acceptResult.error || "Errore nell'accettazione dell'invito");
        }
      } else {
        // Create New Group
        const registerResult = await groupService.registerUserWithGroup(
          user.id,
          groupName,
          firstName,
          lastName
        );

        if (!registerResult.success) {
          throw new Error(registerResult.error || "Errore nella creazione del gruppo");
        }
      }

      // 3. Redirect or Show Success
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        router.push("/");
      } else {
        router.push("/login?message=registrazione_avvenuta");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md bg-surface rounded-lg shadow-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink">Registrazione</h1>
          <p className="text-muted">Crea il tuo account per iniziare</p>
        </div>

        {error && (
          <div className="bg-neg-soft text-neg p-3 rounded-md text-sm border border-neg">
            {error}
          </div>
        )}

        {inviteData && inviteData.valid && (
          <div className="bg-accent-soft text-accent p-3 rounded-md text-sm border border-accent">
             Stai accettando l'invito per unirti al gruppo: <strong>{inviteData.groupName}</strong>
             <br/>invitato da: {inviteData.invitedByName || inviteData.invitedEmail}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-muted mb-1">
                Nome
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-muted mb-1">
                Cognome
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface"
              placeholder="nome@esempio.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {(!inviteData || !inviteData.valid) && (
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-muted mb-1">
                Nome del nuovo gruppo
              </label>
              <input
                id="groupName"
                name="groupName"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-accent text-ink dark:bg-surface"
                placeholder="Es. Spese Casa, Famiglia Rossi..."
              />
              <p className="mt-1 text-xs text-muted">
                Creerai un nuovo gruppo di cui sarai l'amministratore.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2 px-4 rounded-md hover:brightness-110 focus:outline-none focus:border-accent focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Registrati"
            )}
          </button>
        </form>

        <div className="text-center text-sm text-muted">
          Hai già un account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
