import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/notifications';
import { localizeNotification } from '@/lib/notification-i18n';

const POLL_INTERVAL_MS = 60_000;

interface NotificationBellProps {
  // Icon/text color classes for the trigger button, to match the header it's mounted in.
  triggerClassName?: string;
}

export function NotificationBell({ triggerClassName }: NotificationBellProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await listNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refresh]);

  if (!user) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) refresh();
  };

  const handleItemClick = async (notification: AppNotification) => {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('notifications.bellLabel', 'Notifications')}
          className={
            triggerClassName ??
            'relative p-1.5 xl:p-2 rounded-full hover:bg-background/10 transition-colors flex-shrink-0'
          }
        >
          <Bell className="h-5 w-5 xl:h-6 xl:w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">
            {t('notifications.title', 'Notifications')}
          </span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={handleMarkAllRead}>
              {t('notifications.markAllRead', 'Mark all read')}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground text-center">
              {t('notifications.empty', 'No notifications yet')}
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => {
                const localized = localizeNotification(notification, language, t);
                return (
                  <li key={notification.id} className="border-b last:border-b-0">
                    <Link
                      to={notification.link || '#'}
                      onClick={() => handleItemClick(notification)}
                      className={`flex flex-col gap-0.5 px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                        notification.read ? '' : 'bg-primary/5'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-secondary flex-shrink-0" />
                        )}
                        {localized.title}
                      </span>
                      {localized.body && (
                        <span className="text-muted-foreground text-xs line-clamp-2">
                          {localized.body}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
