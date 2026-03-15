import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import InventoryLog from '@/lib/models/InventoryLog';
import { getCurrentUser, unauthorizedResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/orders
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      query.shopId = user.shopId;
    }
    if (status) query.status = status;
    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate + 'T23:59:59');
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'name phone')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return successResponse({
      orders: orders.map((o) => ({
        ...o,
        id: o._id.toString(),
        shopId: o.shopId?.toString(),
        customerId: typeof o.customerId === 'object' && o.customerId !== null ? (o.customerId as Record<string, unknown>)._id?.toString() : o.customerId,
        customer: typeof o.customerId === 'object' ? o.customerId : undefined,
        createdBy: typeof o.createdBy === 'object' && o.createdBy !== null ? (o.createdBy as Record<string, unknown>)._id?.toString() : o.createdBy,
        createdByUser: typeof o.createdBy === 'object' ? o.createdBy : undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse('Lỗi khi lấy đơn hàng');
  }
}

// POST /api/orders - Create new order (from POS)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const data = await req.json();

    const shopId = user.role === 'admin' ? data.shopId : user.shopId;
    if (!shopId) return badRequestResponse('Thiếu thông tin cửa hàng');

    if (!data.items || data.items.length === 0) {
      return badRequestResponse('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // Validate and update stock
    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) return badRequestResponse(`Sản phẩm ${item.productName} không tồn tại`);
      if (product.stock < item.quantity) {
        return badRequestResponse(`Sản phẩm ${product.name} không đủ tồn kho (còn ${product.stock})`);
      }

      // Deduct stock
      const previousStock = product.stock;
      product.stock -= item.quantity;
      await product.save();

      // Log inventory change
      await InventoryLog.create({
        productId: product._id,
        shopId,
        action: 'sale',
        quantity: -item.quantity,
        previousStock,
        newStock: product.stock,
        note: `Bán hàng`,
        createdBy: user._id,
      });
    }

    // Create order
    const order = await Order.create({
      ...data,
      shopId,
      createdBy: user._id,
      status: 'completed',
    });

    // Update customer stats
    if (data.customerId) {
      await Customer.findByIdAndUpdate(data.customerId, {
        $inc: { totalOrders: 1, totalSpent: data.total, points: Math.floor(data.total / 10000) },
      });
    }

    return successResponse(order.toJSON(), 201);
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse('Lỗi khi tạo đơn hàng');
  }
}
