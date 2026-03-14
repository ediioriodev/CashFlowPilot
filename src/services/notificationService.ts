import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// navigator.serviceWorker.ready waits for the SW to control the page and can
// hang indefinitely on some mobile OSes (MagicOS, MIUI, ColorOS, etc.).
// Strategy:
//  1. Fast path: getRegistration() resolves immediately with the existing
//     registration even if the SW isn't yet controlling the page. For
//     PushManager the SW only needs to be active, not controlling.
//  2. Slow fallback: .ready with a generous timeout, in case the fast path
//     returns a registration without an active worker (e.g. first install).
async function getSwRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    // No registration at all (e.g. SW disabled in development) — return immediately.
    if (reg === undefined) return null;
    if (reg?.active) return reg; // Fast path: active SW already present
  } catch {
    // ignore — fall through to .ready
  }
  // Slow path: wait for the SW to become active, but don't block forever
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
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

    const registration = await getSwRegistration();
    if (!registration) {
      const isDev = process.env.NODE_ENV === 'development';
      return {
        subscription: null,
        error: isDev
          ? 'Service worker disabilitato in sviluppo. Usa una build di produzione per testare le notifiche push.'
          : 'Service worker non disponibile. Ricarica la pagina e riprova.',
      };
    }

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

    // Best-effort: remove the browser-side PushSubscription.
    // If the SW is unavailable (e.g. MagicOS killed it), skip and still
    // clear the DB — the important part is invalidating the stored token.
    try {
      const registration = await getSwRegistration(4000);
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
    } catch {
      // SW unavailable — proceed to clear DB anyway
    }

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
