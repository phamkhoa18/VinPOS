import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Product from '@/lib/models/Product';
import { getCurrentUser, unauthorizedResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/products - List products
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query: Record<string, unknown> = {};
    
    // For admin: can see all, for shop_owner: only their shop
    if (user.role !== 'admin') {
      query.shopId = user.shopId;
    } else if (searchParams.get('shopId')) {
      query.shopId = searchParams.get('shopId');
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    const onlyActive = searchParams.get('active');
    if (onlyActive === 'true') {
      query.isActive = true;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return successResponse({
      products: products.map((p) => ({
        ...p,
        id: p._id.toString(),
        categoryId: typeof p.categoryId === 'object' && p.categoryId !== null ? (p.categoryId as Record<string, unknown>)._id?.toString() : p.categoryId,
        category: typeof p.categoryId === 'object' && p.categoryId !== null ? p.categoryId : undefined,
        shopId: p.shopId?.toString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse('Lỗi khi lấy danh sách sản phẩm');
  }
}

// POST /api/products - Create product
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();
    if (user.role === 'employee') return unauthorizedResponse('Không có quyền thêm sản phẩm');

    await connectDB();
    const data = await req.json();

    const shopId = user.role === 'admin' ? data.shopId : user.shopId;
    if (!shopId) return badRequestResponse('Thiếu thông tin cửa hàng');

    const product = await Product.create({ ...data, shopId });
    return successResponse(product.toJSON(), 201);
  } catch (error: unknown) {
    console.error('Create product error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return badRequestResponse('Mã SKU đã tồn tại');
    }
    return errorResponse('Lỗi khi tạo sản phẩm');
  }
}
