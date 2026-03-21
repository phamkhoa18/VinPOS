'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, Loader2, ShoppingCart, Download, Printer, FileSpreadsheet,
  Calendar, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  X, RefreshCw, MoreHorizontal, Ban, RotateCcw, Receipt, Hash,
  DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, ArrowUpDown, Package, Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime, formatDate, orderStatusMap, paymentMethodMap, generateReceiptHTML, printReceipt } from '@/lib/format';
import toast from 'react-hot-toast';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  costPrice: number;
  discount: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  status: string;
  paymentMethod: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customer?: { _id: string; name: string; phone: string };
  createdByUser?: { _id: string; name: string };
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  cancelledOrders: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function OrdersPage() {
  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'createdAt' | 'total' | 'orderNumber'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dateTab, setDateTab] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');

  // Quick date tab handler
  const applyDateTab = (tab: typeof dateTab) => {
    setDateTab(tab);
    const now = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    if (tab === 'today') { setStartDate(fmt(now)); setEndDate(fmt(now)); }
    else if (tab === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); setStartDate(fmt(y)); setEndDate(fmt(y)); }
    else if (tab === '7days') { const d = new Date(now); d.setDate(d.getDate() - 6); setStartDate(fmt(d)); setEndDate(fmt(now)); }
    else if (tab === '30days') { const d = new Date(now); d.setDate(d.getDate() - 29); setStartDate(fmt(d)); setEndDate(fmt(now)); }
    else { setStartDate(''); setEndDate(''); }
    setPage(1);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Stats
  const [stats, setStats] = useState<OrderStats>({ totalOrders: 0, totalRevenue: 0, completedOrders: 0, cancelledOrders: 0 });

  // Dialogs
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'detail' | 'bill'>('detail');
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; action: string; label: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Receipt settings from /settings
  const [receiptSettings, setReceiptSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data && !data.error) setReceiptSettings(data);
    }).catch(() => {});
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', pageSize.toString());
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/orders?${params}`);
      const d = await res.json();
      if (res.ok) {
        let sortedOrders = d.orders || [];

        // Client-side payment filter
        if (paymentFilter !== 'all') {
          sortedOrders = sortedOrders.filter((o: Order) => o.paymentMethod === paymentFilter);
        }

        // Client-side sorting
        sortedOrders.sort((a: Order, b: Order) => {
          let cmp = 0;
          if (sortField === 'total') cmp = a.total - b.total;
          else if (sortField === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
          else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return sortDir === 'desc' ? -cmp : cmp;
        });

        setOrders(sortedOrders);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);

        // Calculate quick stats from current page data
        const all = d.orders || [];
        setStats({
          totalOrders: d.total,
          totalRevenue: all.reduce((s: number, o: Order) => s + (o.status === 'completed' ? o.total : 0), 0),
          completedOrders: all.filter((o: Order) => o.status === 'completed').length,
          cancelledOrders: all.filter((o: Order) => o.status === 'cancelled').length,
        });
      }
    } catch {
      toast.error('Lỗi tải đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, statusFilter, paymentFilter, startDate, endDate, sortField, sortDir]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  };

  // Update order status
  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Cập nhật trạng thái thành công');
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev) => prev ? { ...prev, status } : null);
      setConfirmAction(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Print bill
  const handlePrintBill = (order: Order) => {
    const rs = receiptSettings;
    const receiptHTML = generateReceiptHTML({
      orderNumber: order.orderNumber,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      amountPaid: order.amountPaid,
      changeAmount: order.changeAmount,
      paymentMethod: order.paymentMethod,
      customerName: order.customer?.name,
      cashierName: order.createdByUser?.name,
      note: order.note,
      createdAt: order.createdAt,
      shopName: (rs.shopName as string) || undefined,
      shopAddress: (rs.shopAddress as string) || undefined,
      shopPhone: (rs.shopPhone as string) || undefined,
      taxId: (rs.taxId as string) || undefined,
    }, {
      paperSize: (rs.paperSize as '58mm' | '80mm') || '80mm',
      fontSize: (rs.fontSize as 'small' | 'medium' | 'large') || 'medium',
      fontWeight: (rs.fontWeight as 'normal' | 'bold' | 'bolder') || 'bold',
      lineHeight: (rs.lineHeight as 'compact' | 'normal' | 'relaxed') || 'normal',
      borderStyle: (rs.borderStyle as 'dashed' | 'dotted' | 'solid') || 'dashed',
      padding: (rs.padding as 'compact' | 'normal' | 'spacious') || 'normal',
      receiptTitle: (rs.receiptTitle as string) ?? 'HÓA ĐƠN BÁN HÀNG',
      titleAlign: (rs.titleAlign as 'left' | 'center' | 'right') || 'center',
      headerText: (rs.headerText as string) || '',
      footerText: (rs.footerText as string) || 'Cảm ơn quý khách!\nHẹn gặp lại ♥',
      showLogo: rs.showLogo !== false,
      showTaxId: rs.showTaxId === true,
      showQR: rs.showQR === true,
      showDate: rs.showDate !== false,
      showTime: rs.showTime !== false,
      showCashier: rs.showCashier !== false,
      showCustomer: rs.showCustomer !== false,
      showItemNumber: rs.showItemNumber !== false,
      showSKU: rs.showSKU === true,
      showSubtotal: rs.showSubtotal !== false,
      showPaymentMethod: rs.showPaymentMethod !== false,
      showChange: rs.showChange !== false,
      showOrderNote: rs.showOrderNote !== false,
      boldTotal: rs.boldTotal !== false,
      showPoweredBy: rs.showPoweredBy !== false,
    });
    printReceipt(receiptHTML);
  };

  // Export Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');

      // Fetch all orders with current filters (no pagination)
      const params = new URLSearchParams();
      params.set('limit', '10000');
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/orders?${params}`);
      const d = await res.json();
      const allOrders: Order[] = d.orders || orders;

      // Prepare data
      const rowData = allOrders.map((o, i) => {
        const productNames = o.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');
        return {
          'STT': i + 1,
          'Mã đơn': o.orderNumber,
          'Sản phẩm': productNames,
          'Khách hàng': o.customer?.name || 'Khách lẻ',
          'SĐT khách': o.customer?.phone || '',
          'Số SP': o.items.length,
          'Tạm tính': formatCurrency(o.subtotal),
          'Giảm giá': formatCurrency(o.discount),
          'Tổng tiền': formatCurrency(o.total),
          'Tiền khách đưa': formatCurrency(o.amountPaid),
          'Tiền thừa': formatCurrency(o.changeAmount),
          'Thanh toán': paymentMethodMap[o.paymentMethod] || o.paymentMethod,
          'Trạng thái': (orderStatusMap[o.status] || orderStatusMap.pending).label,
          'Ghi chú': o.note || '',
          'Người bán': o.createdByUser?.name || '',
          'Ngày tạo': formatDateTime(o.createdAt),
        };
      });

      const completed = allOrders.filter(o => o.status === 'completed');
      const cash = completed.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
      const transfer = completed.filter(o => ['transfer', 'momo', 'zalopay'].includes(o.paymentMethod)).reduce((sum, o) => sum + o.total, 0);
      const card = completed.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);
      const revenue = completed.reduce((sum, o) => sum + o.total, 0);

      const summaryRows = [
        {},
        { 'Giảm giá': '--- TỔNG KẾT (Chỉ tính đơn Hoàn thành) ---' },
        { 'Giảm giá': 'Tổng số đơn:', 'Tổng tiền': completed.length },
        { 'Giảm giá': 'Tổng doanh thu:', 'Tổng tiền': formatCurrency(revenue) },
        { 'Giảm giá': 'Tiền mặt:', 'Tổng tiền': formatCurrency(cash) },
        { 'Giảm giá': 'Chuyển khoản / Ví:', 'Tổng tiền': formatCurrency(transfer) },
        { 'Giảm giá': 'Thẻ tín dụng:', 'Tổng tiền': formatCurrency(card) },
      ];

      const rows = [...rowData, ...summaryRows];

      // Items detail sheet
      const itemRows: Record<string, unknown>[] = [];
      allOrders.forEach((o) => {
        o.items.forEach((item) => {
          itemRows.push({
            'Mã đơn': o.orderNumber,
            'Sản phẩm': item.productName,
            'SKU': item.sku,
            'Số lượng': item.quantity,
            'Đơn giá': formatCurrency(item.price),
            'Giảm giá': formatCurrency(item.discount),
            'Thành tiền': formatCurrency(item.total),
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(rows);
      const ws2 = XLSX.utils.json_to_sheet(itemRows);

      // Column widths
      ws1['!cols'] = [
        { wch: 5 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 8 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 20 },
      ];
      ws2['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];

      XLSX.utils.book_append_sheet(wb, ws1, 'Đơn hàng');
      XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết sản phẩm');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `DonHang_${dateStr}.xlsx`);
      toast.success(`Đã xuất ${allOrders.length} đơn hàng`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // Export selected orders
  const handleExportSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn đơn hàng cần xuất');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const selected = orders.filter((o) => selectedIds.has(o.id));

      const rowData = selected.map((o, i) => {
        const productNames = o.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');
        return {
          'STT': i + 1,
          'Mã đơn': o.orderNumber,
          'Sản phẩm': productNames,
          'Khách hàng': o.customer?.name || 'Khách lẻ',
          'Tổng tiền': formatCurrency(o.total),
          'Thanh toán': paymentMethodMap[o.paymentMethod] || o.paymentMethod,
          'Trạng thái': (orderStatusMap[o.status] || orderStatusMap.pending).label,
          'Ngày tạo': formatDateTime(o.createdAt),
        };
      });

      const completed = selected.filter(o => o.status === 'completed');
      const cash = completed.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
      const transfer = completed.filter(o => ['transfer', 'momo', 'zalopay'].includes(o.paymentMethod)).reduce((sum, o) => sum + o.total, 0);
      const card = completed.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);
      const revenue = completed.reduce((sum, o) => sum + o.total, 0);

      const summaryRows = [
        {},
        { 'Khách hàng': '--- TỔNG KẾT (Chỉ tính đơn Hoàn thành) ---' },
        { 'Khách hàng': 'Tổng số đơn:', 'Tổng tiền': completed.length },
        { 'Khách hàng': 'Tổng doanh thu:', 'Tổng tiền': formatCurrency(revenue) },
        { 'Khách hàng': 'Tiền mặt:', 'Tổng tiền': formatCurrency(cash) },
        { 'Khách hàng': 'Chuyển khoản / Ví:', 'Tổng tiền': formatCurrency(transfer) },
        { 'Khách hàng': 'Thẻ tín dụng:', 'Tổng tiền': formatCurrency(card) },
      ];

      const rows = [...rowData, ...summaryRows];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng chọn');
      XLSX.writeFile(wb, `DonHang_DaChon_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Đã xuất ${selected.length} đơn hàng`);
    } catch {
      toast.error('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sort toggle
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateTab('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || paymentFilter !== 'all';

  // Render status badge
  const renderStatus = (status: string) => {
    const st = orderStatusMap[status] || orderStatusMap.pending;
    return <Badge variant="secondary" className={`text-[11px] px-2 py-0.5 ${st.color} rounded-md font-medium`}>{st.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Đang tải đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="truncate">Đơn hàng</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{total} đơn • {dateTab === 'today' ? 'Hôm nay' : dateTab === 'yesterday' ? 'Hôm qua' : dateTab === '7days' ? '7 ngày' : dateTab === '30days' ? '30 ngày' : 'Tất cả'}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => fetchOrders(true)} disabled={refreshing} className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors" title="Làm mới">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button onClick={handleExportExcel} disabled={exporting} className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors" title="Xuất Excel">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleExportSelected} disabled={exporting} className="h-8 px-2 flex items-center gap-1 rounded-lg border border-blue-200 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
              <Download className="w-3.5 h-3.5" /><span>{selectedIds.size}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Date Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {([
            { key: 'today' as const, label: 'Hôm nay', icon: <Zap className="w-3 h-3" /> },
            { key: 'yesterday' as const, label: 'Hôm qua', icon: <Clock className="w-3 h-3" /> },
            { key: '7days' as const, label: '7 ngày', icon: <Calendar className="w-3 h-3" /> },
            { key: '30days' as const, label: '30 ngày', icon: <TrendingUp className="w-3 h-3" /> },
            { key: 'all' as const, label: 'Tất cả', icon: <Package className="w-3 h-3" /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => applyDateTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                dateTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Tổng đơn', value: stats.totalOrders, icon: <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Doanh thu', value: formatCurrency(stats.totalRevenue), icon: <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Hoàn thành', value: stats.completedOrders, icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Đã hủy', value: stats.cancelledOrders, icon: <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <Card key={s.label} className="bg-white border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500">{s.label}</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Bar - Always Visible */}
      <div className="space-y-2">
        {/* Row 1: Search + Status + Payment */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm mã đơn, khách hàng..."
              defaultValue={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-9 bg-white rounded-xl border-gray-200 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v: string | null) => { if (v !== null) { setStatusFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-full sm:w-36 h-9 rounded-xl bg-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả TT</SelectItem>
                <SelectItem value="completed">✅ Hoàn thành</SelectItem>
                <SelectItem value="pending">⏳ Chờ xử lý</SelectItem>
                <SelectItem value="cancelled">❌ Đã hủy</SelectItem>
                <SelectItem value="refunded">🔄 Hoàn trả</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v: string | null) => { if (v !== null) { setPaymentFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-full sm:w-36 h-9 rounded-xl bg-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả PT</SelectItem>
                <SelectItem value="cash">💵 Tiền mặt</SelectItem>
                <SelectItem value="transfer">🏦 CK</SelectItem>
                <SelectItem value="card">💳 Thẻ</SelectItem>
                <SelectItem value="momo">📱 MoMo</SelectItem>
                <SelectItem value="zalopay">📱 ZaloPay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date Range + Page Size */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`flex-1 sm:flex-none sm:w-40 justify-start text-left font-normal h-9 rounded-xl text-xs ${!startDate && 'text-gray-400'}`}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                  {startDate ? format(new Date(startDate), "dd/MM/yyyy", { locale: vi }) : 'Từ ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(d: Date | undefined) => { setStartDate(d ? format(d, "yyyy-MM-dd") : ''); setDateTab('all'); setPage(1); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="flex items-center text-gray-300 text-xs">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`flex-1 sm:flex-none sm:w-40 justify-start text-left font-normal h-9 rounded-xl text-xs ${!endDate && 'text-gray-400'}`}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                  {endDate ? format(new Date(endDate), "dd/MM/yyyy", { locale: vi }) : 'Đến ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(d: Date | undefined) => { setEndDate(d ? format(d, "yyyy-MM-dd") : ''); setDateTab('all'); setPage(1); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Select value={pageSize.toString()} onValueChange={(v: string | null) => { if (v !== null) { setPageSize(parseInt(v)); setPage(1); } }}>
            <SelectTrigger className="w-full sm:w-28 h-9 rounded-xl bg-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={n.toString()}>{n} dòng</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <button onClick={resetFilters} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
              <X className="w-3 h-3" /> Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">Không có đơn hàng</p>
            <p className="text-gray-400 text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
          </CardContent>
        </Card>
      )}

      {/* ===== MOBILE: Card Layout ===== */}
      {orders.length > 0 && (
        <div className="md:hidden space-y-2">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card
                className={`bg-white border-gray-100 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${selectedIds.has(o.id) ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}`}
                onClick={() => { setSelectedOrder(o); setViewMode('detail'); }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-600">#{o.orderNumber}</span>
                        {renderStatus(o.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{o.customer?.name || 'Khách lẻ'}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-400">{o.items.length} SP</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(o.total)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(o.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{paymentMethodMap[o.paymentMethod] || o.paymentMethod}</span>
                      {o.createdByUser?.name && <span className="text-[10px] text-gray-400">NV: {o.createdByUser.name}</span>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setViewMode('bill'); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors">
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handlePrintBill(o); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(o.id); }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== DESKTOP: Table Layout ===== */}
      {orders.length > 0 && (
        <Card className="bg-white border-gray-100 shadow-sm overflow-hidden rounded-xl hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="py-3 px-3 w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={orders.length > 0 && selectedIds.size === orders.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">
                      <button onClick={() => toggleSort('orderNumber')} className="flex items-center gap-1 hover:text-gray-700">
                        Mã đơn
                        {sortField === 'orderNumber' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">SP</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">
                      <button onClick={() => toggleSort('total')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                        Tổng tiền
                        {sortField === 'total' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Thanh toán</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Nhân viên</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                      <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                        Thời gian
                        {sortField === 'createdAt' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${selectedIds.has(o.id) ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => { setSelectedOrder(o); setViewMode('detail'); }}>
                          {o.orderNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="text-sm text-gray-800 font-medium">{o.customer?.name || 'Khách lẻ'}</p>
                        {o.customer?.phone && <p className="text-[10px] text-gray-400">{o.customer.phone}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">{o.items.length}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(o.total)}</span>
                        {o.discount > 0 && (
                          <p className="text-[10px] text-orange-500">-{formatCurrency(o.discount)}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{paymentMethodMap[o.paymentMethod] || o.paymentMethod}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{renderStatus(o.status)}</td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{o.createdByUser?.name || '—'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{formatDateTime(o.createdAt)}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelectedOrder(o); setViewMode('detail'); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Xem chi tiết">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedOrder(o); setViewMode('bill'); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors" title="Xem hóa đơn">
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button onClick={() => handlePrintBill(o)} className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="In hóa đơn">
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 py-2">
          <p className="text-[10px] sm:text-xs text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
          </p>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button disabled={page <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${page === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail / Bill Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 mx-1 sm:mx-auto rounded-xl">
          {selectedOrder && (
            <>
              {/* Dialog Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <DialogTitle className="text-sm sm:text-base font-bold text-gray-900">
                      {viewMode === 'bill' ? '🧾 Hóa đơn' : '📋 Chi tiết đơn'}
                    </DialogTitle>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">#{selectedOrder.orderNumber} • {formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setViewMode('detail')}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${viewMode === 'detail' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => setViewMode('bill')}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${viewMode === 'bill' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      Hóa đơn
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
                {viewMode === 'detail' ? (
                  /* Detail View */
                  <>
                    {/* Order Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Trạng thái</p>
                        {renderStatus(selectedOrder.status)}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Thanh toán</p>
                        <p className="text-sm font-medium">{paymentMethodMap[selectedOrder.paymentMethod]}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Khách hàng</p>
                        <p className="text-sm font-medium">{selectedOrder.customer?.name || 'Khách lẻ'}</p>
                        {selectedOrder.customer?.phone && <p className="text-[10px] text-gray-400">{selectedOrder.customer.phone}</p>}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Nhân viên</p>
                        <p className="text-sm font-medium">{selectedOrder.createdByUser?.name || '—'}</p>
                      </div>
                    </div>

                    {selectedOrder.note && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                        <p className="text-[10px] text-yellow-600 uppercase font-semibold mb-1">Ghi chú</p>
                        <p className="text-sm text-yellow-800">{selectedOrder.note}</p>
                      </div>
                    )}

                    {/* Items Table */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Sản phẩm ({selectedOrder.items.length})
                      </h4>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase">Sản phẩm</th>
                              <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase w-14">SL</th>
                              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase">Đơn giá</th>
                              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase">Giảm</th>
                              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.items.map((item, i) => (
                              <tr key={i} className="border-t border-gray-50">
                                <td className="py-2 px-3">
                                  <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                                  <p className="text-[10px] text-gray-400">SKU: {item.sku}</p>
                                </td>
                                <td className="py-2 px-3 text-center text-sm text-gray-700">{item.quantity}</td>
                                <td className="py-2 px-3 text-right text-sm text-gray-600">{formatCurrency(item.price)}</td>
                                <td className="py-2 px-3 text-right text-sm text-orange-500">
                                  {item.discount > 0 ? `-${formatCurrency(item.discount * item.quantity)}` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tạm tính</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-orange-500">Giảm giá</span>
                          <span className="font-medium text-orange-500">-{formatCurrency(selectedOrder.discount)}</span>
                        </div>
                      )}
                      {selectedOrder.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Thuế</span>
                          <span className="font-medium">{formatCurrency(selectedOrder.tax)}</span>
                        </div>
                      )}
                      <div className="h-px bg-blue-200/50 my-1" />
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">TỔNG CỘNG</span>
                        <span className="font-bold text-xl text-blue-700">{formatCurrency(selectedOrder.total)}</span>
                      </div>
                      <div className="h-px bg-blue-200/50 my-1" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tiền khách đưa</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.amountPaid)}</span>
                      </div>
                      {selectedOrder.changeAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Tiền thừa</span>
                          <span className="font-medium text-green-600">{formatCurrency(selectedOrder.changeAmount)}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Bill Preview View - settings-aware */
                  (() => {
                    const rs = receiptSettings;
                    const shopName = (rs.shopName as string) || 'Cửa hàng';
                    const shopAddress = (rs.shopAddress as string) || '';
                    const shopPhone = (rs.shopPhone as string) || '';
                    const taxId = (rs.taxId as string) || '';
                    const headerText = (rs.headerText as string) || '';
                    const footerText = (rs.footerText as string) || 'Cảm ơn quý khách!';
                    const receiptTitle = (rs.receiptTitle as string) ?? 'HÓA ĐƠN BÁN HÀNG';

                    const borderStyle = (rs.borderStyle as string) || 'dashed';
                    const fontSize = (rs.fontSize as string) || 'medium';
                    const fontWeightSetting = (rs.fontWeight as string) || 'bold';
                    const lineHeightSetting = (rs.lineHeight as string) || 'normal';
                    const paddingSetting = (rs.padding as string) || 'normal';
                    const titleAlign = (rs.titleAlign as string) || 'center';
                    const boldTotal = rs.boldTotal !== false;

                    const showLogo = rs.showLogo !== false;
                    const showTaxId = rs.showTaxId === true;
                    const showDate = rs.showDate !== false;
                    const showTime = rs.showTime !== false;
                    const showCashier = rs.showCashier !== false;
                    const showCustomer = rs.showCustomer !== false;
                    const showItemNumber = rs.showItemNumber !== false;
                    const showSubtotalSetting = rs.showSubtotal !== false;
                    const showPaymentMethodSetting = rs.showPaymentMethod !== false;
                    const showChangeSetting = rs.showChange !== false;
                    const showOrderNote = rs.showOrderNote !== false;
                    const showPoweredBy = rs.showPoweredBy !== false;

                    const fontSizePx = fontSize === 'small' ? '10px' : fontSize === 'large' ? '14px' : '12px';
                    const titleSizePx = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
                    const fw = fontWeightSetting === 'normal' ? '400' : fontWeightSetting === 'bolder' ? '700' : '600';
                    const lh = lineHeightSetting === 'compact' ? '1.2' : lineHeightSetting === 'relaxed' ? '1.8' : '1.5';
                    const pad = paddingSetting === 'compact' ? '12px' : paddingSetting === 'spacious' ? '24px' : '20px';
                    const borderCss = `1px ${borderStyle} #ccc`;

                    const orderDate = new Date(selectedOrder.createdAt);
                    const dateStr = showDate ? (showTime
                      ? orderDate.toLocaleDateString('vi-VN') + ' ' + orderDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : orderDate.toLocaleDateString('vi-VN')
                    ) : (showTime ? orderDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');

                    return (
                      <div
                        className="bg-white border border-gray-200 rounded-xl max-w-[360px] mx-auto overflow-hidden"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: fontSizePx, fontWeight: fw, lineHeight: lh, padding: pad }}
                      >
                        {/* Shop header */}
                        <div style={{ textAlign: titleAlign as 'left' | 'center' | 'right', paddingBottom: '8px', borderBottom: borderCss }}>
                          {showLogo && <div style={{ fontSize: titleSizePx, fontWeight: 700, marginBottom: '2px' }}>{shopName}</div>}
                          {!showLogo && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{shopName}</div>}
                          {shopAddress && <div className="text-gray-500">{shopAddress}</div>}
                          {shopPhone && <div className="text-gray-500">ĐT: {shopPhone}</div>}
                          {showTaxId && taxId && <div className="text-gray-500">MST: {taxId}</div>}
                          {headerText && <div className="text-gray-400 italic mt-1">{headerText}</div>}
                        </div>

                        {/* Receipt title */}
                        {receiptTitle && (
                          <div style={{ fontSize: titleSizePx, fontWeight: 700, textAlign: titleAlign as 'left' | 'center' | 'right', margin: '8px 0' }}>
                            {receiptTitle}
                          </div>
                        )}

                        {/* Order meta */}
                        <div className="space-y-0.5" style={{ paddingBottom: '6px' }}>
                          <div className="flex justify-between"><span>Số HĐ:</span><span style={{ fontWeight: 700 }}>{selectedOrder.orderNumber}</span></div>
                          {dateStr && <div className="flex justify-between"><span>Ngày:</span><span>{dateStr}</span></div>}
                          {showCashier && selectedOrder.createdByUser?.name && <div className="flex justify-between"><span>Thu ngân:</span><span>{selectedOrder.createdByUser.name}</span></div>}
                          {showCustomer && <div className="flex justify-between"><span>KH:</span><span>{selectedOrder.customer?.name || 'Khách lẻ'}</span></div>}
                        </div>

                        <div style={{ borderTop: borderCss, margin: '6px 0' }} />

                        {/* Items */}
                        <div style={{ paddingBottom: '6px' }}>
                          {selectedOrder.items.map((item, i) => (
                            <div key={i} style={{ marginBottom: '6px' }}>
                              <div style={{ fontWeight: 700 }}>
                                {showItemNumber ? `${i + 1}. ` : ''}{item.productName}
                              </div>
                              <div className="flex justify-between">
                                <span>{item.quantity} x {formatCurrency(item.price)}</span>
                                <span>{formatCurrency(item.total)}</span>
                              </div>
                              {item.discount > 0 && (
                                <div className="flex justify-between text-orange-500">
                                  <span>&nbsp;&nbsp;Giảm giá:</span>
                                  <span>-{formatCurrency(item.discount * item.quantity)}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div style={{ borderTop: borderCss, margin: '6px 0' }} />

                        {/* Totals */}
                        {showSubtotalSetting && (
                          <div className="flex justify-between"><span>Tạm tính:</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                        )}
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-orange-500"><span>Giảm giá:</span><span>-{formatCurrency(selectedOrder.discount)}</span></div>
                        )}

                        <div style={{ borderTop: borderCss, margin: '6px 0' }} />

                        {/* Grand total */}
                        <div className="flex justify-between" style={{ fontSize: boldTotal ? titleSizePx : fontSizePx, fontWeight: boldTotal ? 700 : parseInt(fw) }}>
                          <span>TỔNG CỘNG:</span><span>{formatCurrency(selectedOrder.total)}</span>
                        </div>

                        {showPaymentMethodSetting && (
                          <div className="flex justify-between">
                            <span>Thanh toán ({paymentMethodMap[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}):</span>
                            <span>{formatCurrency(selectedOrder.amountPaid)}</span>
                          </div>
                        )}
                        {showChangeSetting && selectedOrder.changeAmount > 0 && (
                          <div className="flex justify-between" style={{ fontWeight: 700 }}>
                            <span>Tiền thừa:</span><span>{formatCurrency(selectedOrder.changeAmount)}</span>
                          </div>
                        )}

                        {/* Order note */}
                        {showOrderNote && selectedOrder.note && (
                          <>
                            <div style={{ borderTop: borderCss, margin: '6px 0' }} />
                            <div className="italic text-gray-500">
                              <strong>Ghi chú:</strong> {selectedOrder.note}
                            </div>
                          </>
                        )}

                        {/* Footer */}
                        <div style={{ borderTop: borderCss, margin: '6px 0' }} />
                        <div style={{ textAlign: titleAlign as 'left' | 'center' | 'right', marginTop: '8px' }}>
                          {footerText.split('\\n').map((line: string, i: number) => <div key={i} className="text-gray-500">{line}</div>)}
                          {showPoweredBy && <div className="text-gray-300 mt-1" style={{ fontSize: '9px' }}>— Powered by VinPOS —</div>}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-3 sm:px-6 py-2.5 sm:py-3">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex gap-1 sm:gap-2">
                    {selectedOrder.status === 'completed' && (
                      <>
                        <button
                          onClick={() => setConfirmAction({ orderId: selectedOrder.id, action: 'cancelled', label: 'hủy đơn' })}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">Hủy</span>
                        </button>
                        <button
                          onClick={() => setConfirmAction({ orderId: selectedOrder.id, action: 'refunded', label: 'hoàn trả' })}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">Hoàn trả</span>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => handlePrintBill(selectedOrder)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">In</span>
                    </button>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Xác nhận {confirmAction?.label}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn <strong className="text-red-600">{confirmAction?.label}</strong> đơn hàng này? Thao tác này không thể hoàn tác.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)} className="rounded-lg text-xs">Hủy bỏ</Button>
            <Button
              size="sm"
              onClick={() => confirmAction && updateStatus(confirmAction.orderId, confirmAction.action)}
              className="rounded-lg text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận {confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
