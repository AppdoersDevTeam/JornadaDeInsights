import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/context/language-context';
import {
  ADMIN_NOTIFICATION_TYPES,
  USER_NOTIFICATION_TYPES,
  getNotificationPreferences,
  updateNotificationPreference,
  type NotificationType,
} from '@/lib/notifications';

interface NotificationPreferencesProps {
  isAdmin: boolean;
}

const USER_TYPE_LABEL_KEYS: Record<string, string> = {
  new_ebook: 'notifications.settings.newEbook',
  new_curiosidade: 'notifications.settings.newCuriosidade',
  new_podcast_episode: 'notifications.settings.newPodcastEpisode',
};

const ADMIN_TYPE_LABEL_KEYS: Record<string, string> = {
  admin_failed_emails: 'notifications.settings.adminFailedEmails',
  admin_abandoned_carts: 'notifications.settings.adminAbandonedCarts',
  admin_webhook_lag: 'notifications.settings.adminWebhookLag',
  admin_traffic_spike: 'notifications.settings.adminTrafficSpike',
};

export function NotificationPreferences({ isAdmin }: NotificationPreferencesProps) {
  const { t } = useLanguage();
  const types = isAdmin
    ? [...USER_NOTIFICATION_TYPES, ...ADMIN_NOTIFICATION_TYPES]
    : USER_NOTIFICATION_TYPES;

  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getNotificationPreferences(types);
        if (!cancelled) setPreferences(prefs);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast.error(t('notifications.settings.loadError', 'Could not load your preferences.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleToggle = async (type: NotificationType, next: boolean) => {
    const previous = preferences[type];
    setPreferences((prev) => ({ ...prev, [type]: next }));
    setSavingType(type);
    try {
      await updateNotificationPreference(type, next);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast.error(t('notifications.settings.updateError', 'Could not save the preference.'));
      setPreferences((prev) => ({ ...prev, [type]: previous }));
    } finally {
      setSavingType(null);
    }
  };

  const renderToggle = (type: NotificationType, labelKey: string) => (
    <div key={type} className="flex items-center justify-between py-2">
      <Label htmlFor={`notif-${type}`} className="font-normal">
        {t(labelKey, type)}
      </Label>
      <Switch
        id={`notif-${type}`}
        checked={preferences[type] ?? true}
        disabled={loading || savingType === type}
        onCheckedChange={(checked) => handleToggle(type, checked)}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notifications.settings.title', 'Notifications')}</CardTitle>
        <CardDescription>
          {t('notifications.settings.desc', 'Choose which notifications you want to receive.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {USER_NOTIFICATION_TYPES.map((type) => renderToggle(type, USER_TYPE_LABEL_KEYS[type]))}
        </div>
        {isAdmin && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('notifications.settings.adminSectionTitle', 'Admin alerts')}
            </h3>
            <div className="divide-y">
              {ADMIN_NOTIFICATION_TYPES.map((type) => renderToggle(type, ADMIN_TYPE_LABEL_KEYS[type]))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
