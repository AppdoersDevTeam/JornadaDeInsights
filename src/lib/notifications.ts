import { supabase, getSupabaseAccessToken } from '@/lib/supabase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export type NotificationType =
  | 'new_ebook'
  | 'new_curiosidade'
  | 'new_podcast_episode'
  | 'admin_failed_emails'
  | 'admin_abandoned_carts'
  | 'admin_webhook_lag'
  | 'admin_traffic_spike';

export interface AppNotification {
  id: string;
  type: NotificationType;
  audience: 'user' | 'admin';
  title: string;
  body: string | null;
  link: string | null;
  sourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

// Broadcasts a user-facing notification for newly published content.
// Relies on the "Admins can broadcast user notifications" RLS policy —
// only succeeds when the caller's session belongs to an allow-listed admin.
export const notifyNewContent = async (
  type: 'new_ebook' | 'new_curiosidade',
  options: { title: string; body?: string | null; link: string; sourceId: string }
): Promise<void> => {
  try {
    // Upsert + ignoreDuplicates: re-publishing/re-saving the same content
    // (matched by type+sourceId) is a harmless no-op, not a duplicate broadcast.
    const { error } = await supabase.from('notification_events').upsert(
      {
        type,
        audience: 'user',
        title: options.title,
        body: options.body ?? null,
        link: options.link,
        source_id: options.sourceId,
      },
      { onConflict: 'type,source_id', ignoreDuplicates: true }
    );
    if (error) throw error;
  } catch (error) {
    // Non-fatal: publishing the content itself already succeeded.
    console.error('Error broadcasting notification:', error);
  }
};

const authorizedFetch = async (path: string, init?: RequestInit) => {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Not authenticated');

  return fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
};

export const listNotifications = async (): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> => {
  const response = await authorizedFetch('/api/notifications');
  if (!response.ok) throw new Error('Failed to load notifications');
  return response.json();
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const response = await authorizedFetch('/api/notifications-mark-read', {
    method: 'POST',
    body: JSON.stringify({ notificationId }),
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const response = await authorizedFetch('/api/notifications-mark-read', {
    method: 'POST',
    body: JSON.stringify({ all: true }),
  });
  if (!response.ok) throw new Error('Failed to mark notifications as read');
};
