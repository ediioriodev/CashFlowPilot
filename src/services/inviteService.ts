import { supabase } from "@/lib/supabaseClient";

export interface InviteResult {
  success: boolean;
  inviteCode?: string;
  inviteId?: number;
  expiresAt?: string;
  error?: string;
  valid?: boolean;
  groupId?: number;
  groupName?: string;
  invitedByName?: string;
  invitedEmail?: string;
  message?: string;
}

export interface InviteData {
  id: number;
  invite_code: string;
  invited_email: string | null;
  status?: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  invited_by?: string;
  accepted_by?: string;
}

export interface GetInvitesResult {
  success: boolean;
  invites: InviteData[];
  error?: string;
}

export const inviteService = {
  /**
   * Crea un nuovo invito per il gruppo
   */
  async createInvite(groupId: number, invitedBy: string, invitedEmail: string | null = null, expiresInDays: number = 7): Promise<InviteResult> {
    try {
      const { data, error } = await supabase.rpc('create_invite', {
        p_group_id: groupId,
        p_invited_by: invitedBy,
        p_invited_email: invitedEmail,
        p_expires_in_days: expiresInDays,
      });

      if (error) throw error;

      // La funzione RPC ritorna un JSON
      if (data.success) {
        return {
          success: true,
          inviteCode: data.invite_code,
          inviteId: data.invite_id,
          expiresAt: data.expires_at,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Errore nella creazione dell\'invito',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Errore imprevisto nella creazione dell\'invito',
      };
    }
  },

  /**
   * Valida un codice invito
   */
  async validateInvite(inviteCode: string): Promise<InviteResult> {
    try {
      const { data, error } = await supabase.rpc('validate_invite', {
        p_invite_code: inviteCode.toUpperCase(),
      });

      if (error) throw error;

      if (data.success && data.valid) {
        return {
          success: true,
          valid: true,
          groupId: data.group_id,
          groupName: data.group_name,
          invitedByName: data.invited_by_name,
          invitedEmail: data.invited_email,
          expiresAt: data.expires_at,
        };
      } else {
        return {
          success: true,
          valid: false,
          error: data.error || 'Codice invito non valido',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        error: error.message || 'Errore nella validazione dell\'invito',
      };
    }
  },

  /**
   * Accetta un invito e aggiunge l'utente al gruppo
   */
  async acceptInvite(inviteCode: string, userId: string, firstName: string, lastName: string | null = null): Promise<InviteResult> {
    try {
      const { data, error } = await supabase.rpc('accept_invite', {
        p_invite_code: inviteCode.toUpperCase(),
        p_user_id: userId,
        p_first_name: firstName,
        p_last_name: lastName,
      });

      if (error) throw error;

      if (data.success) {
        return {
          success: true,
          groupId: data.group_id,
          message: data.message,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Errore nell\'accettare l\'invito',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Errore imprevisto nell\'accettare l\'invito',
      };
    }
  },

  /**
   * Cancella un invito
   */
  async cancelInvite(inviteCode: string, userId: string): Promise<InviteResult> {
    try {
      const { data, error } = await supabase.rpc('cancel_invite', {
        p_invite_code: inviteCode.toUpperCase(),
        p_user_id: userId,
      });

      if (error) throw error;

      if (data.success) {
        return {
          success: true,
          message: data.message,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Errore nella cancellazione dell\'invito',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Errore imprevisto nella cancellazione dell\'invito',
      };
    }
  },

  /**
   * Recupera solo gli inviti attivi (pending e non scaduti)
   */
  async getActiveInvites(groupId: number): Promise<GetInvitesResult> {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          id,
          invite_code,
          invited_email,
          expires_at,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        invites: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Errore nel recupero degli inviti attivi',
        invites: [],
      };
    }
  },

  /**
   * Formatta il codice invito per la visualizzazione (aggiunge trattini)
   * Es: A3K9P2X7 -> A3K9-P2X7
   */
  formatInviteCode(code: string): string {
    if (!code || code.length !== 8) return code;
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  },

  /**
   * Rimuove la formattazione dal codice invito
   * Es: A3K9-P2X7 -> A3K9P2X7
   */
  unformatInviteCode(code: string): string {
    return code.replace(/[-\s]/g, '').toUpperCase();
  },
};
