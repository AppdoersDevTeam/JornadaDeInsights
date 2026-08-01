import type { AppNotification } from '@/lib/notifications';

type Translate = (key: string, fallback: string) => string;

const fill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
    template
  );

// Notification title/body are rendered from type + metadata rather than the
// raw stored strings, so system-generated notifications (admin alerts, new
// content) always match the reader's selected language instead of whatever
// language the cron job or admin happened to write in.
export function localizeNotification(
  notification: AppNotification,
  language: 'pt-BR' | 'en',
  t: Translate
): { title: string; body: string | null } {
  const metadata = (notification.metadata || {}) as Record<string, unknown>;

  switch (notification.type) {
    case 'new_ebook':
      return {
        title: fill(t('notifications.type.new_ebook.title', 'New eBook: {title}'), {
          title: notification.title,
        }),
        body: notification.body,
      };

    case 'new_curiosidade': {
      const titlePt = typeof metadata.titlePt === 'string' ? metadata.titlePt : null;
      const titleEn = typeof metadata.titleEn === 'string' ? metadata.titleEn : null;
      const localizedTitle =
        (language === 'en' ? titleEn || titlePt : titlePt || titleEn) || notification.title;
      return {
        title: fill(t('notifications.type.new_curiosidade.title', 'New post: {title}'), {
          title: localizedTitle,
        }),
        body: notification.body,
      };
    }

    case 'new_podcast_episode':
      return {
        title: fill(t('notifications.type.new_podcast_episode.title', 'New episode: {title}'), {
          title: notification.title,
        }),
        body: notification.body,
      };

    case 'admin_failed_emails':
      return {
        title: t('notifications.type.admin_failed_emails.title', 'Failed purchase emails'),
        body: fill(
          t(
            'notifications.type.admin_failed_emails.body',
            '{count} purchase email(s) failed to send in the last 24h.'
          ),
          { count: Number(metadata.count ?? 0) }
        ),
      };

    case 'admin_abandoned_carts':
      return {
        title: t('notifications.type.admin_abandoned_carts.title', 'Pending abandoned carts'),
        body: fill(
          t(
            'notifications.type.admin_abandoned_carts.body',
            '{count} abandoned cart follow-up(s) pending in the last 24h.'
          ),
          { count: Number(metadata.count ?? 0) }
        ),
      };

    case 'admin_webhook_lag':
      return {
        title: t('notifications.type.admin_webhook_lag.title', 'Stripe webhook lag'),
        body: fill(
          t(
            'notifications.type.admin_webhook_lag.body',
            'Last webhook processed at {lastWebhookAt}, more than 2h ago.'
          ),
          { lastWebhookAt: String(metadata.lastWebhookAt ?? '') }
        ),
      };

    case 'admin_traffic_spike':
      return {
        title: t('notifications.type.admin_traffic_spike.title', 'Traffic spike detected'),
        body: fill(
          t(
            'notifications.type.admin_traffic_spike.body',
            '{todayCount} page views today vs. a 7-day average of {weekAvg}.'
          ),
          {
            todayCount: Number(metadata.todayCount ?? 0),
            weekAvg: Number(metadata.weekAvg ?? 0).toFixed(1),
          }
        ),
      };

    default:
      return { title: notification.title, body: notification.body };
  }
}
