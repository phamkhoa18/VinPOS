import { getCurrentUser, unauthorizedResponse, successResponse } from '@/lib/auth';
import Shop from '@/lib/models/Shop';
import connectDB from '@/lib/db/mongodb';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  await connectDB();
  let shopId: string | undefined;
  if (user.role !== 'admin') {
    const shop = await Shop.findOne({
      $or: [{ ownerId: user._id }, { _id: user.shopId }],
    });
    shopId = shop?._id?.toString();
  }

  return successResponse({ user: user.toJSON(), shopId });
}
