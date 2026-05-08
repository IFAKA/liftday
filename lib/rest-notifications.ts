'use client';

const REST_COMPLETE_TAG = 'liftday-rest-complete';
const SERVICE_WORKER_READY_TIMEOUT_MS = 750;

type RestNotificationPermission = NotificationPermission | 'unsupported';

function supportsNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  }
}

export async function requestRestNotificationPermission(): Promise<RestNotificationPermission> {
  if (!supportsNotifications()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showRestCompleteNotification(nextExerciseName?: string | null): Promise<boolean> {
  if (!supportsNotifications() || Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body: nextExerciseName ? `Next: ${nextExerciseName}` : 'Time to get back to work.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: REST_COMPLETE_TAG,
    requireInteraction: false,
    silent: false,
  };

  const registration = await getReadyServiceWorker();
  if (registration) {
    await registration.showNotification('LiftDay Rest Complete', options);
    return true;
  }

  try {
    new Notification('LiftDay Rest Complete', options);
    return true;
  } catch {
    return false;
  }
}
