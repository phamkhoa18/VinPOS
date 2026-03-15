import connectDB from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import { getCurrentUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();

    const shopFilter: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      shopFilter.shopId = user.shopId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const todayOrders = await Order.find({
      ...shopFilter,
      status: 'completed',
      createdAt: { $gte: today, $lt: tomorrow },
    }).lean();

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrderCount = todayOrders.length;

    // Yesterday for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayOrders = await Order.find({
      ...shopFilter,
      status: 'completed',
      createdAt: { $gte: yesterday, $lt: today },
    }).lean();
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);

    // Revenue growth %
    const revenueGrowth = yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : todayRevenue > 0 ? 100 : 0;
    const orderGrowth = yesterdayOrders.length > 0
      ? Math.round(((todayOrderCount - yesterdayOrders.length) / yesterdayOrders.length) * 100)
      : todayOrderCount > 0 ? 100 : 0;

    // Total products & customers
    const [totalProducts, totalCustomers, lowStockCount] = await Promise.all([
      Product.countDocuments({ ...shopFilter, isActive: true }),
      Customer.countDocuments(shopFilter),
      Product.countDocuments({ ...shopFilter, isActive: true, $expr: { $lte: ['$stock', '$minStock'] } }),
    ]);

    // Revenue by last 7 days
    const revenueByDay: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayOrders = await Order.find({
        ...shopFilter,
        status: 'completed',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      }).lean();

      revenueByDay.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      });
    }

    // Recent orders
    const recentOrders = await Order.find({ ...shopFilter })
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Top selling products (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProductsAgg = await Order.aggregate([
      {
        $match: {
          ...shopFilter,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    return successResponse({
      todayRevenue,
      todayOrders: todayOrderCount,
      todayCustomers: new Set(todayOrders.filter(o => o.customerId).map(o => o.customerId?.toString())).size,
      totalProducts,
      totalCustomers,
      lowStockCount,
      revenueGrowth,
      orderGrowth,
      revenueByDay,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        id: o._id.toString(),
      })),
      topProducts: topProductsAgg,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Lỗi khi lấy dữ liệu dashboard');
  }
}
