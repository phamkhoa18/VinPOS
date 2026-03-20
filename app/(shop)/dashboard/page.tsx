'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown,
  ArrowUpRight, AlertTriangle, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatShortNumber, formatRelativeTime, orderStatusMap } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  todayCustomers: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    customer?: { name: string };
  }>;
  topProducts: Array<{ _id: string; productName: string; totalSold: number; totalRevenue: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return <div>Không thể tải dữ liệu</div>;

  const statCards = [
    {
      title: 'Doanh thu hôm nay',
      value: formatCurrency(data.todayRevenue),
      change: data.revenueGrowth,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Đơn hàng hôm nay',
      value: data.todayOrders.toString(),
      change: data.orderGrowth,
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      title: 'Tổng sản phẩm',
      value: data.totalProducts.toString(),
      icon: <Package className="w-5 h-5" />,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-700',
    },
    {
      title: 'Khách hàng',
      value: data.totalCustomers.toString(),
      icon: <Users className="w-5 h-5" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
  ];

  const chartData = data.revenueByDay.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    revenue: d.revenue / 1000000,
  }));

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {data.lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{data.lowStockCount} sản phẩm</strong> sắp hết hàng. Vui lòng kiểm tra kho!
          </p>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{card.value}</p>
                    {card.change !== undefined && (
                      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${card.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {card.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{Math.abs(card.change)}% so với hôm qua</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.bgColor} ${card.textColor} flex items-center justify-center`}>
                    {card.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Doanh thu 7 ngày gần nhất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#64748B' }} />
                    <YAxis fontSize={12} tick={{ fill: '#64748B' }} tickFormatter={(v) => `${v}M`} />
                    <Tooltip
                      formatter={(value: any) => [`${value.toFixed(1)}M VNĐ`, 'Doanh thu']}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E2E8F0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white border-gray-100 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Top sản phẩm bán chạy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topProducts.length === 0 && (
                  <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu</p>
                )}
                {data.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.productName}</p>
                      <p className="text-xs text-gray-500">Đã bán: {p.totalSold}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatShortNumber(p.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Đơn hàng gần đây</CardTitle>
              <a href="/orders" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Khách hàng</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Tổng tiền</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                        Chưa có đơn hàng nào
                      </td>
                    </tr>
                  )}
                  {data.recentOrders.map((order) => {
                    const status = orderStatusMap[order.status] || orderStatusMap.pending;
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="text-sm font-medium text-blue-600">{order.orderNumber}</span>
                          <p className="text-xs text-gray-500 sm:hidden">{order.customer?.name || 'Khách lẻ'}</p>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 hidden sm:table-cell">
                          {order.customer?.name || 'Khách lẻ'}
                        </td>
                        <td className="py-3 px-3 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-500 text-right hidden md:table-cell">
                          {formatRelativeTime(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
