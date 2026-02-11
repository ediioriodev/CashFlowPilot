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
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Registrazione</h1>
          <p className="text-gray-500">Crea il tuo account per iniziare</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        {inviteData && inviteData.valid && (
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-200">
             Stai accettando l'invito per unirti al gruppo: <strong>{inviteData.groupName}</strong>
             <br/>invitato da: {inviteData.invitedByName || inviteData.invitedEmail}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cognome
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="nome@esempio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome del nuovo gruppo
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Es. Spese Casa, Famiglia Rossi..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Creerai un nuovo gruppo di cui sarai l'amministratore.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Registrati"
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Hai già un account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
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
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
