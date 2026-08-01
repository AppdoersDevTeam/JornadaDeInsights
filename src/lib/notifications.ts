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

export const USER_NOTIFICATION_TYPES: NotificationType[] = [
  'new_ebook',
  'new_curiosidade',
  'new_podcast_episode',
];

export const ADMIN_NOTIFICATION_TYPES: NotificationType[] = [
  'admin_failed_emails',
  'admin_abandoned_carts',
  'admin_webhook_lag',
  'admin_traffic_spike',
];

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
  options: {
    title: string;
    body?: string | null;
    link: string;
    sourceId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  try {
    // Upsert + ignoreDuplicates: re-publishing/re-saving the same content
    // (matched by type+sourceId) is a harmless no-op, not a duplicate broadcast.
    const { data, error } = await supabase
      .from('notification_events')
      .upsert(
        {
          type,
          audience: 'user',
          title: options.title,
          body: options.body ?? null,
          link: options.link,
          source_id: options.sourceId,
          metadata: options.metadata ?? null,
        },
        { onConflict: 'type,source_id', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();
    if (error) throw error;

    // The browser can't hold the VAPID private key, so ask the server to send
    // the push for the row we just created. Best-effort — a re-publish that hit
    // the ignoreDuplicates no-op above returns no row, so there's nothing to push.
    if (data?.id) {
      void authorizedFetch('/api/notifications-broadcast-push', {
        method: 'POST',
        body: JSON.stringify({ notificationId: data.id }),
      }).catch((pushError) => {
        console.error('Error triggering push broadcast:', pushError);
      });
    }
  } catch (error) {
    // Non-fatal: publishing the content itself already succeeded.
    console.error('Error broadcasting notification:', error);
  }
};

export const authorizedFetch = async (path: string, init?: RequestInit) => {
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

// Preferences are read/written directly against Supabase (RLS restricts each
// user to their own row), so no serverless function round-trip is needed.
export const getNotificationPreferences = async (
  types: NotificationType[]
): Promise<Record<string, boolean>> => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('type, enabled')
    .in('type', types);
  if (error) throw error;

  // Missing rows default to enabled (opt-out model).
  const preferences: Record<string, boolean> = {};
  types.forEach((type) => {
    preferences[type] = true;
  });
  (data || []).forEach((row) => {
    preferences[row.type] = row.enabled;
  });
  return preferences;
};

export const updateNotificationPreference = async (
  type: NotificationType,
  enabled: boolean
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('notification_preferences').upsert(
    { user_id: user.id, type, enabled, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,type' }
  );
  if (error) throw error;
};
