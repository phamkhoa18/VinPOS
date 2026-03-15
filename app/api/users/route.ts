import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth';

// GET /api/users - Admin only
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    return successResponse({
      users: users.map((u) => ({ ...u, id: u._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('Lỗi khi lấy danh sách người dùng');
  }
}

// POST /api/users - Admin creates user
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const data = await req.json();
    const user = await User.create(data);
    return successResponse(user.toJSON(), 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse('Lỗi khi tạo người dùng');
  }
}
