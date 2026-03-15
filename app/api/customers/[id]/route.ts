import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Customer from '@/lib/models/Customer';
import { getCurrentUser, unauthorizedResponse, successResponse, notFoundResponse, errorResponse } from '@/lib/auth';

// PUT /api/customers/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const data = await req.json();

    const customer = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!customer) return notFoundResponse('Khách hàng không tồn tại');

    return successResponse(customer.toJSON());
  } catch (error) {
    console.error('Update customer error:', error);
    return errorResponse('Lỗi khi cập nhật khách hàng');
  }
}

// DELETE /api/customers/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) return notFoundResponse('Khách hàng không tồn tại');

    return successResponse({ message: 'Đã xóa khách hàng' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return errorResponse('Lỗi khi xóa khách hàng');
  }
}
