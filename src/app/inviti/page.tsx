"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Copy, Mail, Send, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Button, Card, CardHeader, EmptyState, Field, IconButton, Pill, Skeleton, inputClass } from "@/components/ui/kit";
import { inviteService, InviteData } from "@/services/inviteService";
import { groupService } from "@/services/groupService";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatUtils";

/** Quanti giorni vale un codice appena creato. */
const VALIDITA_GIORNI = 7;

const giorniMancanti = (expiresAt: string) =>
  Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

/**
 * Invita membri. Riportata sull'impianto delle altre pagine (PageHeader,
 * Card, Button del kit): era rimasta com'era prima del redesign, con il
 * pulsante in text-white su accento — illeggibile in tema scuro — e la
 * cancellazione affidata al confirm() del browser.
 */
export default function InvitiPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [activeInvites, setActiveInvites] = useState<InviteData[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [daCancellare, setDaCancellare] = useState<InviteData | null>(null);

  const refreshInvites = useCallback(async (gid: number) => {
    const result = await inviteService.getActiveInvites(gid);
    if (result.success) setActiveInvites(result.invites);
  }, []);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      try {
        setLoadingInvites(true);
        const gid = await groupService.getGroupId();
        if (!vivo) return;
        if (gid) {
          setGroupId(gid);
          await refreshInvites(gid);
        } else {
          toast.error("Nessun gruppo trovato per questo utente.");
        }
      } catch (error) {
        console.error("Error loading group info:", error);
        toast.error("Non è stato possibile caricare gli inviti.");
      } finally {
        if (vivo) setLoadingInvites(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [user, refreshInvites]);

  const linkDi = (code: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${code}`;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user) return;
    setLoading(true);
    try {
      const result = await inviteService.createInvite(groupId, user.id, invitedEmail.trim() || null, VALIDITA_GIORNI);
      if (result.success && result.inviteCode) {
        toast.success("Invito pronto", { description: "Condividilo o copia il codice qui sotto." });
        setInvitedEmail("");
        await refreshInvites(groupId);
      } else {
        toast.error(result.error || "Non è stato possibile creare l'invito.");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Errore imprevisto.");
    } finally {
      setLoading(false);
    }
  };

  const copia = async (testo: string, cosa: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      toast.success(`${cosa} copiato`);
    } catch {
      toast.error("Non è stato possibile copiare.");
    }
  };

  const handleShare = async (inviteCode: string) => {
    const formattedCode = inviteService.formatInviteCode(inviteCode);
    const shareData = {
      title: "Invito a Cash Flow Pilot",
      text: `Entra nel mio gruppo su Cash Flow Pilot! Codice: ${formattedCode}`,
      url: linkDi(inviteCode),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // annullato dall'utente
      }
    } else {
      copia(shareData.url, "Link");
    }
  };

  const cancella = async (invite: InviteData) => {
    if (!user || !groupId) return;
    const result = await inviteService.cancelInvite(invite.invite_code, user.id);
    if (result.success) {
      toast.success("Invito annullato");
      await refreshInvites(groupId);
    } else {
      toast.error(result.error || "Non è stato possibile annullare l'invito.");
    }
  };

  return (
    <ProtectedRoute>
      <PageHeader title="Invita membri" subtitle="Chi entra nel gruppo vede e aggiunge le spese condivise" backHref="/altro" />

      <PageBody
        main={
          <>
            <Card className="p-4 lg:p-5">
              <CardHeader
                title="Nuovo invito"
                hint={`Crei un codice da mandare a chi vuoi far entrare. Vale ${VALIDITA_GIORNI} giorni.`}
              />
              <form onSubmit={handleCreateInvite} className="flex flex-col gap-4">
                <Field label="Email" htmlFor="invito-email" help="Facoltativa: serve solo a ricordarti per chi è.">
                  <div className="relative">
                    <input
                      type="email"
                      id="invito-email"
                      value={invitedEmail}
                      onChange={(e) => setInvitedEmail(e.target.value)}
                      placeholder="nome@esempio.it"
                      className={`${inputClass} pl-10`}
                    />
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                  </div>
                </Field>
                <Button type="submit" variant="primary" icon={Send} loading={loading} disabled={!groupId}>
                  Crea l&apos;invito
                </Button>
              </form>
            </Card>

            <Card className="p-4 lg:p-5">
              <CardHeader
                title="Inviti attivi"
                hint={loadingInvites ? undefined : `${activeInvites.length} ${activeInvites.length === 1 ? "invito" : "inviti"}`}
              />
              {loadingInvites ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : activeInvites.length === 0 ? (
                <EmptyState icon={Users} title="Nessun invito attivo" body="Quando ne crei uno, lo trovi qui finché non viene usato o scade." />
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {activeInvites.map((invite) => {
                    const giorni = giorniMancanti(invite.expires_at);
                    const codice = inviteService.formatInviteCode(invite.invite_code);
                    return (
                      <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                          <UserPlus className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-lg font-bold tracking-wider text-accent">{codice}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-faint">
                            {giorni <= 2 ? (
                              <Pill tone="warn" icon={AlertTriangle}>
                                {giorni <= 0 ? "scade oggi" : `scade tra ${giorni} ${giorni === 1 ? "giorno" : "giorni"}`}
                              </Pill>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden /> scade tra {giorni} giorni
                              </span>
                            )}
                            {invite.invited_email && <span>· per {invite.invited_email}</span>}
                            <span>· creato il {formatDate(invite.created_at)}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" variant="secondary" icon={Share2} onClick={() => handleShare(invite.invite_code)}>
                            Condividi
                          </Button>
                          <IconButton label="Copia il codice" icon={Copy} onClick={() => copia(codice, "Codice")} />
                          <IconButton
                            label="Annulla l'invito"
                            icon={Trash2}
                            onClick={() => setDaCancellare(invite)}
                            className="hover:text-neg"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        }
      />

      <ConfirmModal
        isOpen={!!daCancellare}
        onClose={() => setDaCancellare(null)}
        onConfirm={() => (daCancellare ? cancella(daCancellare) : undefined)}
        title="Annullare l'invito?"
        message={
          daCancellare
            ? `Il codice ${inviteService.formatInviteCode(daCancellare.invite_code)} smetterà di funzionare subito.`
            : ""
        }
        confirmText="Annulla l'invito"
        cancelText="Tienilo"
        isDestructive
      />
    </ProtectedRoute>
  );
}
