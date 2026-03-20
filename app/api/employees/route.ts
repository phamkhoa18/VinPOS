import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/employees - Shop owner lists their employees
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== 'shop_owner' && user.role !== 'admin') return forbiddenResponse();

    await connectDB();

    // Find the shop owned by this user
    let shopId = user.shopId;
    if (user.role === 'shop_owner' && !shopId) {
      const shop = await Shop.findOne({ ownerId: user._id });
      shopId = shop?._id;
    }

    if (!shopId) return badRequestResponse('Không tìm thấy cửa hàng');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const query: Record<string, unknown> = {
      shopId,
      role: 'employee',
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await User.find(query).sort({ createdAt: -1 }).lean();

    return successResponse({
      employees: employees.map((e) => ({
        ...e,
        id: e._id.toString(),
        shopId: e.shopId?.toString(),
      })),
      total: employees.length,
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return errorResponse('Lỗi khi lấy danh sách nhân viên');
  }
}

// POST /api/employees - Shop owner creates employee
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'shop_owner' && currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();

    // Find the shop
    let shopId = currentUser.shopId;
    if (currentUser.role === 'shop_owner' && !shopId) {
      const shop = await Shop.findOne({ ownerId: currentUser._id });
      shopId = shop?._id;
    }

    if (!shopId) return badRequestResponse('Không tìm thấy cửa hàng');

    const data = await req.json();
    const { email, password, name, phone } = data;

    if (!email || !password || !name || !phone) {
      return badRequestResponse('Vui lòng nhập đầy đủ thông tin');
    }

    if (password.length < 6) {
      return badRequestResponse('Mật khẩu tối thiểu 6 ký tự');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return badRequestResponse('Email đã được sử dụng');
    }

    // Create employee
    const employee = await User.create({
      email,
      password,
      name,
      phone,
      role: 'employee',
      shopId,
      isActive: true,
    });

    return successResponse(employee.toJSON(), 201);
  } catch (error) {
    console.error('Create employee error:', error);
    const errMsg = (error as Error).message;
    if (errMsg.includes('duplicate key')) {
      return badRequestResponse('Email đã được sử dụng');
    }
    return errorResponse('Lỗi khi tạo nhân viên: ' + errMsg);
  }
}
