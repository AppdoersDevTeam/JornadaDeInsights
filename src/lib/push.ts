import { authorizedFetch } from '@/lib/notifications';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

export function getNotificationPermission(): NotificationPermission | null {
  return typeof Notification !== 'undefined' ? Notification.permission : null;
}

// Web Push application server keys arrive base64url-encoded; PushManager wants a raw Uint8Array.
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    throw new Error('Push notifications are not supported on this device.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const rawKeys = subscription.toJSON().keys;
  if (!rawKeys?.p256dh || !rawKeys?.auth) {
    throw new Error('Push subscription is missing encryption keys.');
  }

  const response = await authorizedFetch('/api/push-subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { p256dh: rawKeys.p256dh, auth: rawKeys.auth },
      userAgent: navigator.userAgent,
    }),
  });
  if (!response.ok) throw new Error('Failed to save push subscription');
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const response = await authorizedFetch('/api/push-unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
  if (!response.ok) throw new Error('Failed to remove push subscription');
}
