import webpush from 'web-push';
import { logger } from './logger.js';
import { getAllowedAdmins } from './admin-auth.js';

let vapidConfigured = false;

const configureVapid = () => {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

// Sends a push notification to every subscribed device for the given audience,
// skipping users who opted out of this notification `type`. Best-effort: a push
// failure never throws — it's a follow-up side effect of notification creation,
// not something that should roll back or block it.
export const sendPushToAudience = async (supabaseAdmin, { audience, type, title, body, link }) => {
  if (!configureVapid()) {
    logger.warn('push_send_skipped_missing_vapid_config', { audience, type });
    return;
  }

  try {
    const [subsRes, prefsRes] = await Promise.all([
      supabaseAdmin
        .from('push_subscriptions')
        .select('id, user_id, user_email, endpoint, p256dh, auth_key'),
      supabaseAdmin
        .from('notification_preferences')
        .select('user_id')
        .eq('type', type)
        .eq('enabled', false),
    ]);

    if (subsRes.error) throw subsRes.error;
    if (prefsRes.error) throw prefsRes.error;

    const optedOutUserIds = new Set((prefsRes.data || []).map((row) => row.user_id));
    const allowedAdmins = new Set(getAllowedAdmins());

    const subscriptions = (subsRes.data || []).filter((sub) => {
      if (optedOutUserIds.has(sub.user_id)) return false;
      if (audience === 'admin') return allowedAdmins.has((sub.user_email || '').toLowerCase());
      return true;
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, link });
    const staleIds = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            payload
          );
        } catch (error) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id);
          } else {
            logger.warn('push_send_failed', { audience, type, statusCode: statusCode || null });
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds);
    }
  } catch (error) {
    logger.error('push_send_to_audience_failed', {
      audience,
      type,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
  }
};
