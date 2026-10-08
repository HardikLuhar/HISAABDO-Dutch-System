import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  // Android / Mobile Push Notifications
  isPushSupported: boolean;
  pushPermission: NotificationPermission;
  isPushSubscribed: boolean;
  requestPushPermission: () => Promise<boolean>;
  sendTestPush: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Push Notification state
  const isPushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef<boolean>(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Request Android / System Notification Permission & register Push Token
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported) {
      showToast('Notifications are not supported by this browser', 'error');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        showToast('Notification permission was not granted', 'info');
        return false;
      }

      // Register Push Subscription with Service Worker
      const reg = await navigator.serviceWorker.ready;
      const vapidPublicKey = await api.getVapidPublicKey();
      
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      await api.subscribePush(subscription.toJSON());
      setIsPushSubscribed(true);
      showToast('Android notifications enabled! 🔔', 'success');
      return true;
    } catch (err: any) {
      console.error('Failed to enable push notifications:', err);
      showToast(err.message || 'Failed to enable notifications', 'error');
      return false;
    }
  }, [isPushSupported, showToast]);

  // Check existing push subscription on load
  useEffect(() => {
    if (!isPushSupported || !user) return;

    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsPushSubscribed(true);
          // Sync with server in background
          await api.subscribePush(sub.toJSON()).catch(() => {});
        } else if (Notification.permission === 'granted') {
          // Auto-subscribe if user already granted permission
          const vapidPublicKey = await api.getVapidPublicKey();
          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
          await api.subscribePush(newSub.toJSON());
          setIsPushSubscribed(true);
        }
      } catch (err) {
        console.warn('Push subscription check failed:', err);
      }
    });
  }, [isPushSupported, user]);

  // Send a test push notification to verify phone tray delivery
  const sendTestPush = useCallback(async () => {
    try {
      if (Notification.permission !== 'granted') {
        const granted = await requestPushPermission();
        if (!granted) return;
      }
      showToast('Sending test notification to your phone...', 'info');
      await api.sendTestPush();
    } catch (err: any) {
      showToast(err.message || 'Failed to send test push', 'error');
    }
  }, [requestPushPermission, showToast]);

  // Fetch notifications & trigger system notification for newly arrived items
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);

      // Check for new notifications to show in Android system tray
      if (initialLoadDone.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const newUnread = res.notifications.filter(n => !n.read && !knownNotificationIds.current.has(n.id));
        for (const notif of newUnread) {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(notif.title || 'Hisaabdo', {
                body: notif.message,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                data: { url: notif.groupId ? `/?group=${notif.groupId}` : '/' }
              } as any);
            });
          }
        }
      }

      // Mark all current IDs as known
      res.notifications.forEach(n => knownNotificationIds.current.add(n.id));
      initialLoadDone.current = true;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 10000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        toasts,
        showToast,
        removeToast,
        isPushSupported,
        pushPermission,
        isPushSubscribed,
        requestPushPermission,
        sendTestPush
      }}
    >
      {children}

      {/* Global Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200'
                : toast.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950 dark:border-sky-900 dark:text-sky-200'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-70 hover:opacity-100 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
