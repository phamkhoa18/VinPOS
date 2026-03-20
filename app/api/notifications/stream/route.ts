import { getCurrentUser } from '@/lib/auth';
import { notificationEmitter } from '@/lib/notification-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/notifications/stream - SSE endpoint for realtime notifications
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const shopId = (user.role === 'admin' ? 'admin' : user.shopId) as string;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial heartbeat
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Đã kết nối thông báo realtime' })}\n\n`));

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Subscribe to notifications for this shop
      const unsubscribe = notificationEmitter.subscribe(shopId, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      });

      // Also subscribe to 'all' channel for broadcast notifications
      const unsubAll = notificationEmitter.subscribe('all', (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      });

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        unsubAll();
      };

      // Store cleanup for when the connection is aborted
      (controller as any)._cleanup = cleanup;
    },
    cancel() {
      // Called when client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
