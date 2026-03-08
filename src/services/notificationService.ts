import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export const notificationService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  },

  getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    return await Notification.requestPermission();
  },

  async subscribeToPush(): Promise<{ subscription: PushSubscription | null; error?: string }> {
    if (!this.isSupported()) return { subscription: null, error: 'Push non supportato su questo browser.' };
    if (!VAPID_PUBLIC_KEY) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
      return { subscription: null, error: 'Configurazione VAPID mancante.' };
    }

    const registration = await navigator.serviceWorker.ready;

    // Clear any stale existing subscription before subscribing fresh
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      try {
        await existing.unsubscribe();
      } catch {
        // Ignore unsubscribe errors — proceed with fresh subscribe anyway
      }
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      return { subscription };
    } catch (err: any) {
      console.error('pushManager.subscribe() failed:', err?.message ?? err);
      return { subscription: null, error: err?.message ?? 'Errore durante la registrazione push.' };
    }
  },

  async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users_group')
      .update({
        push_token: JSON.stringify(subscription),
        notifications_enabled: true,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async unsubscribe(): Promise<void> {
    if (!this.isSupported()) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users_group')
      .update({ push_token: null, notifications_enabled: false })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async enableNotifications(): Promise<{ success: boolean; error?: string }> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied'
          ? 'Permesso notifiche negato. Abilitalo nelle impostazioni del browser.'
          : 'Permesso non concesso.',
      };
    }

    const { subscription, error: subError } = await this.subscribeToPush();
    if (!subscription) {
      return { success: false, error: subError ?? 'Impossibile registrare le notifiche push.' };
    }

    await this.saveSubscription(subscription);
    return { success: true };
  },
};
