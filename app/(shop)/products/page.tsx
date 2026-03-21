'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Package, Loader2, Filter,
  MoreVertical, X, AlertTriangle, FileSpreadsheet, Upload,
  Download, CheckCircle2, XCircle, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatVNInput, parseVNInput } from '@/lib/format';
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
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab] = useState<'manual' | 'excel'>('manual');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', categoryId: '', price: '',
    costPrice: '', stock: '', minStock: '5', unit: 'Chiếc', description: '', image: 'package',
  });

  // VN money input handler
  const handleMoneyInput = (field: 'price' | 'costPrice', value: string) => {
    const num = parseVNInput(value);
    setForm(prev => ({ ...prev, [field]: num ? formatVNInput(num) : '' }));
  };

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
      price: p.price ? formatVNInput(p.price) : '',
      costPrice: p.costPrice ? formatVNInput(p.costPrice) : '',
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
        price: parseVNInput(form.price),
        costPrice: parseVNInput(form.costPrice) || 0,
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

  // ===== EXPORT EXCEL =====
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');

      // Fetch all products
      const res = await fetch('/api/products?limit=10000&active=true');
      const data = await res.json();
      const allProducts: Product[] = data.products || products;

      const rows = allProducts.map((p, i) => ({
        'STT': i + 1,
        'Tên sản phẩm': p.name,
        'Mã SKU': p.sku,
        'Barcode': p.barcode || '',
        'Danh mục': p.category?.name || '',
        'Giá bán': p.price,
        'Giá vốn': p.costPrice,
        'Tồn kho': p.stock,
        'Tồn kho tối thiểu': p.minStock || 5,
        'Đơn vị': p.unit,
        'Mô tả': p.description || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },  // STT
        { wch: 30 }, // Tên
        { wch: 14 }, // SKU
        { wch: 18 }, // Barcode
        { wch: 16 }, // Danh mục
        { wch: 14 }, // Giá bán
        { wch: 14 }, // Giá vốn
        { wch: 10 }, // Tồn kho
        { wch: 14 }, // Tồn kho tối thiểu
        { wch: 10 }, // Đơn vị
        { wch: 30 }, // Mô tả
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');

      // Create template sheet for importing
      const templateRows = [
        {
          'Tên sản phẩm': 'Ví dụ: iPhone 15',
          'Mã SKU': 'IP15',
          'Barcode': '8901234567890',
          'Danh mục': categories[0]?.name || 'Điện thoại',
          'Giá bán': 25000000,
          'Giá vốn': 20000000,
          'Tồn kho': 10,
          'Tồn kho tối thiểu': 5,
          'Đơn vị': 'Chiếc',
          'Mô tả': 'Mô tả sản phẩm',
        },
      ];
      const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
      wsTemplate['!cols'] = [
        { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
        { wch: 10 }, { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Mẫu Import');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `SanPham_${dateStr}.xlsx`);
      toast.success(`Đã xuất ${allProducts.length} sản phẩm + mẫu import`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // ===== IMPORT EXCEL =====
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      // Read first sheet
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error('File Excel rỗng');
        return;
      }

      // Validate required columns
      const errors: string[] = [];
      const validRows: Record<string, string>[] = [];

      rows.forEach((row, i) => {
        const name = row['Tên sản phẩm'] || row['Ten san pham'] || '';
        const sku = row['Mã SKU'] || row['Ma SKU'] || row['SKU'] || '';
        const price = row['Giá bán'] || row['Gia ban'] || row['Price'] || '0';

        if (!name) errors.push(`Dòng ${i + 2}: Thiếu "Tên sản phẩm"`);
        if (!sku) errors.push(`Dòng ${i + 2}: Thiếu "Mã SKU"`);
        if (!Number(price)) errors.push(`Dòng ${i + 2}: "Giá bán" không hợp lệ`);

        validRows.push(row);
      });

      setImportPreview(validRows);
      setImportErrors(errors);
      setShowImport(true);
    } catch {
      toast.error('Không đọc được file Excel');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of importPreview) {
      try {
        const name = row['Tên sản phẩm'] || row['Ten san pham'] || '';
        const sku = row['Mã SKU'] || row['Ma SKU'] || row['SKU'] || '';
        const price = Number(row['Giá bán'] || row['Gia ban'] || row['Price'] || 0);
        if (!name || !sku || !price) { failCount++; continue; }

        const categoryName = row['Danh mục'] || row['Danh muc'] || row['Category'] || '';
        const matchedCategory = categories.find(c =>
          c.name.toLowerCase() === categoryName.toLowerCase()
        );

        const body = {
          name,
          sku,
          barcode: row['Barcode'] || '',
          categoryId: matchedCategory?.id || categories[0]?.id || '',
          price,
          costPrice: Number(row['Giá vốn'] || row['Gia von'] || row['Cost'] || 0),
          stock: Number(row['Tồn kho'] || row['Ton kho'] || row['Stock'] || 0),
          minStock: Number(row['Tồn kho tối thiểu'] || row['Min Stock'] || 5),
          unit: row['Đơn vị'] || row['Don vi'] || row['Unit'] || 'Chiếc',
          description: row['Mô tả'] || row['Mo ta'] || row['Description'] || '',
          image: 'package',
        };

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setImporting(false);
    setShowImport(false);
    setImportPreview([]);
    setImportErrors([]);
    fetchProducts();

    if (successCount > 0) toast.success(`Đã import ${successCount} sản phẩm`);
    if (failCount > 0) toast.error(`${failCount} sản phẩm lỗi`);
  };

  // ===== DOWNLOAD TEMPLATE =====
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const templateRows = [
        {
          'Tên sản phẩm': 'Áo thun nam',
          'Mã SKU': 'ATN-001',
          'Barcode': '8901234567890',
          'Danh mục': categories[0]?.name || 'Thời trang',
          'Giá bán': 150000,
          'Giá vốn': 80000,
          'Tồn kho': 50,
          'Tồn kho tối thiểu': 10,
          'Đơn vị': 'Chiếc',
          'Mô tả': 'Áo thun cotton thoáng mát',
        },
        {
          'Tên sản phẩm': 'Quần jean nữ',
          'Mã SKU': 'QJN-001',
          'Barcode': '',
          'Danh mục': categories[0]?.name || 'Thời trang',
          'Giá bán': 350000,
          'Giá vốn': 200000,
          'Tồn kho': 30,
          'Tồn kho tối thiểu': 5,
          'Đơn vị': 'Chiếc',
          'Mô tả': '',
        },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateRows);
      ws['!cols'] = [
        { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
        { wch: 10 }, { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Mẫu Import');
      XLSX.writeFile(wb, 'Mau_Import_SanPham.xlsx');
      toast.success('Đã tải mẫu Excel');
    } catch {
      toast.error('Lỗi tạo file mẫu');
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

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="space-y-4">
      {/* ===== PREMIUM HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-4 sm:p-5 text-white shadow-lg shadow-blue-200/50">
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -right-2 top-10 w-16 h-16 bg-white/5 rounded-full" />
        <div className="absolute left-1/2 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Sản phẩm
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">{products.length} sản phẩm trong kho</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setShowImport(true); setImportTab('manual'); }}
                className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs text-white hover:bg-white/25 transition-colors border border-white/20"
                title="Import sản phẩm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs text-white hover:bg-white/25 disabled:opacity-50 transition-colors border border-white/20"
                title="Xuất Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{exporting ? '...' : 'Xuất'}</span>
              </button>
              <Button onClick={openCreate} className="bg-white text-blue-600 hover:bg-blue-50 rounded-lg gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3.5 shadow-md font-semibold">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Thêm SP</span>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
              <p className="text-[10px] sm:text-xs text-blue-100 uppercase tracking-wider">Tổng SP</p>
              <p className="text-base sm:text-lg font-bold">{products.length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
              <p className="text-[10px] sm:text-xs text-blue-100 uppercase tracking-wider">Sắp hết</p>
              <p className="text-base sm:text-lg font-bold">{lowStockCount}
                {lowStockCount > 0 && <AlertTriangle className="w-3 h-3 inline ml-1 text-amber-300" />}
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
              <p className="text-[10px] sm:text-xs text-blue-100 uppercase tracking-wider">Giá trị</p>
              <p className="text-sm sm:text-base font-bold truncate">{totalValue >= 1000000 ? `${(totalValue / 1000000).toFixed(1)}tr` : formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SEARCH + FILTER ===== */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm sản phẩm, mã SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-white rounded-xl border-gray-200 text-sm shadow-sm focus:shadow-md transition-shadow"
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
            className={`sm:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-all shadow-sm ${
              filterCategory !== 'all' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-blue-100' : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {/* Desktop Filter */}
          <div className="hidden sm:block">
            <Select value={filterCategory} onValueChange={(v: string | null) => v !== null && setFilterCategory(v)}>
              <SelectTrigger className="w-48 h-10 rounded-xl bg-white border-gray-200 shadow-sm">
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

        {/* Mobile Filter Chips */}
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${
                    filterCategory === 'all' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setFilterCategory(c.id); setShowFilter(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${
                      filterCategory === c.id ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
        <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
              <Package className="w-10 h-10 text-blue-300" />
            </div>
            <p className="text-gray-700 font-semibold text-base mb-1">Chưa có sản phẩm nào</p>
            <p className="text-gray-400 text-sm mb-5">Thêm sản phẩm để bắt đầu bán hàng</p>
            <div className="flex gap-2">
              <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 shadow-md shadow-blue-200">
                <Plus className="w-4 h-4" /> Thêm sản phẩm
              </Button>
              <Button variant="outline" onClick={() => { setShowImport(true); setImportTab('excel'); }} className="rounded-xl gap-2">
                <Upload className="w-4 h-4" /> Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== MOBILE: Premium Card Layout ===== */}
      {products.length > 0 && (
        <div className="md:hidden space-y-2.5">
          {products.map((p, i) => {
            const IconComp = getProductIcon(p.image);
            const isLowStock = p.stock <= (p.minStock || 5);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="flex">
                    {/* Left accent bar */}
                    <div className={`w-1 flex-shrink-0 ${isLowStock ? 'bg-gradient-to-b from-amber-400 to-orange-400' : 'bg-gradient-to-b from-blue-400 to-indigo-500'}`} />

                    <div className="flex-1 p-3.5">
                      <div className="flex items-start gap-3">
                        {/* Product Icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isLowStock
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100'
                            : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100'
                        }`}>
                          <IconComp className={`w-5 h-5 ${isLowStock ? 'text-amber-600' : 'text-blue-600'}`} />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-[15px] leading-tight truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{p.sku}</span>
                            {p.category?.name && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{p.category.name}</span>
                            )}
                          </div>
                        </div>

                        {/* 3-dot menu */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actionMenuId === p.id) {
                              setActionMenuId(null);
                              setMenuPos(null);
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setActionMenuId(p.id);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors flex-shrink-0 -mr-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price + Stock row */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
                        <div>
                          <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{formatCurrency(p.price)}</span>
                          {p.costPrice > 0 && (
                            <span className="text-[10px] text-gray-400 ml-1.5">vốn {formatCurrency(p.costPrice)}</span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${
                          isLowStock
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                          {isLowStock && <AlertTriangle className="w-3 h-3" />}
                          <span>{p.stock}</span>
                          <span className="text-gray-400">{p.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Mobile fixed action menu portal */}
      <AnimatePresence>
        {actionMenuId && menuPos && (
          <>
            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] md:hidden" onClick={() => { setActionMenuId(null); setMenuPos(null); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="fixed z-50 md:hidden bg-white rounded-2xl shadow-2xl shadow-black/15 min-w-[160px] border border-gray-100 overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={() => { const p = products.find(x => x.id === actionMenuId); if (p) openEdit(p); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Edit className="w-4 h-4" /> Chỉnh sửa
              </button>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={() => { if (actionMenuId) handleDelete(actionMenuId); setMenuPos(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Xóa sản phẩm
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Giá vốn</th>
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
                        <td className="py-3 px-4 text-right hidden lg:table-cell">
                          <span className="text-sm text-gray-500">{p.costPrice ? formatCurrency(p.costPrice) : '—'}</span>
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

      {/* Close action menu when clicking outside - desktop only */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10 hidden md:block" onClick={() => { setActionMenuId(null); setMenuPos(null); }} />
      )}

      {/* ===== CREATE/EDIT DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              {editProduct ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
              {editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </DialogTitle>
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

            {/* Money inputs with VN format */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Giá bán * (₫)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => handleMoneyInput('price', e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-lg text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₫</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Giá vốn (₫)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.costPrice}
                    onChange={(e) => handleMoneyInput('costPrice', e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-lg text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₫</span>
                </div>
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

            {/* Price preview */}
            {(form.price || form.costPrice) && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Giá bán:</span>
                  <span className="font-bold text-blue-700">{form.price ? formatCurrency(parseVNInput(form.price)) : '—'}</span>
                </div>
                {form.costPrice && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-blue-600">Giá vốn:</span>
                    <span className="text-blue-600">{formatCurrency(parseVNInput(form.costPrice))}</span>
                  </div>
                )}
                {form.price && form.costPrice && (
                  <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-blue-200">
                    <span className="text-green-600">Lợi nhuận:</span>
                    <span className="font-bold text-green-700">{formatCurrency(parseVNInput(form.price) - parseVNInput(form.costPrice))}</span>
                  </div>
                )}
              </div>
            )}

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

      {/* ===== IMPORT DIALOG (2 TABS) ===== */}
      <Dialog open={showImport} onOpenChange={(open) => { setShowImport(open); if (!open) { setImportPreview([]); setImportErrors([]); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto rounded-xl p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Import sản phẩm
            </DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 px-4 sm:px-6">
            <button
              onClick={() => setImportTab('manual')}
              className={`flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors ${
                importTab === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Nhập tay
            </button>
            <button
              onClick={() => setImportTab('excel')}
              className={`flex-1 py-2.5 text-sm font-medium text-center border-b-2 transition-colors ${
                importTab === 'excel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Import Excel
            </button>
          </div>

          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {importTab === 'manual' ? (
              /* ===== TAB 1: MANUAL ENTRY ===== */
              <div className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Tên sản phẩm <span className="text-red-500">*</span></Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: iPhone 15 Pro Max" className="h-10 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Mã SKU <span className="text-red-500">*</span></Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="VD: IP15PM" className="h-10 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Barcode</Label>
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="(Tùy chọn)" className="h-10 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Danh mục <span className="text-red-500">*</span></Label>
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
                    <Label className="text-xs sm:text-sm">Giá bán <span className="text-red-500">*</span> (₫)</Label>
                    <div className="relative">
                      <Input type="text" inputMode="numeric" value={form.price} onChange={(e) => handleMoneyInput('price', e.target.value)} placeholder="0" className="h-10 rounded-lg text-sm pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₫</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Giá vốn (₫)</Label>
                    <div className="relative">
                      <Input type="text" inputMode="numeric" value={form.costPrice} onChange={(e) => handleMoneyInput('costPrice', e.target.value)} placeholder="0" className="h-10 rounded-lg text-sm pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₫</span>
                    </div>
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
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sản phẩm (tùy chọn)" className="rounded-lg text-sm" rows={2} />
                </div>

                {/* Price preview */}
                {(form.price || form.costPrice) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600">Giá bán:</span>
                      <span className="font-bold text-blue-700">{form.price ? formatCurrency(parseVNInput(form.price)) : '—'}</span>
                    </div>
                    {form.costPrice && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-blue-600">Giá vốn:</span>
                        <span className="text-blue-600">{formatCurrency(parseVNInput(form.costPrice))}</span>
                      </div>
                    )}
                    {form.price && form.costPrice && (
                      <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-blue-200">
                        <span className="text-green-600">Lợi nhuận:</span>
                        <span className="font-bold text-green-700">{formatCurrency(parseVNInput(form.price) - parseVNInput(form.costPrice))}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowImport(false)} className="flex-1 rounded-lg text-sm h-10">Hủy</Button>
                  <Button onClick={() => { handleSave(); setShowImport(false); }} disabled={saving} className="flex-[2] bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 text-sm h-10">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Thêm sản phẩm
                  </Button>
                </div>
              </div>
            ) : (
              /* ===== TAB 2: EXCEL IMPORT ===== */
              <div className="space-y-4 mt-3">
                {/* Field spec table */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Cấu trúc cột trong file Excel
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-semibold text-gray-500">Tên cột</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-500 w-16">Bắt buộc</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-500">Kiểu</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-500">Ví dụ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { col: 'Tên sản phẩm', required: true, type: 'Văn bản', example: 'Áo thun nam' },
                          { col: 'Mã SKU', required: true, type: 'Văn bản', example: 'ATN-001' },
                          { col: 'Giá bán', required: true, type: 'Số', example: '150000' },
                          { col: 'Giá vốn', required: false, type: 'Số', example: '80000' },
                          { col: 'Danh mục', required: false, type: 'Văn bản', example: 'Thời trang' },
                          { col: 'Barcode', required: false, type: 'Văn bản', example: '8901234567890' },
                          { col: 'Tồn kho', required: false, type: 'Số', example: '50' },
                          { col: 'Tồn kho tối thiểu', required: false, type: 'Số', example: '10' },
                          { col: 'Đơn vị', required: false, type: 'Văn bản', example: 'Chiếc' },
                          { col: 'Mô tả', required: false, type: 'Văn bản', example: 'Mô tả...' },
                        ].map((f, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-1.5 px-3 font-medium text-gray-800">{f.col}</td>
                            <td className="py-1.5 px-3 text-center">
                              {f.required
                                ? <span className="text-red-500 font-bold">✓</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="py-1.5 px-3 text-gray-500">{f.type}</td>
                            <td className="py-1.5 px-3 text-gray-400 font-mono text-[10px]">{f.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-300 group-hover:text-blue-400 transition-colors mb-2" />
                  <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Bấm để chọn file Excel</p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ: .xlsx, .xls, .csv</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Download Template */}
                <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors font-medium">
                  <Download className="w-4 h-4" /> Tải file mẫu Excel
                </button>

                {/* Import preview (after file selected) */}
                {importPreview.length > 0 && (
                  <>
                    {/* Summary */}
                    <div className="flex gap-3">
                      <div className="flex-1 bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-green-700">{importPreview.length}</p>
                        <p className="text-xs text-green-600">Sản phẩm</p>
                      </div>
                      {importErrors.length > 0 && (
                        <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-red-700">{importErrors.length}</p>
                          <p className="text-xs text-red-600">Lỗi</p>
                        </div>
                      )}
                    </div>

                    {/* Errors */}
                    {importErrors.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-24 overflow-y-auto">
                        {importErrors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 flex items-start gap-1.5 mb-1">
                            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {err}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Preview table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left py-2 px-3 font-semibold text-gray-500">#</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-500">Tên SP</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-500">SKU</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-500">Giá bán</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-500">Tồn kho</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 20).map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-1.5 px-3 text-gray-400">{i + 1}</td>
                                <td className="py-1.5 px-3 font-medium text-gray-800 max-w-[200px] truncate">{row['Tên sản phẩm'] || row['Ten san pham'] || ''}</td>
                                <td className="py-1.5 px-3 text-gray-500 font-mono">{row['Mã SKU'] || row['Ma SKU'] || row['SKU'] || ''}</td>
                                <td className="py-1.5 px-3 text-right text-gray-800">{formatCurrency(Number(row['Giá bán'] || row['Gia ban'] || 0))}</td>
                                <td className="py-1.5 px-3 text-right text-gray-500">{row['Tồn kho'] || row['Ton kho'] || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPreview.length > 20 && (
                        <div className="text-center py-2 text-xs text-gray-400 bg-gray-50">
                          ... và {importPreview.length - 20} sản phẩm khác
                        </div>
                      )}
                    </div>

                    {/* Import button */}
                    <Button
                      onClick={handleImportConfirm}
                      disabled={importing}
                      className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 h-10"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {importing ? 'Đang import...' : `Import ${importPreview.length} sản phẩm`}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
