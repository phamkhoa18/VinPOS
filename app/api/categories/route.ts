import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import { getCurrentUser, unauthorizedResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/categories
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const query: Record<string, unknown> = { isActive: true };
    if (user.role !== 'admin') {
      query.shopId = user.shopId;
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();
    
    // Get product count per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ categoryId: cat._id, isActive: true });
        return {
          ...cat,
          id: cat._id.toString(),
          shopId: cat.shopId?.toString(),
          productCount,
        };
      })
    );

    return successResponse(categoriesWithCount);
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse('Lỗi khi lấy danh mục');
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const data = await req.json();

    if (!data.name) return badRequestResponse('Tên danh mục là bắt buộc');

    const shopId = user.role === 'admin' ? data.shopId : user.shopId;
    if (!shopId) return badRequestResponse('Thiếu thông tin cửa hàng');

    const category = await Category.create({ ...data, shopId });
    return successResponse({ ...category.toJSON(), productCount: 0 }, 201);
  } catch (error: unknown) {
    console.error('Create category error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return badRequestResponse('Tên danh mục đã tồn tại');
    }
    return errorResponse('Lỗi khi tạo danh mục');
  }
}
