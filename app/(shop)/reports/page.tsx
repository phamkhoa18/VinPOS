'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Users,
  Download, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw,
  Wallet, CreditCard, Banknote, PieChart as PieChartIcon, FileSpreadsheet,
  Layers, UserCheck, Crown, Star, Award, Target,
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
type ViewTab = 'overview' | 'revenue' | 'products' | 'payment' | 'staff' | 'customers';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

// ====== Helper to get empty data structure ======
function getEmptyData(range: TimeRange, customFrom?: string, customTo?: string) {
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

  return {
    label, days,
    totalRevenue: 0, totalOrders: 0, totalProfit: 0, avgOrderValue: 0, totalDiscount: 0,
    revenueGrowth: 0, orderGrowth: 0,
    revenueByPeriod: [], topProducts: [], paymentBreakdown: [], hourlyData: [],
    staffPerformance: [], topCustomers: [],
    totalCustomers: 0, newCustomers: 0, activeCustomers: 0, cancelledOrders: 0
  };
}

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [viewTab, setViewTab] = useState<ViewTab>('overview');
  const [loading, setLoading] = useState(true);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [apiData, setApiData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: timeRange });
      if (timeRange === 'custom' && customFrom && customTo) { params.set('from', customFrom); params.set('to', customTo); }
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (!res.ok || json.error) toast.error('Không thể tải báo cáo');
      else setApiData(json);
    } catch {
      toast.error('Lỗi khi tải dữ liệu báo cáo');
    }
    setLoading(false);
  }, [timeRange, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fallbackData = useMemo(() => getEmptyData(timeRange, customFrom, customTo), [timeRange, customFrom, customTo]);
  const data = apiData ? { ...fallbackData, ...apiData, label: fallbackData.label } : fallbackData;

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
    { key: 'staff', label: 'Nhân viên', icon: <UserCheck className="w-4 h-4" /> },
    { key: 'customers', label: 'Khách hàng', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" /> Báo cáo
          </h1>
          <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">{data.label} • {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading} className="rounded-lg gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </Button>
          <Button variant="outline" onClick={() => setShowExport(true)} className="rounded-lg gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Xuất Excel</span>
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">
            {timeButtons.map(t => (
              <button
                key={t.key}
                onClick={() => setTimeRange(t.key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${timeRange === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-xs rounded-lg w-32 sm:w-36" />
            <span className="text-gray-400 text-xs">→</span>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-xs rounded-lg w-32 sm:w-36" />
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-0.5 border-b border-gray-200 min-w-max">
          {viewTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setViewTab(t.key)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${viewTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {viewTab === 'overview' && (
        <div className="space-y-3 sm:space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[
              { title: 'Tổng doanh thu', value: formatCurrency(data.totalRevenue), change: data.revenueGrowth, icon: <DollarSign className="w-5 h-5" />, bg: 'bg-blue-50', tc: 'text-blue-700' },
              { title: 'Tổng đơn hàng', value: data.totalOrders.toString(), change: data.orderGrowth, icon: <ShoppingCart className="w-5 h-5" />, bg: 'bg-emerald-50', tc: 'text-emerald-700' },
              { title: 'Lợi nhuận gộp', value: formatCurrency(data.totalProfit), icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-violet-50', tc: 'text-violet-700' },
              { title: 'TB/đơn hàng', value: formatCurrency(data.avgOrderValue), icon: <Layers className="w-5 h-5" />, bg: 'bg-amber-50', tc: 'text-amber-700' },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">{card.title}</p>
                        <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{card.value}</p>
                        {card.change !== undefined && (
                          <div className={`flex items-center gap-0.5 mt-1 sm:mt-1.5 text-[10px] sm:text-xs font-medium ${card.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {card.change >= 0 ? <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            <span className="truncate">{Math.abs(card.change).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${card.bg} ${card.tc} flex items-center justify-center flex-shrink-0`}>{card.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main chart + side stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> Doanh thu & Đơn hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="h-52 sm:h-80">
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
                          formatter={(value: any, name: any) => [
                            name === 'revenue' ? formatCurrency(value) : name === 'profit' ? formatCurrency(value) : value,
                            name === 'revenue' ? 'Doanh thu' : name === 'orders' ? 'Đơn hàng' : 'Lợi nhuận'
                          ]}
                          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}
                        />
                        <Legend formatter={(value: any) => value === 'revenue' ? 'Doanh thu' : value === 'orders' ? 'Đơn hàng' : 'Lợi nhuận'} />
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
              <Card className="bg-white border-gray-100 shadow-sm h-full rounded-xl">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-blue-600" /> Thanh toán
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="h-40 sm:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.paymentBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 mt-2">
                    {data.paymentBreakdown.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-gray-600 truncate">{p.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-gray-900">{Math.round(p.value / data.totalRevenue * 100)}%</span>
                          <span className="text-[10px] sm:text-xs text-gray-400 ml-1 hidden sm:inline">{formatShortNumber(p.value)}</span>
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
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" /> Top SP bán chạy
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('products')} className="rounded-lg text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2">
                    <FileSpreadsheet className="w-3 h-3" /> <span className="hidden sm:inline">Xuất</span> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                        <th className="text-left py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">SP</th>
                        <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Đã bán</th>
                        <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">DT</th>
                        <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase w-24 sm:w-32">Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => {
                        const sumRev = data.topProducts.reduce((s: any, x: any) => s + x.revenue, 0);
                        const pct = sumRev > 0 ? Math.round(p.revenue / sumRev * 100) : 0;
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 px-2 sm:px-3">
                              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-bold ${i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                }`}>{i + 1}</span>
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px]">{p.name}</td>
                            <td className="py-2 px-2 sm:px-3 text-xs sm:text-sm text-gray-700 text-right">{p.sold}</td>
                            <td className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-900 text-right">{formatCurrency(p.revenue)}</td>
                            <td className="py-2 px-2 sm:px-3">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="flex-1 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] sm:text-xs text-gray-500 w-7 sm:w-8 text-right">{pct}%</span>
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
        <div className="space-y-3 sm:space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">Biểu đồ doanh thu</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-52 sm:h-72">
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
                      <Tooltip formatter={(value: any) => [formatCurrency(value), 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#areaBlue)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit Line Chart */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">Lợi nhuận theo thời gian</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-52 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="period" fontSize={11} tick={{ fill: '#64748B' }} />
                      <YAxis fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value), 'Lợi nhuận']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue data table */}
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs sm:text-sm font-semibold">Chi tiết doanh thu</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('revenue')} className="rounded-lg text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2">
                  <FileSpreadsheet className="w-3 h-3" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                      <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">DT</th>
                      <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Đơn</th>
                      <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">LN</th>
                      <th className="text-right py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">TB</th>
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
        <div className="space-y-3 sm:space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">DT theo SP</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-60 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748B' }} width={120} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value), 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
                        {data.topProducts.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales quantity chart */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">Số lượng bán</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-60 sm:h-80">
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
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs sm:text-sm font-semibold">Xếp hạng SP</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('products')} className="rounded-lg text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2">
                  <FileSpreadsheet className="w-3 h-3" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2.5 sm:space-y-3">
                {data.topProducts.map((p: any, i: number) => {
                  const maxRevenue = data.topProducts[0].revenue;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
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
        <div className="space-y-3 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            {data.paymentBreakdown.map((p, i) => {
              const pct = Math.round(p.value / data.totalRevenue * 100);
              const icons = [<Banknote className="w-6 h-6" key={0} />, <CreditCard className="w-6 h-6" key={1} />, <CreditCard className="w-6 h-6" key={2} />];
              return (
                <Card key={i} className="bg-white border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS[i] + '18', color: COLORS[i] }}>
                        {icons[i]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">{p.name}</p>
                        <p className="text-base sm:text-xl font-bold text-gray-900 truncate">{formatCurrency(p.value)}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">Tỷ lệ thanh toán</CardTitle></CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-52 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.paymentBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {data.paymentBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-semibold">Chi tiết</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('orders')} className="rounded-lg text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2">
                    <FileSpreadsheet className="w-3 h-3" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ====== STAFF TAB ====== */}
      {viewTab === 'staff' && (<div className="space-y-3 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {[{t:'Tổng nhân viên bán',v:data.staffPerformance?.length||0,icon:<UserCheck className="w-5 h-5"/>,bg:'bg-blue-50',tc:'text-blue-700'},{t:'Tổng đơn đã xử lý',v:data.totalOrders,icon:<ShoppingCart className="w-5 h-5"/>,bg:'bg-emerald-50',tc:'text-emerald-700'},{t:'TB đơn/nhân viên',v:data.staffPerformance?.length>0?Math.round(data.totalOrders/data.staffPerformance.length):0,icon:<Target className="w-5 h-5"/>,bg:'bg-amber-50',tc:'text-amber-700'}].map((c:any,i:number)=>(
            <Card key={i} className="bg-white border-gray-100 shadow-sm"><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-gray-500 mb-1">{c.t}</p><p className="text-xl font-bold text-gray-900">{typeof c.v==='number'&&c.v>1000?formatCurrency(c.v):c.v}</p></div><div className={`w-10 h-10 rounded-lg ${c.bg} ${c.tc} flex items-center justify-center`}>{c.icon}</div></div></CardContent></Card>
          ))}
        </div>
        {data.staffPerformance?.length > 0 ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl"><CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">DT theo NV</CardTitle></CardHeader>
            <CardContent className="px-2 sm:px-6"><div className="h-52 sm:h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.staffPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis type="number" fontSize={11} tick={{fill:'#64748B'}} tickFormatter={(v:number)=>`${(v/1000000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="name" fontSize={11} tick={{fill:'#64748B'}} width={100} /><Tooltip formatter={(v:any)=>[formatCurrency(v),'Doanh thu']} contentStyle={{fontSize:12,borderRadius:10}} />
              <Bar dataKey="revenue" radius={[0,6,6,0]} barSize={24}>{data.staffPerformance.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
            </BarChart></ResponsiveContainer></div></CardContent></Card>
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl"><CardHeader className="pb-2 px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm font-semibold">Xếp hạng NV</CardTitle></CardHeader>
            <CardContent className="px-3 sm:px-6"><div className="space-y-2.5 sm:space-y-3">{data.staffPerformance.map((s:any,i:number)=>{
              const maxRev=data.staffPerformance[0]?.revenue||1;
              return(<div key={i} className="flex items-center gap-3"><span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-200 text-gray-700':i===2?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                <div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-gray-900 truncate">{s.name}</span><span className="text-sm font-bold text-gray-900 ml-2">{formatCurrency(s.revenue)}</span></div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${(s.revenue/maxRev)*100}%`,backgroundColor:COLORS[i%COLORS.length]}}/></div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.orders} đơn hàng • TB: {formatCurrency(s.orders>0?Math.round(s.revenue/s.orders):0)}/đơn</p></div></div>);})}
            </div></CardContent></Card>
        </div>) : (<Card className="bg-white border-gray-100 shadow-sm"><CardContent className="p-12 text-center"><Award className="w-12 h-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500">Chưa có dữ liệu nhân viên trong khoảng thời gian này</p></CardContent></Card>)}
      </div>)}

      {/* ====== CUSTOMERS TAB ====== */}
      {viewTab === 'customers' && (<div className="space-y-3 sm:space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[{t:'Tổng khách hàng',v:data.totalCustomers,icon:<Users className="w-5 h-5"/>,bg:'bg-blue-50',tc:'text-blue-700'},{t:'Khách mua trong kỳ',v:data.activeCustomers||0,icon:<UserCheck className="w-5 h-5"/>,bg:'bg-emerald-50',tc:'text-emerald-700'},{t:'Khách mới',v:data.newCustomers,icon:<Star className="w-5 h-5"/>,bg:'bg-amber-50',tc:'text-amber-700'},{t:'Đơn hủy/hoàn',v:data.cancelledOrders,icon:<ShoppingCart className="w-5 h-5"/>,bg:'bg-red-50',tc:'text-red-600'}].map((c:any,i:number)=>(
            <Card key={i} className="bg-white border-gray-100 shadow-sm"><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-gray-500 mb-1">{c.t}</p><p className="text-xl font-bold text-gray-900">{c.v}</p></div><div className={`w-10 h-10 rounded-lg ${c.bg} ${c.tc} flex items-center justify-center`}>{c.icon}</div></div></CardContent></Card>
          ))}
        </div>
        {data.topCustomers?.length > 0 ? (<Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500"/> Top khách hàng chi tiêu nhiều nhất</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full min-w-[500px]"><thead><tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-10">#</th>
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">SĐT</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Số đơn</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Tổng chi tiêu</th>
          </tr></thead><tbody>
            {data.topCustomers.map((c:any,i:number)=>(<tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="py-2.5 px-3"><span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${i<3?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500'}`}>{i+1}</span></td>
              <td className="py-2.5 px-3 text-sm font-medium text-gray-900">{c.name}</td>
              <td className="py-2.5 px-3 text-sm text-gray-500">{c.phone||'—'}</td>
              <td className="py-2.5 px-3 text-sm text-gray-700 text-right">{c.orders}</td>
              <td className="py-2.5 px-3 text-sm font-semibold text-blue-600 text-right">{formatCurrency(c.totalSpent)}</td>
            </tr>))}
          </tbody></table></div></CardContent>
        </Card>) : (<Card className="bg-white border-gray-100 shadow-sm"><CardContent className="p-12 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500">Chưa có dữ liệu khách hàng trong khoảng thời gian này</p></CardContent></Card>)}
      </div>)}

      {/* ====== EXPORT DIALOG ====== */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="sm:max-w-sm mx-1 sm:mx-auto rounded-xl">
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
