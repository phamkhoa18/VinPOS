import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, successResponse, notFoundResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// PUT /api/employees/[id] - Update employee
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'shop_owner' && currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const { id } = await params;
    const data = await req.json();

    // Verify the employee belongs to this shop
    let shopId = currentUser.shopId;
    if (currentUser.role === 'shop_owner' && !shopId) {
      const shop = await Shop.findOne({ ownerId: currentUser._id });
      shopId = shop?._id;
    }

    const employee = await User.findById(id);
    if (!employee) return notFoundResponse('Nhân viên không tồn tại');
    if (employee.role !== 'employee') return badRequestResponse('Người dùng này không phải nhân viên');
    if (employee.shopId?.toString() !== shopId?.toString()) return forbiddenResponse('Nhân viên không thuộc cửa hàng của bạn');

    // Update allowed fields
    const allowedFields = ['name', 'phone', 'email', 'isActive'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Handle password change separately
    if (data.password && data.password.length >= 6) {
      const emp = await User.findById(id).select('+password');
      if (emp) {
        emp.password = data.password;
        Object.assign(emp, updateData);
        await emp.save();
        return successResponse(emp.toJSON());
      }
    }

    const updated = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updated) return notFoundResponse('Nhân viên không tồn tại');

    return successResponse(updated.toJSON());
  } catch (error) {
    console.error('Update employee error:', error);
    return errorResponse('Lỗi khi cập nhật nhân viên');
  }
}

// DELETE /api/employees/[id] - Deactivate employee
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedResponse();
    if (currentUser.role !== 'shop_owner' && currentUser.role !== 'admin') return forbiddenResponse();

    await connectDB();
    const { id } = await params;

    // Verify the employee belongs to this shop
    let shopId = currentUser.shopId;
    if (currentUser.role === 'shop_owner' && !shopId) {
      const shop = await Shop.findOne({ ownerId: currentUser._id });
      shopId = shop?._id;
    }

    const employee = await User.findById(id);
    if (!employee) return notFoundResponse('Nhân viên không tồn tại');
    if (employee.role !== 'employee') return badRequestResponse('Người dùng này không phải nhân viên');
    if (employee.shopId?.toString() !== shopId?.toString()) return forbiddenResponse('Nhân viên không thuộc cửa hàng của bạn');

    // Soft delete
    employee.isActive = false;
    await employee.save();

    return successResponse({ message: 'Đã vô hiệu hóa nhân viên' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return errorResponse('Lỗi khi xóa nhân viên');
  }
}
