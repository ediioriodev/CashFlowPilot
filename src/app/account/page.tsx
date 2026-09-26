"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save, User, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import { Avatar, Button, Card, CardHeader, Field, Pill, Skeleton, inputClass } from "@/components/ui/kit";
import { userService, UserProfile } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";

export default function AccountPage() {
  const { user, refreshSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await userService.getProfile();
      if (data) {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      }
    } catch (e) {
      console.error(e);
      toast.error("Caricamento del profilo non riuscito");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Il nome è obbligatorio.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await userService.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      await refreshSettings();
      await loadProfile();
      toast.success("Profilo aggiornato");
    } catch (err) {
      console.error(err);
      toast.error("Aggiornamento non riuscito");
    } finally {
      setSaving(false);
    }
  };

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <ProtectedRoute>
      <PageHeader title="Profilo" subtitle="Nome, gruppo e accesso" backHref="/altro" />

      <PageBody
        main={
          loading ? (
            <>
              <Skeleton className="h-32 w-full rounded-card" />
              <Skeleton className="h-52 w-full rounded-card" />
            </>
          ) : (
            <>
              <Card className="flex flex-col items-center gap-3 p-6 text-center">
                <Avatar id={user?.id ?? "me"} name={fullName || profile?.email || "?"} size={76} />
                <div>
                  <h2 className="text-lg font-bold">{fullName || "Completa il tuo nome"}</h2>
                  <p className="text-sm text-faint">{profile?.email}</p>
                </div>
              </Card>

              <Card as="form" onSubmit={submit} className="flex flex-col gap-4 p-4 lg:p-5">
                <CardHeader title="Dati personali" hint="Come ti vedono gli altri membri del gruppo." />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome" required htmlFor="nome" error={error}>
                    <input
                      id="nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Cognome" htmlFor="cognome">
                    <input
                      id="cognome"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Button type="submit" variant="primary" icon={Save} loading={saving} className="w-full">
                  Salva modifiche
                </Button>
              </Card>

              <Card className="p-4 lg:p-5">
                <CardHeader title="Gruppo familiare" />
                {profile?.group_id ? (
                  <div className="flex items-center gap-3 rounded-md bg-surface-2 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                      <Users className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{profile.group_name || "Gruppo senza nome"}</p>
                      <p className="text-xs text-faint">Le spese condivise finiscono qui.</p>
                    </div>
                    <Link href="/famiglia">
                      <Button size="sm">Apri</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-md bg-warn-soft p-4">
                    <p className="text-sm text-warn">
                      Non fai parte di nessun gruppo: vedi solo il portafoglio personale.
                    </p>
                    <Link href="/inviti">
                      <Button size="sm" icon={UserPlus}>Vai agli inviti</Button>
                    </Link>
                  </div>
                )}
              </Card>
            </>
          )
        }
        side={
          <Card className="p-4 lg:p-5">
            <CardHeader title="Accesso" />
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Email</dt>
                <dd className="truncate font-semibold">{profile?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Ruolo</dt>
                <dd>
                  <Pill icon={User}>{profile?.group_id ? "Membro del gruppo" : "Solo personale"}</Pill>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-faint">
              Per cambiare la password esci e usa &laquo;Password dimenticata&raquo; nella schermata di accesso: il link
              arriva via email.
            </p>
          </Card>
        }
      />
    </ProtectedRoute>
  );
}
