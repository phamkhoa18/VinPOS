'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCog, Search, Plus, Edit, Trash2, Loader2, ShieldCheck, Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface UserData { id: string; name: string; email: string; phone: string; role: string; isActive: boolean; createdAt: string }

const roleMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800', icon: <ShieldCheck className="w-3 h-3" /> },
  shop_owner: { label: 'Chủ cửa hàng', color: 'bg-blue-100 text-blue-800', icon: <Store className="w-3 h-3" /> },
  employee: { label: 'Nhân viên', color: 'bg-gray-100 text-gray-800', icon: <User className="w-3 h-3" /> },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'shop_owner' });

  const fetchUsers = async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    try { const res = await fetch(`/api/users?${params}`); const d = await res.json(); setUsers(d.users || []); } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Vui lòng điền đầy đủ'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Tạo user thành công!');
      setShowForm(false); fetchUsers();
    } catch (err) { toast.error((err as Error).message); }
    setSaving(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !isActive }) });
      toast.success(isActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
      fetchUsers();
    } catch { toast.error('Lỗi'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900">Quản lý người dùng</h1><p className="text-sm text-gray-500">{users.length} người dùng</p></div>
        <Button onClick={() => { setForm({ name: '', email: '', phone: '', password: '', role: 'shop_owner' }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"><Plus className="w-4 h-4" /> Thêm user</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Tìm theo tên, email, SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white rounded-xl" />
      </div>

      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Người dùng</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-20">Thao tác</th>
              </tr></thead>
              <tbody>
                {users.map((u, i) => {
                  const r = roleMap[u.role] || roleMap.employee;
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center"><span className="text-white font-semibold text-sm">{u.name.charAt(0)}</span></div>
                          <div><p className="font-medium text-sm text-gray-900">{u.name}</p><p className="text-xs text-gray-500">{u.phone}</p></div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">{u.email}</td>
                      <td className="py-3 px-4 text-center"><Badge variant="secondary" className={`text-xs gap-1 ${r.color}`}>{r.icon} {r.label}</Badge></td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className={`text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => toggleActive(u.id, u.isActive)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          {u.isActive ? 'Khóa' : 'Mở'}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Thêm người dùng</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Họ tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>SĐT</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Mật khẩu *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Vai trò</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="shop_owner">Chủ cửa hàng</SelectItem>
                  <SelectItem value="employee">Nhân viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Hủy</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Tạo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
