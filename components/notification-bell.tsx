'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, Check, CheckCheck, ShoppingCart, AlertTriangle,
  XCircle, Info, Megaphone, X, Wifi, WifiOff
} from 'lucide-react';
import { useNotificationStore, type Notification } from '@/lib/store/notifications';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  new_order: {
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  low_stock: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  order_cancelled: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  system: {
    icon: <Megaphone className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
  },
};

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const config = typeConfig[notification.type] || typeConfig.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50/50 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function NotificationBell() {
  const {
    notifications, unreadCount, isOpen, isConnected,
    toggleOpen, setOpen, fetchNotifications, markAsRead, markAllAsRead, addNotification, setConnected
  } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // SSE connection
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/notifications/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          setConnected(true);
          return;
        }
        // It's a new notification
        if (data.id && data.title) {
          addNotification(data);
          // Play notification sound
          playNotificationSound();
          // Show browser notification if permission granted
          showBrowserNotification(data.title, data.message);
        }
      } catch {
        // ignore parse errors (heartbeat)
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Auto-reconnect after 5s
      setTimeout(() => {
        connectSSE();
      }, 5000);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [setConnected, addNotification]);

  useEffect(() => {
    const cleanup = connectSSE();
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return cleanup;
  }, [connectSSE]);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, setOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Thông báo"
      >
        {unreadCount > 0 ? (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
          >
            <BellRing className="w-5 h-5 text-blue-600" />
          </motion.div>
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200/80 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Connection status */}
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? 'Live' : 'Offline'}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-100/50 transition-colors"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => {
                    fetchNotifications();
                    setOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium w-full text-center"
                >
                  Tải lại thông báo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19teleUYXZlIGZvcm1hdAAQAQABAAFRAAAiTQAAAgAQACAAZGF0YQ==');
    // Use a simple beep
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore audio errors
  }
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo/VinPOS_logo.png',
      badge: '/logo/VinPOS_logo.png',
    });
  }
}
