import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Helper: wait for a ServiceWorker in installing/waiting state to become active.
function waitForActive(
  reg: ServiceWorkerRegistration,
  worker: ServiceWorker,
  timeoutMs: number,
): Promise<ServiceWorkerRegistration | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    worker.addEventListener('statechange', function onStateChange() {
      if (worker.state === 'activated' || reg.active) {
        clearTimeout(timer);
        worker.removeEventListener('statechange', onStateChange);
        resolve(reg);
      }
    });
  });
}

// Obtains an active ServiceWorkerRegistration without relying on
// navigator.serviceWorker.ready, which can hang indefinitely on mobile OSes
// that aggressively kill background processes (MagicOS, MIUI, ColorOS …).
//
// Strategy:
//  1. getRegistrations() (handles any scope mismatch; returns all for origin).
//  2. Registration with active SW → return immediately (fast path).
//  3. Registration with installing/waiting SW → watch statechange.
//  4. Zombie registration (all workers null, OS killed process) →
//     unregister() + fresh register('/sw.js') → guarantees a new installing
//     worker → watch statechange. (idempotent re-register won't trigger this
//     in Chrome because the script bytes haven't changed, hence we must
//     fully unregister first to force a new install cycle.)
//  5. No registration at all (dev mode or first visit) → register('/sw.js').
async function getSwRegistration(timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  let regs: ReadonlyArray<ServiceWorkerRegistration> = [];
  try {
    regs = await navigator.serviceWorker.getRegistrations();
  } catch {
    return null;
  }

  // Step 2: fast path — find a registration with an already-active worker
  const activeReg = regs.find((r) => r.active);
  if (activeReg) return activeReg;

  // Step 3: find a registration where the SW is mid-install or waiting
  const pendingReg = regs.find((r) => r.installing ?? r.waiting);
  if (pendingReg) {
    const worker = pendingReg.installing ?? pendingReg.waiting!;
    return waitForActive(pendingReg, worker, timeoutMs);
  }

  // Step 4 & 5: either a zombie registration or no registration at all.
  // Unregister any zombies first so register() always starts a fresh install.
  try {
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // Best-effort; proceed anyway.
  }

  let freshReg: ServiceWorkerRegistration;
  try {
    freshReg = await navigator.serviceWorker.register('/sw.js');
  } catch {
    // SW disabled (dev mode) or script inaccessible.
    return null;
  }

  if (freshReg.active) return freshReg; // activated from cache instantly

  const freshWorker = freshReg.installing ?? freshReg.waiting;
  if (!freshWorker) return null; // browser refused to install

  return waitForActive(freshReg, freshWorker, timeoutMs);
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
      return {
        subscription: null,
        error: process.env.NODE_ENV === 'development'
          ? 'Service worker disabilitato in sviluppo. Usa una build di produzione per testare le notifiche push.'
          : 'Impossibile avviare il service worker. Chiudi l\'app completamente, riaprila e riprova.',
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
