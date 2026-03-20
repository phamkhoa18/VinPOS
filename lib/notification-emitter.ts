// Simple in-memory event emitter for SSE notifications
// Works across API routes within the same Next.js server process

type Listener = (data: unknown) => void;

class NotificationEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(shopId: string, listener: Listener) {
    if (!this.listeners.has(shopId)) {
      this.listeners.set(shopId, new Set());
    }
    this.listeners.get(shopId)!.add(listener);
    return () => {
      this.listeners.get(shopId)?.delete(listener);
      if (this.listeners.get(shopId)?.size === 0) {
        this.listeners.delete(shopId);
      }
    };
  }

  emit(shopId: string, data: unknown) {
    this.listeners.get(shopId)?.forEach((listener) => listener(data));
  }
}

// Singleton — persists across hot reloads in development
const globalForEmitter = globalThis as unknown as { notificationEmitter?: NotificationEmitter };
export const notificationEmitter = globalForEmitter.notificationEmitter ?? new NotificationEmitter();
globalForEmitter.notificationEmitter = notificationEmitter;
