'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Package, Loader2, Filter,
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
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch {
      toast.error('Lỗi xóa sản phẩm');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sản phẩm</h1>
          <p className="text-sm text-gray-500">{products.length} sản phẩm</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2 shadow-md shadow-blue-100">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên, mã SKU, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white rounded-lg border-gray-200"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v: string | null) => v !== null && setFilterCategory(v)}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-lg bg-white border-gray-200">
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

      {/* Products Table */}
      <Card className="bg-white border-gray-100 shadow-sm overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Mã SKU</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Danh mục</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Giá bán</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Tồn kho</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">Chưa có sản phẩm nào</p>
                    </td>
                  </tr>
                )}
                {products.map((p, i) => {
                  const IconComp = getProductIcon(p.image);
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
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <IconComp className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500 md:hidden">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell font-mono">{p.sku}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                          {p.category?.name || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.price)}</span>
                      </td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${p.stock <= (p.minStock || 5) ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {p.stock} {p.unit}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Tên sản phẩm *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iPhone 15 Pro Max" className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mã SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="IP15PM" className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="8901234..." className="h-10 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Danh mục *</Label>
                <Select value={form.categoryId} onValueChange={(v: string | null) => v && setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Biểu tượng</Label>
                <Select value={form.image} onValueChange={(v: string | null) => v && setForm({ ...form, image: v })}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giá bán *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Giá vốn</Label>
                <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0" className="h-10 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tồn kho</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Tồn tối thiểu</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="5" className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Đơn vị</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Chiếc" className="h-10 rounded-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sản phẩm..." className="rounded-lg" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-lg">Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
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
