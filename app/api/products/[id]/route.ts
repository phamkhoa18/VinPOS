import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Product from '@/lib/models/Product';
import { getCurrentUser, unauthorizedResponse, successResponse, notFoundResponse, errorResponse } from '@/lib/auth';

// GET /api/products/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id).populate('categoryId', 'name');
    if (!product) return notFoundResponse('Sản phẩm không tồn tại');

    return successResponse(product.toJSON());
  } catch (error) {
    console.error('Get product error:', error);
    return errorResponse('Lỗi khi lấy sản phẩm');
  }
}

// PUT /api/products/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const data = await req.json();

    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!product) return notFoundResponse('Sản phẩm không tồn tại');
    return successResponse(product.toJSON());
  } catch (error) {
    console.error('Update product error:', error);
    return errorResponse('Lỗi khi cập nhật sản phẩm');
  }
}

// DELETE /api/products/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    
    // Soft delete
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) return notFoundResponse('Sản phẩm không tồn tại');

    return successResponse({ message: 'Đã xóa sản phẩm' });
  } catch (error) {
    console.error('Delete product error:', error);
    return errorResponse('Lỗi khi xóa sản phẩm');
  }
}
