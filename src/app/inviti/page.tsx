"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inviteService, InviteData } from "@/services/inviteService";
import { groupService } from "@/services/groupService";
import { useAuth } from "@/context/AuthContext";
import { Send, Trash2, Copy, Share2, Mail, Users, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatUtils";

export default function InvitiPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [activeInvites, setActiveInvites] = useState<InviteData[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    loadGroupAndInvites();
  }, [user]);

  const loadGroupAndInvites = async () => {
    if (!user) return;
    
    try {
      setLoadingInvites(true);
      const gid = await groupService.getGroupId();
      
      if (gid) {
        setGroupId(gid);
        await refreshInvites(gid);
      } else {
        toast.error("Nessun gruppo trovato per questo utente.");
      }
    } catch (error) {
      console.error("Error loading group info:", error);
      toast.error("Errore nel caricamento delle informazioni del gruppo.");
    } finally {
      setLoadingInvites(false);
    }
  };

  const refreshInvites = async (gid: number) => {
    const result = await inviteService.getActiveInvites(gid);
    if (result.success) {
      setActiveInvites(result.invites);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user) return;

    setLoading(true);

    try {
      const result = await inviteService.createInvite(
        groupId,
        user.id,
        invitedEmail || null,
        7 // 7 giorni di validità
      );

      if (result.success && result.inviteCode) {
        const formattedCode = inviteService.formatInviteCode(result.inviteCode);
        toast.success("Codice invito creato!");
        setInvitedEmail("");
        await refreshInvites(groupId);
        // Optional: Auto share/copy logic here if desired, 
        // but explicit user action is usually better on web.
      } else {
        toast.error(result.error || "Errore nella creazione dell'invito");
      }
    } catch (error: any) {
      toast.error(error.message || "Errore imprevisto.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiato negli appunti!");
    } catch (err) {
      toast.error("Impossibile copiare il link.");
    }
  };

  const handleShare = async (inviteCode: string) => {
    const formattedCode = inviteService.formatInviteCode(inviteCode);
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${appUrl}/register?invite=${inviteCode}`; // Assuming /register handles invite codes or similar
    
    // Fallback message
    const shareData = {
      title: 'Invito Gestore Spese',
      text: `Entra nel mio gruppo su Cash Flow Pilot! Codice: ${formattedCode}`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to copy link
      copyToClipboard(inviteLink);
    }
  };

  const handleCancelInvite = async (inviteCode: string) => {
    if (!confirm("Sei sicuro di voler cancellare questo invito?")) return;
    if (!user || !groupId) return;

    try {
      const result = await inviteService.cancelInvite(inviteCode, user.id);
      if (result.success) {
        toast.success("Invito cancellato.");
        await refreshInvites(groupId);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Errore durante la cancellazione.");
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 transition-colors duration-200">
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Invita Membri</h1>

        {/* Create Invite Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Nuovo Invito</h2>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Genera un codice per invitare un nuovo membro nel tuo gruppo. 
            Il codice sarà valido per 7 giorni.
          </p>
          
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email (opzionale)
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={invitedEmail}
                  onChange={(e) => setInvitedEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors outline-none"
                />
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium transition-all ${
                loading 
                  ? "bg-indigo-400 dark:bg-indigo-500/50 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? (
                <span>Generazione...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Genera Codice
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active Invites List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 px-1">Inviti Attivi</h3>

          {loadingInvites ? (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400">
               Caricamento...
             </div>
          ) : activeInvites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700 border-dashed">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nessun invito attivo al momento.</p>
            </div>
          ) : (
            activeInvites.map((invite) => {
              const daysRemaining = getDaysRemaining(invite.expires_at);
              const isExpiringSoon = daysRemaining <= 2;
              const formattedCode = inviteService.formatInviteCode(invite.invite_code);

              return (
                <div 
                  key={invite.id} 
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 transition-all hover:shadow-md relative overflow-hidden ${
                    isExpiringSoon ? 'border-amber-200 dark:border-amber-800/50' : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {isExpiringSoon && (
                    <div className="absolute top-0 right-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> In scadenza
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider mb-1">
                        {formattedCode}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Scade tra {daysRemaining} giorni
                      </div>
                    </div>
                  </div>

                  {invite.invited_email && (
                     <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded inline-block">
                        Per: <span className="font-medium text-gray-900 dark:text-white">{invite.invited_email}</span>
                     </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleShare(invite.invite_code)}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-medium"
                    >
                      <Share2 className="w-4 h-4" />
                      Condividi
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.invite_code)}
                      className="flex-none flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Cancella invito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-3 border-t dark:border-gray-700 pt-2">
                    Creato il {formatDate(invite.created_at)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
