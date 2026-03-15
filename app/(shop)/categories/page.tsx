'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, FolderTree, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getCategoryIcon, availableIcons } from '@/lib/icons';
import toast from 'react-hot-toast';

interface Category { id: string; name: string; description?: string; icon?: string; productCount: number; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: 'package' });

  const fetchCategories = async () => {
    try { const res = await fetch('/api/categories'); setCategories(await res.json()); } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => { setEditCat(null); setForm({ name: '', description: '', icon: 'package' }); setShowForm(true); };
  const openEdit = (c: Category) => { setEditCat(c); setForm({ name: c.name, description: c.description || '', icon: c.icon || 'package' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Tên danh mục là bắt buộc'); return; }
    setSaving(true);
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories';
      const res = await fetch(url, { method: editCat ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(editCat ? 'Cập nhật thành công!' : 'Thêm danh mục thành công!');
      setShowForm(false); fetchCategories();
    } catch (err) { toast.error((err as Error).message || 'Lỗi'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return;
    try { await fetch(`/api/categories/${id}`, { method: 'DELETE' }); toast.success('Đã xóa'); fetchCategories(); } catch { toast.error('Lỗi xóa'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Danh mục</h1>
          <p className="text-sm text-gray-500">{categories.length} danh mục</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2 shadow-md shadow-blue-100">
          <Plus className="w-4 h-4" /> Thêm danh mục
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <FolderTree className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Chưa có danh mục nào</p>
          </div>
        )}
        {categories.map((c, i) => {
          const IconComp = getCategoryIcon(c.icon);
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow group rounded-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                        <IconComp className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{c.name}</h3>
                        <p className="text-xs text-gray-500">{c.productCount} sản phẩm</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mt-3">{c.description}</p>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editCat ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg" /></div>
            <div className="space-y-1.5">
              <Label>Biểu tượng</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableIcons.map((ic) => {
                    const IC = getCategoryIcon(ic.name);
                    return (
                      <SelectItem key={ic.name} value={ic.name}>
                        <span className="flex items-center gap-2"><IC className="w-4 h-4" /> {ic.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Mô tả</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-lg">Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editCat ? 'Cập nhật' : 'Thêm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
