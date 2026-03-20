'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Package, Loader2, Filter,
  MoreVertical, X, ChevronDown, Eye, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { getProductIcon, availableIcons } from '@/lib/icons';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: { name: string };
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  image?: string;
  description?: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', categoryId: '', price: '',
    costPrice: '', stock: '', minStock: '5', unit: 'Chiếc', description: '', image: 'package',
  });

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100', active: 'true' });
      if (search) params.set('search', search);
      if (filterCategory !== 'all') params.set('categoryId', filterCategory);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch { toast.error('Lỗi tải sản phẩm'); }
  }, [search, filterCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data || []);
    } catch { /* skip */ }
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]).then(() => setLoading(false));
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [search, filterCategory, fetchProducts]);

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', barcode: '', categoryId: categories[0]?.id || '', price: '', costPrice: '', stock: '', minStock: '5', unit: 'Chiếc', description: '', image: 'package' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, barcode: p.barcode || '', categoryId: p.categoryId,
      price: p.price.toString(), costPrice: p.costPrice.toString(),
      stock: p.stock.toString(), minStock: (p.minStock || 5).toString(),
      unit: p.unit, description: p.description || '', image: p.image || 'package',
    });
    setShowForm(true);
    setActionMenuId(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.price || !form.categoryId) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        costPrice: Number(form.costPrice) || 0,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 5,
      };
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = editProduct ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(editProduct ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi lưu sản phẩm');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    setActionMenuId(null);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch {
      toast.error('Lỗi xóa sản phẩm');
    }
  };

  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 5)).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        <p className="text-sm text-gray-400">Đang tải sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
            Sản phẩm
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm text-gray-500">{products.length} sản phẩm</span>
            {lowStockCount > 0 && (
              <Badge className="bg-amber-50 text-amber-700 text-[10px] sm:text-xs gap-1 px-1.5">
                <AlertTriangle className="w-3 h-3" />
                {lowStockCount} sắp hết
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1.5 sm:gap-2 shadow-md shadow-blue-100 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Thêm</span>
          <span className="hidden sm:inline"> sản phẩm</span>
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-white rounded-lg border-gray-200 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`sm:hidden flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
              filterCategory !== 'all' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {/* Desktop Filter */}
          <div className="hidden sm:block">
            <Select value={filterCategory} onValueChange={(v: string | null) => v !== null && setFilterCategory(v)}>
              <SelectTrigger className="w-48 h-10 rounded-lg bg-white border-gray-200">
                <Filter className="w-4 h-4 text-gray-400 mr-2" />
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Filter Dropdown */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden overflow-hidden"
            >
              <div className="flex gap-2 flex-wrap pb-1">
                <button
                  onClick={() => { setFilterCategory('all'); setShowFilter(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setFilterCategory(c.id); setShowFilter(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterCategory === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">Chưa có sản phẩm nào</p>
            <p className="text-gray-400 text-sm mb-4">Thêm sản phẩm mới để bắt đầu bán hàng</p>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
              <Plus className="w-4 h-4" /> Thêm sản phẩm
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== MOBILE: Card Layout ===== */}
      {products.length > 0 && (
        <div className="md:hidden space-y-2">
          {products.map((p, i) => {
            const IconComp = getProductIcon(p.image);
            const isLowStock = p.stock <= (p.minStock || 5);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="bg-white border-gray-100 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isLowStock ? 'bg-amber-50' : 'bg-blue-50'
                      }`}>
                        <IconComp className={`w-5 h-5 ${isLowStock ? 'text-amber-600' : 'text-blue-600'}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-gray-400 font-mono">{p.sku}</span>
                              {p.category?.name && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{p.category.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Action Menu */}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === p.id ? null : p.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {actionMenuId === p.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden min-w-[130px]"
                                >
                                  <button
                                    onClick={() => openEdit(p)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" /> Chỉnh sửa
                                  </button>
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" /> Xóa
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Price + Stock row */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-blue-700">{formatCurrency(p.price)}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] ${isLowStock ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-600'}`}
                          >
                            {isLowStock && <AlertTriangle className="w-3 h-3 mr-0.5" />}
                            {p.stock} {p.unit}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== DESKTOP: Table Layout ===== */}
      {products.length > 0 && (
        <Card className="bg-white border-gray-100 shadow-sm overflow-hidden rounded-xl hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Mã SKU</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Danh mục</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Giá bán</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const IconComp = getProductIcon(p.image);
                    const isLowStock = p.stock <= (p.minStock || 5);
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isLowStock ? 'bg-amber-50' : 'bg-blue-50'
                            }`}>
                              <IconComp className={`w-5 h-5 ${isLowStock ? 'text-amber-600' : 'text-blue-600'}`} />
                            </div>
                            <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">{p.sku}</td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                            {p.category?.name || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.price)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${isLowStock ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                          >
                            {isLowStock && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {p.stock} {p.unit}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-2 rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close action menu when clicking outside */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Tên sản phẩm *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iPhone 15 Pro Max" className="h-10 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Mã SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="IP15PM" className="h-10 rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="8901234..." className="h-10 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Danh mục *</Label>
                <Select value={form.categoryId} onValueChange={(v: string | null) => v && setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="h-10 rounded-lg text-sm">
                    <SelectValue placeholder="Chọn danh mục">
                      {categories.find(c => c.id === form.categoryId)?.name || 'Chọn danh mục'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Biểu tượng</Label>
                <Select value={form.image} onValueChange={(v: string | null) => v && setForm({ ...form, image: v })}>
                  <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableIcons.map((ic) => {
                      const IC = getProductIcon(ic.name);
                      return (
                        <SelectItem key={ic.name} value={ic.name}>
                          <span className="flex items-center gap-2"><IC className="w-4 h-4" /> {ic.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Giá bán *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" className="h-10 rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Giá vốn</Label>
                <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0" className="h-10 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Tồn kho</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="h-10 rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Tối thiểu</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="5" className="h-10 rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Đơn vị</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Chiếc" className="h-10 rounded-lg text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sản phẩm..." className="rounded-lg text-sm" rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 sm:flex-none rounded-lg text-sm h-10">Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 text-sm h-10">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editProduct ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
