import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Category from '@/lib/models/Category';
import { getCurrentUser, unauthorizedResponse, successResponse, notFoundResponse, errorResponse } from '@/lib/auth';

// PUT /api/categories/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const data = await req.json();

    const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!category) return notFoundResponse('Danh mục không tồn tại');

    return successResponse(category.toJSON());
  } catch (error) {
    console.error('Update category error:', error);
    return errorResponse('Lỗi khi cập nhật danh mục');
  }
}

// DELETE /api/categories/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!category) return notFoundResponse('Danh mục không tồn tại');

    return successResponse({ message: 'Đã xóa danh mục' });
  } catch (error) {
    console.error('Delete category error:', error);
    return errorResponse('Lỗi khi xóa danh mục');
  }
}
