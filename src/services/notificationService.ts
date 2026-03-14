import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// navigator.serviceWorker.ready waits until the SW *controls* the page, which
// can hang forever on MagicOS/MIUI/ColorOS (the OS kills the SW before claim()).
// PushManager only requires the SW to be *active* (not controlling), so we use
// a more targeted approach:
//  1. getRegistration() (no arg = current page URL) — resolves immediately.
//  2. If already active → return right away.
//  3. If installing/waiting → watch statechange directly until activated or timeout.
async function getSwRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  let reg: ServiceWorkerRegistration | undefined;
  try {
    reg = await navigator.serviceWorker.getRegistration();
  } catch {
    return null;
  }
  // No SW registered at all (e.g. SW disabled in dev mode).
  if (reg === undefined) return null;
  // Fast path: SW already active.
  if (reg.active) return reg;
  // SW is still installing or waiting to activate.
  // Watch its statechange event directly — avoids depending on .ready which
  // requires the SW to control the page (never happens on some mobile OSes).
  const worker = reg.installing ?? reg.waiting;
  if (!worker) return null;
  return new Promise<ServiceWorkerRegistration | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    worker.addEventListener('statechange', function onStateChange() {
      if (reg!.active) {
        clearTimeout(timer);
        worker.removeEventListener('statechange', onStateChange);
        resolve(reg!);
      }
    });
  });
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
