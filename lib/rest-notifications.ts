'use client';

const REST_COMPLETE_TAG = 'liftday-rest-complete';

export class RestNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestNotificationError';
  }
}

function requireNotificationApi() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new RestNotificationError('Notifications are required for rest timers.');
  }
}

async function requireReadyServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new RestNotificationError('Service worker notifications are required for rest timers.');
  }

  return navigator.serviceWorker.ready;
}

export async function requireRestNotificationPermission(): Promise<void> {
  requireNotificationApi();

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;

  if (permission !== 'granted') {
    throw new RestNotificationError('Notification permission is required for rest timers.');
  }

  await requireReadyServiceWorker();
}

export async function showRestCompleteNotification(nextExerciseName?: string | null): Promise<void> {
  await requireRestNotificationPermission();

  const options: NotificationOptions = {
    body: nextExerciseName ? `Next: ${nextExerciseName}` : 'Time to get back to work.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: REST_COMPLETE_TAG,
    requireInteraction: false,
    silent: false,
  };

  const registration = await requireReadyServiceWorker();
  await registration.showNotification('LiftDay Rest Complete', options);
}
