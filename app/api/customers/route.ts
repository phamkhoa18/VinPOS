import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Customer from '@/lib/models/Customer';
import { getCurrentUser, unauthorizedResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/customers
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      query.shopId = user.shopId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    return successResponse({
      customers: customers.map((c) => ({
        ...c,
        id: c._id.toString(),
        shopId: c.shopId?.toString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return errorResponse('Lỗi khi lấy khách hàng');
  }
}

// POST /api/customers
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const data = await req.json();

    if (!data.name || !data.phone) return badRequestResponse('Tên và SĐT là bắt buộc');

    const shopId = user.role === 'admin' ? data.shopId : user.shopId;
    if (!shopId) return badRequestResponse('Thiếu thông tin cửa hàng');

    const customer = await Customer.create({ ...data, shopId });
    return successResponse(customer.toJSON(), 201);
  } catch (error: unknown) {
    console.error('Create customer error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return badRequestResponse('Số điện thoại đã tồn tại');
    }
    return errorResponse('Lỗi khi tạo khách hàng');
  }
}
