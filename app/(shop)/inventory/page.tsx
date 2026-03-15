'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Warehouse, ArrowDownToLine, ArrowUpFromLine, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

interface Product { id: string; name: string; sku: string; stock: number; minStock: number; unit: string; price: number }
interface Log { id: string; action: string; quantity: number; previousStock: number; newStock: number; note?: string; createdAt: string; productId?: { name: string; sku: string }; createdBy?: { name: string } }

const actionLabels: Record<string, { label: string; color: string }> = {
  import: { label: 'Nhập kho', color: 'bg-green-100 text-green-800' },
  export: { label: 'Xuất kho', color: 'bg-orange-100 text-orange-800' },
  adjustment: { label: 'Kiểm kê', color: 'bg-blue-100 text-blue-800' },
  sale: { label: 'Bán hàng', color: 'bg-purple-100 text-purple-800' },
  return: { label: 'Hoàn trả', color: 'bg-cyan-100 text-cyan-800' },
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAction, setShowAction] = useState(false);
  const [actionType, setActionType] = useState<'import' | 'export' | 'adjustment'>('import');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200&active=true').then((r) => r.json()),
      fetch('/api/inventory?limit=50').then((r) => r.json()),
    ]).then(([pData, lData]) => {
      setProducts(pData.products || []);
      setLogs(lData.logs || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) { toast.error('Vui lòng chọn sản phẩm và số lượng'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct, action: actionType, quantity: Number(quantity), note }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Cập nhật kho thành công!');
      setShowAction(false); setQuantity(''); setNote('');
      // Refresh
      const [pData, lData] = await Promise.all([
        fetch('/api/products?limit=200&active=true').then((r) => r.json()),
        fetch('/api/inventory?limit=50').then((r) => r.json()),
      ]);
      setProducts(pData.products || []);
      setLogs(lData.logs || []);
    } catch (err) { toast.error((err as Error).message); }
    setSaving(false);
  };

  const lowStock = products.filter((p) => p.stock <= (p.minStock || 5));
  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900">Kho hàng</h1><p className="text-sm text-gray-500">{products.length} sản phẩm • {lowStock.length} sắp hết hàng</p></div>
        <div className="flex gap-2">
          <Button onClick={() => { setActionType('import'); setShowAction(true); }} className="bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 text-sm"><ArrowDownToLine className="w-4 h-4" /> Nhập kho</Button>
          <Button onClick={() => { setActionType('export'); setShowAction(true); }} variant="outline" className="rounded-xl gap-2 text-sm border-orange-200 text-orange-700 hover:bg-orange-50"><ArrowUpFromLine className="w-4 h-4" /> Xuất kho</Button>
        </div>
      </div>

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-800">⚠️ Sản phẩm sắp hết hàng ({lowStock.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 8).map((p) => (
                <Badge key={p.id} variant="secondary" className="bg-amber-100 text-amber-800 text-xs">{p.name}: <strong className="ml-1">{p.stock}</strong></Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock list */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Tìm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white rounded-xl" />
      </div>

      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Mã SKU</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Giá bán</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Giá trị kho</th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell font-mono">{p.sku}</td>
                    <td className="py-3 px-4 text-sm text-right">{formatCurrency(p.price)}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="secondary" className={`text-xs ${p.stock <= (p.minStock || 5) ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{p.stock} {p.unit}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right hidden md:table-cell">{formatCurrency(p.stock * p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Logs */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Lịch sử thao tác kho</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Chưa có thao tác kho nào</p>}
            {logs.map((l) => {
              const a = actionLabels[l.action] || actionLabels.adjustment;
              return (
                <div key={l.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Badge variant="secondary" className={`text-xs min-w-[72px] justify-center ${a.color}`}>{a.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.productId?.name || '—'}</p>
                    <p className="text-xs text-gray-500">{l.previousStock} → {l.newStock} ({l.quantity > 0 ? '+' : ''}{l.quantity})</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(l.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Dialog */}
      <Dialog open={showAction} onOpenChange={setShowAction}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{actionType === 'import' ? '📥 Nhập kho' : actionType === 'export' ? '📤 Xuất kho' : '📋 Kiểm kê'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Sản phẩm *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                <SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} (Kho: {p.stock})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Số lượng *</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10 rounded-xl" placeholder="0" /></div>
            <div className="space-y-1.5"><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10 rounded-xl" placeholder="Ghi chú..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAction(false)} className="rounded-xl">Hủy</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Xác nhận</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
