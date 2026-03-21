'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, FolderTree, Loader2, Search, X, Package, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getCategoryIcon, availableIcons } from '@/lib/icons';
import toast from 'react-hot-toast';

interface Category { id: string; name: string; description?: string; icon?: string; productCount: number; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
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

  const handleDelete = async (cat: Category) => {
    try {
      await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      toast.success('Đã xóa danh mục');
      setShowDeleteConfirm(null);
      fetchCategories();
    } catch { toast.error('Lỗi xóa danh mục'); }
  };

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Danh mục</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {categories.length} danh mục · {totalProducts} sản phẩm
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2 shadow-md shadow-blue-100 h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Thêm danh mục
        </Button>
      </div>

      {/* Search */}
      {categories.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tìm danh mục..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9 sm:h-10 rounded-lg text-sm bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-16 text-gray-400"
            >
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{search ? 'Không tìm thấy danh mục' : 'Chưa có danh mục nào'}</p>
              <p className="text-xs mt-1">{search ? 'Thử từ khóa khác' : 'Nhấn "Thêm danh mục" để bắt đầu'}</p>
            </motion.div>
          )}
          {filtered.map((c, i) => {
            const IconComp = getCategoryIcon(c.icon);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                layout
              >
                <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Top color accent */}
                    <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />

                    <div className="p-4 sm:p-5">
                      {/* Icon + Info + Actions row */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center flex-shrink-0 ring-1 ring-blue-100/50">
                          <IconComp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{c.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-[11px] sm:text-xs text-gray-500">{c.productCount} sản phẩm</span>
                          </div>
                        </div>

                        {/* Action buttons - always visible on mobile */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(c)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {c.description && (
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-2.5 line-clamp-2 leading-relaxed pl-14 sm:pl-[60px]">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Summary card */}
      {categories.length > 0 && (
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm rounded-xl">
          <CardContent className="py-3 sm:py-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-blue-700">
                <span>Tổng: <strong>{categories.length}</strong> danh mục</span>
                <span>·</span>
                <span><strong>{totalProducts}</strong> sản phẩm</span>
                {categories.filter(c => c.productCount === 0).length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-orange-600"><strong>{categories.filter(c => c.productCount === 0).length}</strong> danh mục trống</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm mx-4 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {editCat ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
              {editCat ? 'Sửa danh mục' : 'Thêm danh mục'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Tên danh mục *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Điện thoại, Phụ kiện..." className="h-10 rounded-lg text-sm" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Biểu tượng</Label>
              <Select value={form.icon} onValueChange={(v: string | null) => v && setForm({ ...form, icon: v })}>
                <SelectTrigger className="h-10 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
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
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn về danh mục..." className="rounded-lg text-sm" rows={2} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-lg h-10">Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 h-10">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editCat ? 'Cập nhật' : 'Thêm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-xs mx-4 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600">
              <Trash2 className="w-5 h-5" /> Xóa danh mục
            </DialogTitle>
          </DialogHeader>
          {showDeleteConfirm && (
            <div className="space-y-4 mt-1">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-700">
                  Bạn có chắc muốn xóa danh mục <strong>&ldquo;{showDeleteConfirm.name}&rdquo;</strong>?
                </p>
                {showDeleteConfirm.productCount > 0 && (
                  <Badge className="mt-2 bg-orange-100 text-orange-700 text-xs">
                    ⚠️ Có {showDeleteConfirm.productCount} sản phẩm trong danh mục này
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-lg h-10">Hủy</Button>
                <Button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg h-10">Xóa</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
