import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import { getCurrentUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'month';
    const customFrom = searchParams.get('from') || '';
    const customTo = searchParams.get('to') || '';

    const shopFilter: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      shopFilter.shopId = user.shopId;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    let startDate = new Date(todayStart);
    let endDate = new Date(now);
    let prevStartDate = new Date(todayStart);
    let prevEndDate = new Date(todayStart);

    switch (range) {
      case 'today':
        startDate = new Date(todayStart);
        prevStartDate = new Date(todayStart);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(todayStart);
        break;
      case 'yesterday':
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(todayStart);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(startDate);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 30);
        prevEndDate = new Date(startDate);
        break;
      case 'quarter':
        startDate.setDate(startDate.getDate() - 90);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 90);
        prevEndDate = new Date(startDate);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        prevStartDate = new Date(startDate);
        prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
        prevEndDate = new Date(startDate);
        break;
      case 'custom':
        if (customFrom && customTo) {
          startDate = new Date(customFrom);
          endDate = new Date(customTo + 'T23:59:59');
          const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - days);
          prevEndDate = new Date(startDate);
        }
        break;
    }

    const currentOrders = await Order.find({
      ...shopFilter,
      status: { $in: ['completed'] },
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('createdBy', 'name').lean();

    const prevOrders = await Order.find({
      ...shopFilter,
      status: { $in: ['completed'] },
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    }).lean();

    const totalRevenue = currentOrders.reduce((s, o) => s + o.total, 0);
    const totalCost = currentOrders.reduce((s, o) => s + o.items.reduce((is: number, i: any) => is + (i.costPrice || 0) * i.quantity, 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const totalDiscount = currentOrders.reduce((s, o) => s + o.discount, 0);
    const totalOrders = currentOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
    const prevOrderCount = prevOrders.length;
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : totalRevenue > 0 ? 100 : 0;
    const orderGrowth = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount * 100) : totalOrders > 0 ? 100 : 0;

    // Revenue by period
    const revenueByPeriod: { period: string; revenue: number; orders: number; profit: number }[] = [];
    const daysDiff = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

    if (daysDiff <= 2) {
      for (let h = 0; h < 24; h++) {
        const hourOrders = currentOrders.filter(o => new Date(o.createdAt).getHours() === h);
        const rev = hourOrders.reduce((s, o) => s + o.total, 0);
        const cost = hourOrders.reduce((s, o) => s + o.items.reduce((is: number, i: any) => is + (i.costPrice || 0) * i.quantity, 0), 0);
        revenueByPeriod.push({ period: `${h}:00`, revenue: rev, orders: hourOrders.length, profit: rev - cost });
      }
    } else if (daysDiff <= 90) {
      for (let d = 0; d < daysDiff; d++) {
        const dayStart = new Date(startDate);
        dayStart.setDate(dayStart.getDate() + d);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOrders = currentOrders.filter(o => { const c = new Date(o.createdAt); return c >= dayStart && c < dayEnd; });
        const rev = dayOrders.reduce((s, o) => s + o.total, 0);
        const cost = dayOrders.reduce((s, o) => s + o.items.reduce((is: number, i: any) => is + (i.costPrice || 0) * i.quantity, 0), 0);
        revenueByPeriod.push({ period: dayStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), revenue: rev, orders: dayOrders.length, profit: rev - cost });
      }
    } else {
      const monthMap = new Map<string, typeof currentOrders>();
      for (const o of currentOrders) { const d = new Date(o.createdAt); const key = `${d.getFullYear()}-${d.getMonth()}`; if (!monthMap.has(key)) monthMap.set(key, []); monthMap.get(key)!.push(o); }
      for (const key of [...monthMap.keys()].sort()) {
        const mos = monthMap.get(key)!;
        const [y, m] = key.split('-').map(Number);
        const rev = mos.reduce((s, o) => s + o.total, 0);
        const cost = mos.reduce((s, o) => s + o.items.reduce((is: number, i: any) => is + (i.costPrice || 0) * i.quantity, 0), 0);
        revenueByPeriod.push({ period: new Date(y, m).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }), revenue: rev, orders: mos.length, profit: rev - cost });
      }
    }

    // Top products
    const productMap = new Map<string, { name: string; sold: number; revenue: number; profit: number }>();
    for (const order of currentOrders) {
      for (const item of order.items) {
        const key = item.productId.toString();
        const existing = productMap.get(key) || { name: item.productName, sold: 0, revenue: 0, profit: 0 };
        existing.sold += item.quantity;
        existing.revenue += item.total;
        existing.profit += (item.price - (item.costPrice || 0)) * item.quantity;
        productMap.set(key, existing);
      }
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Payment breakdown
    const paymentMap = new Map<string, number>();
    for (const o of currentOrders) { paymentMap.set(o.paymentMethod || 'cash', (paymentMap.get(o.paymentMethod || 'cash') || 0) + o.total); }
    const paymentLabels: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', momo: 'MoMo', zalopay: 'ZaloPay' };
    const paymentBreakdown = [...paymentMap.entries()].map(([key, value]) => ({ name: paymentLabels[key] || key, value, method: key })).sort((a, b) => b.value - a.value);

    // Staff performance
    const staffMap = new Map<string, { name: string; orders: number; revenue: number }>();
    for (const o of currentOrders) {
      const staffId = o.createdBy && typeof o.createdBy === 'object' ? (o.createdBy as any)._id?.toString() : o.createdBy?.toString();
      const staffName = o.createdBy && typeof o.createdBy === 'object' ? (o.createdBy as any).name || 'Nhân viên' : 'Nhân viên';
      if (staffId) { const existing = staffMap.get(staffId) || { name: staffName, orders: 0, revenue: 0 }; existing.orders += 1; existing.revenue += o.total; staffMap.set(staffId, existing); }
    }
    const staffPerformance = [...staffMap.values()].sort((a, b) => b.revenue - a.revenue);

    // Customer stats
    const customerIds = new Set(currentOrders.filter(o => o.customerId).map(o => o.customerId!.toString()));
    const totalCustomers = await Customer.countDocuments(shopFilter);
    const newCustomers = await Customer.countDocuments({ ...shopFilter, createdAt: { $gte: startDate, $lte: endDate } });
    const cancelledOrders = await Order.countDocuments({ ...shopFilter, status: { $in: ['cancelled', 'refunded'] }, createdAt: { $gte: startDate, $lte: endDate } });

    // Top customers
    const customerSpendMap = new Map<string, { id: string; total: number; orders: number }>();
    for (const o of currentOrders) { if (o.customerId) { const cid = o.customerId.toString(); const existing = customerSpendMap.get(cid) || { id: cid, total: 0, orders: 0 }; existing.total += o.total; existing.orders += 1; customerSpendMap.set(cid, existing); } }
    const topCustomerIds = [...customerSpendMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    const topCustomerDocs = await Customer.find({ _id: { $in: topCustomerIds.map(c => c.id) } }).lean();
    const topCustomers = topCustomerIds.map(tc => { const doc = topCustomerDocs.find(d => d._id.toString() === tc.id); return { name: doc?.name || 'Khách lẻ', phone: doc?.phone || '', orders: tc.orders, totalSpent: tc.total }; });

    return successResponse({
      totalRevenue, totalOrders, totalProfit, avgOrderValue, totalDiscount,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
      revenueByPeriod, topProducts, paymentBreakdown, staffPerformance,
      totalCustomers, activeCustomers: customerIds.size, newCustomers, cancelledOrders, topCustomers,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return errorResponse('Lỗi khi lấy dữ liệu báo cáo');
  }
}
