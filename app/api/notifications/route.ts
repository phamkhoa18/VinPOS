import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Notification from '@/lib/models/Notification';
import { getCurrentUser, unauthorizedResponse, successResponse, errorResponse, badRequestResponse } from '@/lib/auth';

// GET /api/notifications - Get notifications for the user's shop
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const unreadOnly = searchParams.get('unread') === 'true';

    const shopId = user.role === 'admin' ? undefined : user.shopId;

    const query: Record<string, unknown> = {};
    if (shopId) query.shopId = shopId;
    if (unreadOnly) query.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ ...(shopId ? { shopId } : {}), isRead: false }),
    ]);

    return successResponse({
      notifications: notifications.map((n) => ({
        ...n,
        id: n._id.toString(),
        shopId: n.shopId?.toString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse('Lỗi khi lấy thông báo');
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const data = await req.json();
    const shopId = user.role === 'admin' ? undefined : user.shopId;

    if (data.markAllRead) {
      // Mark all as read
      const query: Record<string, unknown> = { isRead: false };
      if (shopId) query.shopId = shopId;
      await Notification.updateMany(query, { isRead: true });
      return successResponse({ message: 'Đã đánh dấu tất cả đã đọc' });
    }

    if (data.notificationId) {
      await Notification.findByIdAndUpdate(data.notificationId, { isRead: true });
      return successResponse({ message: 'Đã đánh dấu đã đọc' });
    }

    return badRequestResponse('Thiếu thông tin');
  } catch (error) {
    console.error('Update notification error:', error);
    return errorResponse('Lỗi khi cập nhật thông báo');
  }
}
