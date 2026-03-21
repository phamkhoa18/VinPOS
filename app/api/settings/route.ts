import { getCurrentUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import Shop from '@/lib/models/Shop';

// GET /api/settings - Lấy cấu hình cửa hàng (receipt settings + shop info)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();

    const shop = await Shop.findById(user.shopId);
    if (!shop) return errorResponse('Không tìm thấy cửa hàng', 404);

    return successResponse({
      shop: {
        id: shop._id.toString(),
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        email: shop.email || '',
        logo: shop.logo || '',
        taxCode: shop.taxCode || '',
      },
      receiptSettings: shop.receiptSettings || {},
    });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return errorResponse('Lỗi tải cấu hình');
  }
}

// PUT /api/settings - Cập nhật cấu hình cửa hàng
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== 'shop_owner' && user.role !== 'admin') {
      return forbiddenResponse('Chỉ chủ cửa hàng mới có quyền thay đổi cấu hình');
    }

    await connectDB();

    const body = await request.json();
    const { receiptSettings, shopInfo } = body;

    const shop = await Shop.findById(user.shopId);
    if (!shop) return errorResponse('Không tìm thấy cửa hàng', 404);

    // Update shop info if provided
    if (shopInfo) {
      if (shopInfo.name) shop.name = shopInfo.name;
      if (shopInfo.address !== undefined) shop.address = shopInfo.address;
      if (shopInfo.phone !== undefined) shop.phone = shopInfo.phone;
      if (shopInfo.email !== undefined) shop.email = shopInfo.email;
      if (shopInfo.taxCode !== undefined) shop.taxCode = shopInfo.taxCode;
    }

    // Update receipt settings if provided
    if (receiptSettings) {
      shop.receiptSettings = { ...(shop.receiptSettings || {}), ...receiptSettings };
      shop.markModified('receiptSettings');
    }

    await shop.save();

    return successResponse({
      message: 'Cập nhật cấu hình thành công',
      shop: {
        id: shop._id.toString(),
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        email: shop.email || '',
        logo: shop.logo || '',
        taxCode: shop.taxCode || '',
      },
      receiptSettings: shop.receiptSettings || {},
    });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return errorResponse('Lỗi cập nhật cấu hình');
  }
}
