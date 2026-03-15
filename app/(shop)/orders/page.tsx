'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Eye, Loader2, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime, orderStatusMap, paymentMethodMap } from '@/lib/format';
import toast from 'react-hot-toast';

interface Order {
  id: string; orderNumber: string; total: number; status: string;
  paymentMethod: string; createdAt: string;
  items: Array<{ productName: string; quantity: number; price: number; total: number; discount: number }>;
  customer?: { name: string; phone: string };
  createdByUser?: { name: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setTotal(d.total || 0); })
      .catch(() => toast.error('Lỗi tải đơn hàng'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Cập nhật thành công');
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      setSelectedOrder(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Đơn hàng</h1>
        <p className="text-sm text-gray-500">{total} đơn hàng</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Tìm mã đơn hàng..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="refunded">Hoàn trả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Khách hàng</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tổng tiền</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Thanh toán</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Thời gian</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-16"></th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Chưa có đơn hàng</p>
                  </td></tr>
                )}
                {orders.map((o, i) => {
                  const st = orderStatusMap[o.status] || orderStatusMap.pending;
                  return (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-blue-600">{o.orderNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">{o.customer?.name || 'Khách lẻ'}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(o.total)}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell"><span className="text-xs text-gray-600">{paymentMethodMap[o.paymentMethod] || o.paymentMethod}</span></td>
                      <td className="py-3 px-4 text-center"><Badge variant="secondary" className={`text-xs ${st.color}`}>{st.label}</Badge></td>
                      <td className="py-3 px-4 text-xs text-gray-500 text-right hidden lg:table-cell">{formatDateTime(o.createdAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết đơn #{selectedOrder?.orderNumber}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Khách hàng:</span><span className="font-medium">{selectedOrder.customer?.name || 'Khách lẻ'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Thanh toán:</span><span>{paymentMethodMap[selectedOrder.paymentMethod]}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Thời gian:</span><span>{formatDateTime(selectedOrder.createdAt)}</span></div>
              </div>
              <div className="space-y-2">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <div><span className="font-medium">{item.productName}</span><span className="text-gray-500 ml-2">x{item.quantity}</span></div>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-right">
                <span className="text-blue-700 font-bold text-lg">{formatCurrency(selectedOrder.total)}</span>
              </div>
              {selectedOrder.status === 'completed' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateStatus(selectedOrder.id, 'cancelled')} className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-sm">Hủy đơn</Button>
                  <Button variant="outline" onClick={() => updateStatus(selectedOrder.id, 'refunded')} className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 rounded-xl text-sm">Hoàn trả</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
