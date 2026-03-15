'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone,
  Printer, X, User, Loader2, QrCode, ChevronDown, Folder, Hash, Percent,
  StickyNote, Clock, ArrowRight, CheckCircle2, Receipt, Volume2,
  Keyboard, AlertCircle, Tag, Barcode, UserPlus, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/lib/store';
import { formatCurrency, generateReceiptHTML, printReceipt } from '@/lib/format';
import { getProductIcon, getCategoryIcon } from '@/lib/icons';
import toast from 'react-hot-toast';

interface Product {
  id: string; name: string; sku: string; barcode?: string; price: number;
  costPrice: number; stock: number; unit: string; image?: string; categoryId: string;
}
interface Category { id: string; name: string; icon?: string; }
interface Customer { id: string; name: string; phone: string; email?: string; points: number; totalOrders: number; totalSpent: number; }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscount, setShowDiscount] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const {
    items, customerId, customerName, note, paymentMethod, amountPaid,
    addItem, removeItem, updateQuantity, setCustomer, setNote,
    setPaymentMethod, setAmountPaid, clearCart, getSubtotal, getTotal, getItemCount,
    updateDiscount,
  } = useCartStore();

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200&active=true').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/customers?limit=100').then(r => r.json()),
    ]).then(([pData, cData, cuData]) => {
      setProducts(pData.products || []);
      setCategories(cData || []);
      setCustomers(cuData.customers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Filtered products
  const filtered = useMemo(() => products.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) || (p.barcode && p.barcode.includes(search));
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
    return matchSearch && matchCat && p.stock > 0;
  }), [products, search, selectedCat]);

  // Filtered customers
  const filteredCustomers = useMemo(() => customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  ), [customers, customerSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2' && items.length > 0) { e.preventDefault(); handleOpenPayment(); }
      if (e.key === 'F3') { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); setShowCustomerPicker(true); }
      if (e.key === 'F8') { e.preventDefault(); setShowNote(true); }
      if (e.key === 'F9') { e.preventDefault(); clearCart(); toast.success('Đã xóa giỏ hàng!'); }
      if (e.key === 'F12') { e.preventDefault(); setShowShortcuts(true); }
      if (e.key === 'Escape') { setShowPayment(false); setShowCustomerPicker(false); setShowDiscount(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items]);

  // Barcode scanner handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = (e.target as HTMLInputElement).value.trim();
      if (!barcode) return;
      const found = products.find(p => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase());
      if (found) {
        addItem(found);
        toast.success(`Đã thêm: ${found.name}`);
      } else {
        toast.error(`Không tìm thấy sản phẩm: ${barcode}`);
      }
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleOpenPayment = () => {
    if (items.length === 0) { toast.error('Giỏ hàng trống!'); return; }
    setAmountPaid(getTotal());
    setShowPayment(true);
  };

  const handleApplyDiscount = (productId: string) => {
    const val = Number(discountInput);
    if (isNaN(val) || val < 0) { toast.error('Số không hợp lệ'); return; }
    const item = items.find(i => i.product.id === productId);
    if (!item) return;
    const discount = discountType === 'percent' ? Math.round(item.product.price * val / 100) : val;
    if (discount > item.product.price) { toast.error('Giảm giá không được lớn hơn giá sản phẩm'); return; }
    updateDiscount(productId, discount);
    toast.success(`Đã giảm ${formatCurrency(discount)}/sp`);
    setShowDiscount(null);
    setDiscountInput('');
  };

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const orderData = {
        items: items.map(i => ({
          productId: i.product.id, productName: i.product.name, sku: i.product.sku,
          quantity: i.quantity, price: i.product.price, costPrice: i.product.costPrice,
          discount: i.discount, total: (i.product.price - i.discount) * i.quantity,
        })),
        subtotal: getSubtotal(),
        discount: items.reduce((sum, i) => sum + i.discount * i.quantity, 0),
        total: getTotal(),
        amountPaid, changeAmount: Math.max(0, amountPaid - getTotal()),
        paymentMethod, customerId: customerId || undefined, note: note || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }

      const order = await res.json();
      toast.success(`Đơn hàng ${order.orderNumber} thành công!`, { duration: 4000 });

      setLastOrder({ ...orderData, orderNumber: order.orderNumber, createdAt: new Date().toISOString() });
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();

      // Refresh stock
      const pRes = await fetch('/api/products?limit=200&active=true');
      const pData = await pRes.json();
      setProducts(pData.products || []);
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi tạo đơn hàng');
    }
    setProcessing(false);
  };

  const handlePrintReceipt = () => {
    if (!lastOrder) return;
    const html = generateReceiptHTML({
      orderNumber: lastOrder.orderNumber as string,
      items: lastOrder.items as Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>,
      subtotal: lastOrder.subtotal as number, discount: lastOrder.discount as number,
      total: lastOrder.total as number, amountPaid: lastOrder.amountPaid as number,
      changeAmount: lastOrder.changeAmount as number, paymentMethod: lastOrder.paymentMethod as string,
      customerName: customerName || undefined, createdAt: lastOrder.createdAt as string,
      shopName: 'VinPOS Demo Store', shopAddress: '123 Nguyễn Huệ, Q1, HCM', shopPhone: '0912345678',
    });
    printReceipt(html);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-56px)]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const total = getTotal();
  const subtotal = getSubtotal();
  const totalDiscount = items.reduce((s, i) => s + i.discount * i.quantity, 0);
  const itemCount = getItemCount();

  return (
    <div className="h-[calc(100vh-56px)] flex">
      {/* ====== LEFT: Product Browser ====== */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Search & Barcode Bar */}
        <div className="p-3 bg-white border-b border-gray-200">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="Tìm sản phẩm (F1) — tên, mã SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 bg-gray-50 rounded-lg border-gray-200 focus:bg-white text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative w-48">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={barcodeRef}
                placeholder="Quét barcode (F3)"
                onKeyDown={handleBarcodeScan}
                className="pl-10 h-10 bg-gray-50 rounded-lg border-gray-200 focus:bg-white text-sm font-mono"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCat('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                selectedCat === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" /> Tất cả ({products.filter(p => p.stock > 0).length})
            </button>
            {categories.map(c => {
              const CatIcon = getCategoryIcon(c.icon);
              const count = products.filter(p => p.categoryId === c.id && p.stock > 0).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCat === c.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <CatIcon className="w-3.5 h-3.5" /> {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <QrCode className="w-14 h-14 mb-3 opacity-40" />
              <p className="font-medium">Không tìm thấy sản phẩm</p>
              <p className="text-xs mt-1">Thử tìm kiếm khác hoặc chọn danh mục</p>
            </div>
          ) : (
            <div className="pos-grid">
              {filtered.map(p => {
                const inCart = items.find(i => i.product.id === p.id);
                const ProdIcon = getProductIcon(p.image);
                const lowStock = p.stock <= 5;
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (inCart && inCart.quantity >= p.stock) {
                        toast.error(`Hết hàng! Chỉ còn ${p.stock} ${p.unit}`);
                        return;
                      }
                      addItem(p);
                    }}
                    className={`relative bg-white rounded-lg border p-3 text-left transition-all hover:shadow-md hover:border-blue-200 ${
                      inCart ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                    }`}
                  >
                    {/* Stock warning */}
                    {lowStock && (
                      <div className="absolute top-1.5 right-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                    )}

                    <div className="w-full aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md flex items-center justify-center mb-2">
                      <ProdIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1 h-8">{p.name}</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(p.price)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] ${lowStock ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                        Kho: {p.stock} {p.unit}
                      </span>
                      {inCart && (
                        <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-5 rounded-md">
                          x{inCart.quantity}
                        </Badge>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Bottom Shortcuts Bar */}
        <div className="h-10 bg-white border-t border-gray-200 flex items-center gap-4 px-4 text-[10px] text-gray-400 font-mono">
          <span>F1: Tìm kiếm</span>
          <span>F2: Thanh toán</span>
          <span>F3: Quét barcode</span>
          <span>F4: Chọn KH</span>
          <span>F8: Ghi chú</span>
          <span>F9: Xóa giỏ</span>
          <button onClick={() => setShowShortcuts(true)} className="ml-auto flex items-center gap-1 hover:text-gray-600">
            <Keyboard className="w-3 h-3" /> F12: Phím tắt
          </button>
        </div>
      </div>

      {/* ====== RIGHT: Cart Panel ====== */}
      <div className="w-[340px] lg:w-[400px] bg-white border-l border-gray-200 flex flex-col">
        {/* Cart Header */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Giỏ hàng</h3>
              {itemCount > 0 && <Badge className="bg-blue-600 text-white text-xs rounded-md h-5 px-1.5">{itemCount}</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button onClick={() => { clearCart(); toast.success('Đã xóa giỏ hàng'); }} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors">
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>

          {/* Customer selector */}
          <button
            onClick={() => setShowCustomerPicker(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
          >
            {customerId ? (
              <>
                <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-blue-700" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{customerName}</p>
                  <p className="text-[10px] text-gray-500">{customers.find(c => c.id === customerId)?.phone}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setCustomer(null, ''); }} className="text-gray-400 hover:text-red-500 p-1">
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 flex-1">Chọn khách hàng (F4)</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </>
            )}
          </button>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {items.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Giỏ hàng trống</p>
                <p className="text-xs mt-1">Chọn sản phẩm bên trái để thêm</p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 w-4">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-blue-600 font-semibold">{formatCurrency(item.product.price)}</span>
                        {item.discount > 0 && (
                          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                            -{formatCurrency(item.discount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setShowDiscount(item.product.id)}
                        title="Giảm giá"
                        className="p-1 rounded text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <Tag className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pl-4">
                    <div className="flex items-center bg-white rounded-md border border-gray-200">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        className="w-10 h-7 text-center text-sm font-semibold border-0 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency((item.product.price - item.discount) * item.quantity)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Note indicator */}
        {note && (
          <div className="mx-3 mb-1 px-3 py-1.5 bg-yellow-50 border border-yellow-100 rounded-md flex items-center gap-2">
            <StickyNote className="w-3.5 h-3.5 text-yellow-600" />
            <p className="text-xs text-yellow-700 truncate flex-1">{note}</p>
            <button onClick={() => setNote('')} className="text-yellow-500 hover:text-yellow-700"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Cart Summary & Payment */}
        <div className="border-t border-gray-200 p-3 space-y-2 bg-white">
          {/* Summary */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tạm tính ({itemCount} sản phẩm)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Giảm giá</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-900">TỔNG CỘNG</span>
            <span className="text-2xl font-extrabold text-blue-600">{formatCurrency(total)}</span>
          </div>

          {/* Note & Payment Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowNote(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" /> Ghi chú (F8)
            </button>
            <Button
              onClick={handleOpenPayment}
              disabled={items.length === 0}
              className="flex-[2] h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200 gap-2 text-sm"
            >
              <CreditCard className="w-4 h-4" /> Thanh toán (F2)
            </Button>
          </div>
        </div>
      </div>

      {/* ====== PAYMENT DIALOG ====== */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-blue-600" /> Thanh toán đơn hàng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tạm tính ({itemCount} sp)</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-1">
                  <span>Giảm giá</span><span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-blue-200/50">
                <span className="font-bold text-blue-800">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-blue-700">{formatCurrency(total)}</span>
              </div>
              {customerName && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                  <User className="w-3 h-3" /> Khách hàng: <strong>{customerName}</strong>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Phương thức thanh toán</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'cash', label: 'Tiền mặt', icon: <Banknote className="w-5 h-5" />, desc: 'Nhận tiền trực tiếp' },
                  { key: 'transfer', label: 'Chuyển khoản', icon: <Smartphone className="w-5 h-5" />, desc: 'QR / CK ngân hàng' },
                  { key: 'card', label: 'Thẻ', icon: <CreditCard className="w-5 h-5" />, desc: 'Quẹt thẻ POS' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setPaymentMethod(m.key); if (m.key !== 'cash') setAmountPaid(total); }}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      paymentMethod === m.key
                        ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex justify-center mb-1">{m.icon}</span>
                    <span className="text-xs font-semibold block">{m.label}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash amount input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Tiền khách đưa</Label>
                <Input
                  type="number"
                  value={amountPaid || ''}
                  onChange={e => setAmountPaid(Number(e.target.value))}
                  className="h-14 text-2xl font-bold text-center rounded-lg border-2 border-blue-200 focus:border-blue-500"
                  autoFocus
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, Math.ceil(total / 200000) * 200000, Math.ceil(total / 500000) * 500000, 1000000, 2000000, 5000000]
                    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                    .slice(0, 8)
                    .map(v => (
                      <button
                        key={v}
                        onClick={() => setAmountPaid(v)}
                        className={`px-2 py-2 rounded-md text-xs font-semibold transition-all ${
                          amountPaid === v ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {formatCurrency(v)}
                      </button>
                    ))}
                </div>
                {amountPaid >= total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-0.5">Tiền thừa trả khách</p>
                    <p className="text-xl font-extrabold text-green-700">{formatCurrency(amountPaid - total)}</p>
                  </div>
                )}
                {amountPaid > 0 && amountPaid < total && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-red-600">Còn thiếu: <strong>{formatCurrency(total - amountPaid)}</strong></p>
                  </div>
                )}
              </div>
            )}

            {/* Transfer QR placeholder */}
            {paymentMethod === 'transfer' && (
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Quét mã QR để chuyển khoản</p>
                <p className="text-xs text-gray-500 mt-1">Số tiền: {formatCurrency(total)}</p>
                <p className="text-[10px] text-gray-400 mt-2">(Tích hợp QR ngân hàng trong phiên bản tiếp theo)</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1 rounded-lg h-11">Hủy</Button>
              <Button
                onClick={handleCheckout}
                disabled={processing || (paymentMethod === 'cash' && amountPaid < total)}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 rounded-lg h-11 gap-2 font-semibold"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {processing ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== RECEIPT PREVIEW DIALOG ====== */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-green-600" /> Đơn hàng thành công!</DialogTitle></DialogHeader>
          {lastOrder && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-green-700">#{lastOrder.orderNumber as string}</p>
                <p className="text-2xl font-extrabold text-green-800 mt-1">{formatCurrency(lastOrder.total as number)}</p>
              </div>

              {/* Mini receipt preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="text-center border-b border-dashed border-gray-300 pb-2">
                  <p className="font-bold text-sm">VinPOS Demo Store</p>
                  <p className="text-gray-500">123 Nguyễn Huệ, Q1, HCM</p>
                  <p className="text-gray-500">ĐT: 0912345678</p>
                </div>
                <div className="border-b border-dashed border-gray-300 pb-2 space-y-1">
                  {(lastOrder.items as Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate flex-1 mr-2">{item.quantity}x {item.productName}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between"><span>Tạm tính:</span><span>{formatCurrency(lastOrder.subtotal as number)}</span></div>
                  {(lastOrder.discount as number) > 0 && (
                    <div className="flex justify-between text-green-600"><span>Giảm giá:</span><span>-{formatCurrency(lastOrder.discount as number)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-300 pt-1">
                    <span>TỔNG CỘNG:</span><span>{formatCurrency(lastOrder.total as number)}</span>
                  </div>
                  <div className="flex justify-between"><span>Khách trả:</span><span>{formatCurrency(lastOrder.amountPaid as number)}</span></div>
                  {(lastOrder.changeAmount as number) > 0 && (
                    <div className="flex justify-between font-bold"><span>Tiền thừa:</span><span>{formatCurrency(lastOrder.changeAmount as number)}</span></div>
                  )}
                </div>
                <div className="text-center text-gray-400 pt-1 border-t border-dashed border-gray-300">
                  <p>Cảm ơn quý khách!</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1 rounded-lg">Đóng</Button>
                <Button onClick={handlePrintReceipt} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                  <Printer className="w-4 h-4" /> In hóa đơn
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ====== CUSTOMER PICKER DIALOG ====== */}
      <Dialog open={showCustomerPicker} onOpenChange={setShowCustomerPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Chọn khách hàng</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Tìm theo tên, SĐT..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="pl-10 h-10 rounded-lg" autoFocus />
            </div>
            <button onClick={() => { setCustomer(null, ''); setShowCustomerPicker(false); }} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left text-gray-500 border border-dashed border-gray-200">
              <User className="w-4 h-4" />
              <span className="text-sm">Khách lẻ (không chọn)</span>
            </button>
            <ScrollArea className="max-h-72">
              <div className="space-y-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c.id, c.name); setShowCustomerPicker(false); toast.success(`Đã chọn: ${c.name}`); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left ${customerId === c.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-md bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone} {c.email ? `• ${c.email}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-blue-600 flex items-center gap-0.5"><Star className="w-3 h-3" /> {c.points}</p>
                      <p className="text-[10px] text-gray-400">{c.totalOrders} đơn</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== DISCOUNT DIALOG ====== */}
      <Dialog open={!!showDiscount} onOpenChange={() => setShowDiscount(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-green-600" /> Giảm giá sản phẩm</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setDiscountType('fixed')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${discountType === 'fixed' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                <Hash className="w-4 h-4 mx-auto mb-0.5" /> Số tiền
              </button>
              <button onClick={() => setDiscountType('percent')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${discountType === 'percent' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                <Percent className="w-4 h-4 mx-auto mb-0.5" /> Phần trăm
              </button>
            </div>
            <Input
              type="number"
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              placeholder={discountType === 'fixed' ? 'Nhập số tiền giảm...' : 'Nhập % giảm...'}
              className="h-12 text-lg text-center rounded-lg"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowDiscount(null); setDiscountInput(''); }} className="flex-1 rounded-lg">Hủy</Button>
              <Button onClick={() => showDiscount && handleApplyDiscount(showDiscount)} className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg">Áp dụng</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== NOTE DIALOG ====== */}
      <Dialog open={showNote} onOpenChange={setShowNote}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="w-5 h-5 text-yellow-600" /> Ghi chú đơn hàng</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú cho đơn hàng..." className="rounded-lg" rows={4} autoFocus />
          <Button onClick={() => { setShowNote(false); if (note) toast.success('Đã lưu ghi chú'); }} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">Lưu</Button>
        </DialogContent>
      </Dialog>

      {/* ====== SHORTCUTS DIALOG ====== */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Keyboard className="w-5 h-5 text-blue-600" /> Phím tắt</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {[
              { key: 'F1', action: 'Tìm kiếm sản phẩm' },
              { key: 'F2', action: 'Mở thanh toán' },
              { key: 'F3', action: 'Quét barcode' },
              { key: 'F4', action: 'Chọn khách hàng' },
              { key: 'F8', action: 'Thêm ghi chú' },
              { key: 'F9', action: 'Xóa giỏ hàng' },
              { key: 'ESC', action: 'Đóng dialog' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">{s.action}</span>
                <kbd className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-semibold border border-gray-200">{s.key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
