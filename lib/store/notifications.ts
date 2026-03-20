import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'new_order' | 'low_stock' | 'order_cancelled' | 'system' | 'info';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isConnected: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  setConnected: (connected: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isConnected: false,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setConnected: (connected) => set({ isConnected: connected }),

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    }));
  },

  fetchNotifications: async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        set({
          notifications: data.data.notifications,
          unreadCount: data.data.unreadCount,
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },
}));
