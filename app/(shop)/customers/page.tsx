'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Users, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

interface Customer { id: string; name: string; phone: string; email?: string; address?: string; totalOrders: number; totalSpent: number; points: number; note?: string; }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', note: '' });

  const fetchCustomers = async () => {
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    try { const res = await fetch(`/api/customers?${params}`); const d = await res.json(); setCustomers(d.customers || []); } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const openCreate = () => { setEditCust(null); setForm({ name: '', phone: '', email: '', address: '', note: '' }); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditCust(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', note: c.note || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Tên và SĐT là bắt buộc'); return; }
    setSaving(true);
    try {
      const url = editCust ? `/api/customers/${editCust.id}` : '/api/customers';
      const res = await fetch(url, { method: editCust ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(editCust ? 'Cập nhật thành công!' : 'Thêm khách hàng thành công!');
      setShowForm(false); fetchCustomers();
    } catch (err) { toast.error((err as Error).message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa khách hàng này?')) return;
    try { await fetch(`/api/customers/${id}`, { method: 'DELETE' }); toast.success('Đã xóa'); fetchCustomers(); } catch { toast.error('Lỗi xóa'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900">Khách hàng</h1><p className="text-sm text-gray-500">{customers.length} khách hàng</p></div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-md shadow-blue-100"><Plus className="w-4 h-4" /> Thêm khách hàng</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Tìm theo tên, SĐT, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" /><p className="font-medium">Chưa có khách hàng</p>
          </div>
        )}
        {customers.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold">{c.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{c.phone}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {c.email && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Mail className="w-3 h-3" />{c.email}</div>}
                {c.address && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2"><MapPin className="w-3 h-3" /><span className="truncate">{c.address}</span></div>}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center"><p className="text-xs text-gray-500">Đơn hàng</p><p className="text-sm font-bold text-gray-900">{c.totalOrders}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-500">Chi tiêu</p><p className="text-sm font-bold text-gray-900">{formatCurrency(c.totalSpent).replace('₫', '').trim()}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-500">Điểm</p><p className="text-sm font-bold text-blue-600">{c.points}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editCust ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Họ tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-xl" /></div>
              <div className="space-y-1.5"><Label>SĐT *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-xl" /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Địa chỉ</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Ghi chú</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded-xl" rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editCust ? 'Cập nhật' : 'Thêm'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
