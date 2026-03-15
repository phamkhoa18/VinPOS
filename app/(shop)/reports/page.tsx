'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users,
  Download, Calendar, Filter, Loader2, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Banknote, PieChart as PieChartIcon, FileSpreadsheet,
  ChevronLeft, ChevronRight, Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart,
} from 'recharts';
import { formatCurrency, formatShortNumber } from '@/lib/format';
import toast from 'react-hot-toast';

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ViewTab = 'overview' | 'revenue' | 'products' | 'payment';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

// ====== Generate mock data based on time range ======
function generateMockData(range: TimeRange, customFrom?: string, customTo?: string) {
  const now = new Date();
  let days = 1;
  let label = 'Hôm nay';
  
  switch (range) {
    case 'today': days = 1; label = 'Hôm nay'; break;
    case 'yesterday': days = 1; label = 'Hôm qua'; break;
    case 'week': days = 7; label = '7 ngày qua'; break;
    case 'month': days = 30; label = 'Tháng này'; break;
    case 'quarter': days = 90; label = 'Quý này'; break;
    case 'year': days = 365; label = 'Năm nay'; break;
    case 'custom': {
      if (customFrom && customTo) {
        days = Math.max(1, Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000));
        label = `${customFrom} → ${customTo}`;
      }
      break;
    }
  }

  const baseRevenue = 15000000 + Math.random() * 50000000;
  const baseOrders = 10 + Math.floor(Math.random() * 30);

  // Revenue by period
  const revenueByPeriod = [];
  const periodCount = range === 'year' ? 12 : range === 'quarter' ? 3 : days;
  for (let i = 0; i < Math.min(periodCount, 31); i++) {
    const d = new Date(now);
    if (range === 'year') {
      d.setMonth(d.getMonth() - (periodCount - 1 - i));
      revenueByPeriod.push({
        period: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        revenue: Math.round((baseRevenue * days / periodCount) * (0.6 + Math.random() * 0.8)),
        orders: Math.round((baseOrders * days / periodCount) * (0.5 + Math.random())),
        profit: Math.round((baseRevenue * days / periodCount) * (0.6 + Math.random() * 0.8) * 0.25),
      });
    } else if (range === 'quarter') {
      d.setMonth(d.getMonth() - (periodCount - 1 - i));
      revenueByPeriod.push({
        period: `Tháng ${d.getMonth() + 1}`,
        revenue: Math.round(baseRevenue * 30 * (0.7 + Math.random() * 0.6)),
        orders: Math.round(baseOrders * 30 * (0.5 + Math.random())),
        profit: Math.round(baseRevenue * 30 * (0.7 + Math.random() * 0.6) * 0.25),
      });
    } else {
      d.setDate(d.getDate() - (periodCount - 1 - i));
      revenueByPeriod.push({
        period: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: Math.round(baseRevenue * (0.5 + Math.random())),
        orders: Math.round(baseOrders * (0.4 + Math.random() * 1.2)),
        profit: Math.round(baseRevenue * (0.5 + Math.random()) * 0.25),
      });
    }
  }

  const totalRevenue = revenueByPeriod.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = revenueByPeriod.reduce((s, d) => s + d.orders, 0);
  const totalProfit = revenueByPeriod.reduce((s, d) => s + d.profit, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const topProducts = [
    { name: 'iPhone 15 Pro Max', sold: 45 + Math.floor(Math.random() * 20), revenue: 1350000000 + Math.floor(Math.random() * 500000000) },
    { name: 'Samsung Galaxy S24', sold: 38 + Math.floor(Math.random() * 15), revenue: 950000000 + Math.floor(Math.random() * 300000000) },
    { name: 'AirPods Pro 2', sold: 82 + Math.floor(Math.random() * 30), revenue: 560000000 + Math.floor(Math.random() * 200000000) },
    { name: 'MacBook Pro 14 M3', sold: 12 + Math.floor(Math.random() * 8), revenue: 600000000 + Math.floor(Math.random() * 300000000) },
    { name: 'iPad Air M2', sold: 25 + Math.floor(Math.random() * 10), revenue: 450000000 + Math.floor(Math.random() * 150000000) },
    { name: 'Apple Watch 9', sold: 30 + Math.floor(Math.random() * 15), revenue: 300000000 + Math.floor(Math.random() * 100000000) },
    { name: 'Sony WH-1000XM5', sold: 55 + Math.floor(Math.random() * 20), revenue: 470000000 + Math.floor(Math.random() * 100000000) },
    { name: 'JBL Flip 6', sold: 90 + Math.floor(Math.random() * 30), revenue: 270000000 + Math.floor(Math.random() * 80000000) },
  ].sort((a, b) => b.revenue - a.revenue);

  const paymentBreakdown = [
    { name: 'Tiền mặt', value: Math.round(totalRevenue * (0.4 + Math.random() * 0.2)), icon: 'cash' },
    { name: 'Chuyển khoản', value: Math.round(totalRevenue * (0.2 + Math.random() * 0.15)), icon: 'transfer' },
    { name: 'Thẻ', value: Math.round(totalRevenue * (0.05 + Math.random() * 0.1)), icon: 'card' },
  ];
  paymentBreakdown[0].value = totalRevenue - paymentBreakdown[1].value - paymentBreakdown[2].value;

  // Hourly sales for today/yesterday
  const hourlyData = [];
  for (let h = 7; h <= 22; h++) {
    hourlyData.push({
      hour: `${h}:00`,
      orders: Math.floor(Math.random() * 8),
      revenue: Math.round(Math.random() * 8000000),
    });
  }

  const prevTotalRevenue = totalRevenue * (0.8 + Math.random() * 0.4);
  const revenueGrowth = ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100);
  const prevTotalOrders = totalOrders * (0.8 + Math.random() * 0.4);
  const orderGrowth = ((totalOrders - prevTotalOrders) / prevTotalOrders * 100);

  return {
    label, days, totalRevenue, totalOrders, totalProfit, avgOrderValue,
    revenueGrowth, orderGrowth,
    revenueByPeriod, topProducts, paymentBreakdown, hourlyData,
    totalCustomers: 120 + Math.floor(Math.random() * 80),
    newCustomers: 5 + Math.floor(Math.random() * 15),
  };
}

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [viewTab, setViewTab] = useState<ViewTab>('overview');
  const [loading, setLoading] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showExport, setShowExport] = useState(false);

  const data = useMemo(() => generateMockData(timeRange, customFrom, customTo), [timeRange, customFrom, customTo]);

  const handleExportExcel = async (type: 'revenue' | 'products' | 'orders') => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (type === 'revenue') {
        const ws = XLSX.utils.json_to_sheet(data.revenueByPeriod.map(d => ({
          'Thời gian': d.period,
          'Doanh thu (VNĐ)': d.revenue,
          'Số đơn hàng': d.orders,
          'Lợi nhuận (VNĐ)': d.profit,
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');
        // Summary row
        const summary = XLSX.utils.json_to_sheet([{
          'Chỉ số': 'Tổng doanh thu', 'Giá trị': data.totalRevenue,
        }, {
          'Chỉ số': 'Tổng đơn hàng', 'Giá trị': data.totalOrders,
        }, {
          'Chỉ số': 'Lợi nhuận', 'Giá trị': data.totalProfit,
        }, {
          'Chỉ số': 'Giá trị trung bình/đơn', 'Giá trị': data.avgOrderValue,
        }]);
        XLSX.utils.book_append_sheet(wb, summary, 'Tổng hợp');
      } else if (type === 'products') {
        const ws = XLSX.utils.json_to_sheet(data.topProducts.map((p, i) => ({
          'STT': i + 1,
          'Sản phẩm': p.name,
          'Số lượng bán': p.sold,
          'Doanh thu (VNĐ)': p.revenue,
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm bán chạy');
      } else {
        const ws = XLSX.utils.json_to_sheet(data.paymentBreakdown.map(p => ({
          'Phương thức': p.name,
          'Doanh thu (VNĐ)': p.value,
          'Tỷ lệ (%)': Math.round(p.value / data.totalRevenue * 100),
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Thanh toán');
      }

      XLSX.writeFile(wb, `VinPOS_BaoCao_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Đã xuất file Excel!');
      setShowExport(false);
    } catch {
      toast.error('Lỗi xuất Excel');
    }
  };

  const timeButtons: { key: TimeRange; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'week', label: '7 ngày' },
    { key: 'month', label: 'Tháng' },
    { key: 'quarter', label: 'Quý' },
    { key: 'year', label: 'Năm' },
    { key: 'custom', label: 'Tùy chọn' },
  ];

  const viewTabs: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Tổng quan', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'revenue', label: 'Doanh thu', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'products', label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
    { key: 'payment', label: 'Thanh toán', icon: <Wallet className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Báo cáo doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.label} • Cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)} className="rounded-lg gap-2 text-sm">
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {timeButtons.map(t => (
            <button
              key={t.key}
              onClick={() => setTimeRange(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeRange === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-xs rounded-lg w-36" />
            <span className="text-gray-400 text-xs">→</span>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-xs rounded-lg w-36" />
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {viewTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setViewTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              viewTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {viewTab === 'overview' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Tổng doanh thu', value: formatCurrency(data.totalRevenue), change: data.revenueGrowth, icon: <DollarSign className="w-5 h-5" />, bg: 'bg-blue-50', tc: 'text-blue-700' },
              { title: 'Tổng đơn hàng', value: data.totalOrders.toString(), change: data.orderGrowth, icon: <ShoppingCart className="w-5 h-5" />, bg: 'bg-emerald-50', tc: 'text-emerald-700' },
              { title: 'Lợi nhuận gộp', value: formatCurrency(data.totalProfit), icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-violet-50', tc: 'text-violet-700' },
              { title: 'TB/đơn hàng', value: formatCurrency(data.avgOrderValue), icon: <Layers className="w-5 h-5" />, bg: 'bg-amber-50', tc: 'text-amber-700' },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="bg-white border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{card.title}</p>
                        <p className="text-xl font-bold text-gray-900">{card.value}</p>
                        {card.change !== undefined && (
                          <div className={`flex items-center gap-0.5 mt-1.5 text-xs font-medium ${card.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {card.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {Math.abs(card.change).toFixed(1)}% so với kỳ trước
                          </div>
                        )}
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.tc} flex items-center justify-center`}>{card.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main chart + side stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="bg-white border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> Doanh thu & Đơn hàng theo thời gian
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.revenueByPeriod}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="period" fontSize={11} tick={{ fill: '#64748B' }} />
                        <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#64748B' }} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'revenue' ? formatCurrency(value) : name === 'profit' ? formatCurrency(value) : value,
                            name === 'revenue' ? 'Doanh thu' : name === 'orders' ? 'Đơn hàng' : 'Lợi nhuận'
                          ]}
                          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}
                        />
                        <Legend formatter={(value: string) => value === 'revenue' ? 'Doanh thu' : value === 'orders' ? 'Đơn hàng' : 'Lợi nhuận'} />
                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#colorRev)" strokeWidth={2} />
                        <Bar yAxisId="right" dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8} />
                        <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Pie */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white border-gray-100 shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-blue-600" /> Phương thức thanh toán
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.paymentBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {data.paymentBreakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-gray-600">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">{Math.round(p.value / data.totalRevenue * 100)}%</span>
                          <span className="text-xs text-gray-400 ml-1.5">{formatShortNumber(p.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Top products table */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" /> Top sản phẩm bán chạy
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('products')} className="rounded-lg text-xs gap-1">
                    <FileSpreadsheet className="w-3 h-3" /> Xuất Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Đã bán</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => {
                        const pct = Math.round(p.revenue / data.topProducts.reduce((s, x) => s + x.revenue, 0) * 100);
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                              }`}>{i + 1}</span>
                            </td>
                            <td className="py-2.5 px-3 text-sm font-medium text-gray-900">{p.name}</td>
                            <td className="py-2.5 px-3 text-sm text-gray-700 text-right">{p.sold}</td>
                            <td className="py-2.5 px-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(p.revenue)}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                              </div>
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
      )}

      {/* ====== REVENUE TAB ====== */}
      {viewTab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue Area Chart */}
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Biểu đồ doanh thu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueByPeriod}>
                      <defs>
                        <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="period" fontSize={11} tick={{ fill: '#64748B' }} />
                      <YAxis fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#areaBlue)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit Line Chart */}
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Lợi nhuận theo thời gian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="period" fontSize={11} tick={{ fill: '#64748B' }} />
                      <YAxis fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Lợi nhuận']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue data table */}
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Chi tiết doanh thu</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('revenue')} className="rounded-lg text-xs gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> Xuất Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Đơn hàng</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Lợi nhuận</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">TB/đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByPeriod.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-sm font-medium text-gray-900">{row.period}</td>
                        <td className="py-2.5 px-3 text-sm text-right font-semibold text-blue-600">{formatCurrency(row.revenue)}</td>
                        <td className="py-2.5 px-3 text-sm text-right text-gray-700">{row.orders}</td>
                        <td className="py-2.5 px-3 text-sm text-right text-emerald-600 font-medium">{formatCurrency(row.profit)}</td>
                        <td className="py-2.5 px-3 text-sm text-right text-gray-500">{row.orders > 0 ? formatCurrency(Math.round(row.revenue / row.orders)) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-2.5 px-3 text-sm font-bold text-gray-900">TỔNG</td>
                      <td className="py-2.5 px-3 text-sm text-right font-bold text-blue-700">{formatCurrency(data.totalRevenue)}</td>
                      <td className="py-2.5 px-3 text-sm text-right font-bold text-gray-900">{data.totalOrders}</td>
                      <td className="py-2.5 px-3 text-sm text-right font-bold text-emerald-700">{formatCurrency(data.totalProfit)}</td>
                      <td className="py-2.5 px-3 text-sm text-right font-bold text-gray-700">{formatCurrency(data.avgOrderValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== PRODUCTS TAB ====== */}
      {viewTab === 'products' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Horizontal Bar Chart */}
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Doanh thu theo sản phẩm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748B' }} width={120} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
                        {data.topProducts.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales quantity chart */}
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Số lượng bán ra</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748B' }} angle={-30} textAnchor="end" height={60} />
                      <YAxis fontSize={11} tick={{ fill: '#64748B' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Bar dataKey="sold" name="Đã bán" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product ranking table */}
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Bảng xếp hạng sản phẩm</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('products')} className="rounded-lg text-xs gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> Xuất Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topProducts.map((p, i) => {
                  const maxRevenue = data.topProducts[0].revenue;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <span className="text-sm font-bold text-gray-900 ml-2">{formatCurrency(p.revenue)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Đã bán: {p.sold} sản phẩm</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== PAYMENT TAB ====== */}
      {viewTab === 'payment' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.paymentBreakdown.map((p, i) => {
              const pct = Math.round(p.value / data.totalRevenue * 100);
              const icons = [<Banknote className="w-6 h-6" key={0} />, <CreditCard className="w-6 h-6" key={1} />, <CreditCard className="w-6 h-6" key={2} />];
              return (
                <Card key={i} className="bg-white border-gray-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS[i] + '18', color: COLORS[i] }}>
                        {icons[i]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">{p.name}</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(p.value)}</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{pct}% tổng doanh thu</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tỷ lệ thanh toán</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.paymentBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Chi tiết thanh toán</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('orders')} className="rounded-lg text-xs gap-1">
                    <FileSpreadsheet className="w-3 h-3" /> Xuất Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Phương thức</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentBreakdown.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                            <span className="text-sm font-medium text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm font-semibold text-right">{formatCurrency(p.value)}</td>
                        <td className="py-3 px-3 text-sm text-right">
                          <Badge className="bg-blue-50 text-blue-700 text-xs">{Math.round(p.value / data.totalRevenue * 100)}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-3 px-3 text-sm font-bold">Tổng</td>
                      <td className="py-3 px-3 text-sm font-bold text-right">{formatCurrency(data.totalRevenue)}</td>
                      <td className="py-3 px-3 text-sm font-bold text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ====== EXPORT DIALOG ====== */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-blue-600" /> Xuất báo cáo Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { key: 'revenue' as const, label: 'Báo cáo doanh thu', desc: 'Doanh thu, đơn hàng, lợi nhuận theo thời gian', icon: <DollarSign className="w-4 h-4 text-blue-500" /> },
              { key: 'products' as const, label: 'Báo cáo sản phẩm', desc: 'Top sản phẩm bán chạy, số lượng, doanh thu', icon: <Package className="w-4 h-4 text-emerald-500" /> },
              { key: 'orders' as const, label: 'Báo cáo thanh toán', desc: 'Phân tích theo phương thức thanh toán', icon: <CreditCard className="w-4 h-4 text-violet-500" /> },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => handleExportExcel(item.key)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">{item.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
