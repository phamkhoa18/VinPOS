import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Product from '@/lib/models/Product';
import InventoryLog from '@/lib/models/InventoryLog';
import { getCurrentUser, unauthorizedResponse, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

// GET /api/inventory - Get inventory logs
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const productId = searchParams.get('productId');
    const action = searchParams.get('action');

    const query: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      query.shopId = user.shopId;
    }
    if (productId) query.productId = productId;
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      InventoryLog.find(query)
        .populate('productId', 'name sku')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryLog.countDocuments(query),
    ]);

    return successResponse({
      logs: logs.map((l) => ({ ...l, id: l._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get inventory logs error:', error);
    return errorResponse('Lỗi khi lấy lịch sử kho');
  }
}

// POST /api/inventory - Import/Export/Adjust stock
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const { productId, action, quantity, note } = await req.json();

    if (!productId || !action || !quantity) {
      return badRequestResponse('Thiếu thông tin bắt buộc');
    }

    const product = await Product.findById(productId);
    if (!product) return badRequestResponse('Sản phẩm không tồn tại');

    const previousStock = product.stock;
    let newStock = previousStock;

    switch (action) {
      case 'import':
        newStock = previousStock + Math.abs(quantity);
        break;
      case 'export':
        if (previousStock < quantity) {
          return badRequestResponse('Tồn kho không đủ');
        }
        newStock = previousStock - Math.abs(quantity);
        break;
      case 'adjustment':
        newStock = quantity;
        break;
      default:
        return badRequestResponse('Loại thao tác không hợp lệ');
    }

    product.stock = newStock;
    await product.save();

    const log = await InventoryLog.create({
      productId: product._id,
      shopId: user.shopId,
      action,
      quantity: action === 'adjustment' ? quantity - previousStock : quantity,
      previousStock,
      newStock,
      note,
      createdBy: user._id,
    });

    return successResponse(log.toJSON(), 201);
  } catch (error) {
    console.error('Inventory update error:', error);
    return errorResponse('Lỗi khi cập nhật kho');
  }
}
