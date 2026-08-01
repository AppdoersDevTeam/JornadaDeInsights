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
import {
  getExistingPushSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import { isIos, isStandalonePwa } from '@/lib/pwa';

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

  const pushSupported = isPushSupported();
  const iosNeedsInstall = isIos() && !isStandalonePwa();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;
    (async () => {
      try {
        const subscription = await getExistingPushSubscription();
        setPushEnabled(Boolean(subscription) && getNotificationPermission() === 'granted');
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePushToggle = async (next: boolean) => {
    setPushBusy(true);
    try {
      if (next) {
        await subscribeToPush();
        setPushEnabled(true);
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Error updating push subscription:', error);
      toast.error(
        next
          ? t('notifications.push.enableError', 'Could not enable push notifications.')
          : t('notifications.push.disableError', 'Could not disable push notifications.')
      );
    } finally {
      setPushBusy(false);
    }
  };

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
        <div className="mb-4 pb-4 border-b">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="push-master-toggle" className="font-medium">
                {t('notifications.push.title', 'Push notifications on this device')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  'notifications.push.desc',
                  'Get notified even when the app is closed.'
                )}
              </p>
            </div>
            <Switch
              id="push-master-toggle"
              checked={pushEnabled}
              disabled={!pushSupported || iosNeedsInstall || pushBusy}
              onCheckedChange={handlePushToggle}
            />
          </div>
          {!pushSupported && !iosNeedsInstall && (
            <p className="text-sm text-muted-foreground">
              {t('notifications.push.unsupported', 'Push notifications are not supported in this browser.')}
            </p>
          )}
          {iosNeedsInstall && (
            <p className="text-sm text-muted-foreground">
              {t(
                'notifications.push.iosInstallHint',
                'On iPhone, add this app to your Home Screen first (Share → Add to Home Screen), then come back here to enable notifications.'
              )}
            </p>
          )}
        </div>
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
