import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import InventoryLog from '@/lib/models/InventoryLog';
import { getCurrentUser, unauthorizedResponse, successResponse, notFoundResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id)
      .populate('customerId', 'name phone email')
      .populate('createdBy', 'name');

    if (!order) return notFoundResponse('Đơn hàng không tồn tại');
    return successResponse(order.toJSON());
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse('Lỗi khi lấy đơn hàng');
  }
}

// PUT /api/orders/[id] - Update order status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { id } = await params;
    const { status } = await req.json();

    const order = await Order.findById(id);
    if (!order) return notFoundResponse('Đơn hàng không tồn tại');

    // If cancelling, return stock
    if (status === 'cancelled' && order.status === 'completed') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const previousStock = product.stock;
          product.stock += item.quantity;
          await product.save();

          await InventoryLog.create({
            productId: product._id,
            shopId: order.shopId,
            action: 'return',
            quantity: item.quantity,
            previousStock,
            newStock: product.stock,
            note: `Hủy đơn ${order.orderNumber}`,
            createdBy: user._id,
          });
        }
      }
    }

    if (status === 'refunded' && order.status !== 'completed') {
      return badRequestResponse('Chỉ có thể hoàn trả đơn đã hoàn thành');
    }

    order.status = status;
    await order.save();

    return successResponse(order.toJSON());
  } catch (error) {
    console.error('Update order error:', error);
    return errorResponse('Lỗi khi cập nhật đơn hàng');
  }
}
