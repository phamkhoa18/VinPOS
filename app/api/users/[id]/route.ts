import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, successResponse, notFoundResponse, errorResponse } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const { id } = await params;
    const data = await req.json();
    delete data.password; // Don't allow password change from here

    const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!user) return notFoundResponse('Người dùng không tồn tại');

    return successResponse(user.toJSON());
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Lỗi khi cập nhật người dùng');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const { id } = await params;
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!user) return notFoundResponse('Người dùng không tồn tại');

    return successResponse({ message: 'Đã vô hiệu hóa người dùng' });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Lỗi khi xóa người dùng');
  }
}
