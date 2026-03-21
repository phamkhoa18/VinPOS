'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone,
  Printer, X, User, Loader2, QrCode, ChevronDown, Folder, Hash, Percent,
  StickyNote, Clock, ArrowRight, CheckCircle2, Receipt, Volume2,
  Keyboard, AlertCircle, Tag, Barcode, UserPlus, Star, FilePlus2,
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
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscount, setShowDiscount] = useState<string | null>(null);
  const [showPriceEdit, setShowPriceEdit] = useState<string | null>(null);
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [billDiscountInput, setBillDiscountInput] = useState('');
  const [billDiscountTypeInput, setBillDiscountTypeInput] = useState<'fixed' | 'percent'>('fixed');
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(null);
  const [cashInputDisplay, setCashInputDisplay] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const {
    tabs, activeTabId, addTab, removeTab, switchTab,
    items, customerId, customerName, note, paymentMethod, amountPaid, billDiscount, billDiscountType,
    addItem, removeItem, updateQuantity, setCustomer, setNote,
    setPaymentMethod, setAmountPaid, setBillDiscount, clearCart, getSubtotal, getTotal, getItemCount,
    updateDiscount, getBillDiscountAmount, updatePrice,
  } = useCartStore();

  const receiptSettingsRef = useRef<Record<string, unknown>>({});

  // Fetch data + settings
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200&active=true').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/customers?limit=100').then(r => r.json()),
      fetch('/api/settings').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pData, cData, cuData, settingsData]) => {
      setProducts(pData.products || []);
      setCategories(cData || []);
      setCustomers(cuData.customers || []);
      // Merge shop info + receipt settings
      if (settingsData) {
        const rs = {
          shopName: settingsData.shop?.name || '',
          shopAddress: settingsData.shop?.address || '',
          shopPhone: settingsData.shop?.phone || '',
          taxId: settingsData.shop?.taxCode || '',
          ...(settingsData.receiptSettings || {}),
        };
        receiptSettingsRef.current = rs;
        // Cache in localStorage for offline access
        try { localStorage.setItem('vinpos_receipt_settings', JSON.stringify(rs)); } catch {}
      } else {
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem('vinpos_receipt_settings');
          if (saved) receiptSettingsRef.current = JSON.parse(saved);
        } catch {}
      }
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
    const t = getTotal();
    setAmountPaid(t);
    setCashInputDisplay(formatVNInput(t));
    setShowPayment(true);
  };

  // Helper: format number to VN currency display (no symbol)
  const formatVNInput = (num: number): string => {
    if (!num) return '';
    return num.toLocaleString('vi-VN');
  };

  // Helper: parse VN formatted string to number
  const parseVNInput = (str: string): number => {
    return Number(str.replace(/[^0-9]/g, '')) || 0;
  };

  const handleCashInputChange = (val: string) => {
    const num = parseVNInput(val);
    setAmountPaid(num);
    setCashInputDisplay(num ? formatVNInput(num) : '');
  };

  const handleCashQuickPick = (v: number) => {
    setAmountPaid(v);
    setCashInputDisplay(formatVNInput(v));
  };

  const handleApplyBillDiscount = () => {
    const val = billDiscountTypeInput === 'fixed' ? parseVNInput(billDiscountInput) : Number(billDiscountInput);
    if (isNaN(val) || val < 0) { toast.error('Số không hợp lệ'); return; }
    if (billDiscountTypeInput === 'percent' && val > 100) { toast.error('Không quá 100%'); return; }
    const afterItemDiscount = getSubtotal() - items.reduce((s, i) => s + i.discount * i.quantity, 0);
    if (billDiscountTypeInput === 'fixed' && val > afterItemDiscount) { toast.error('Giảm giá không lớn hơn tổng bill'); return; }
    setBillDiscount(val, billDiscountTypeInput);
    toast.success(`Đã giảm giá bill: ${billDiscountTypeInput === 'percent' ? `${val}%` : formatCurrency(val)}`);
    setShowBillDiscount(false);
    setBillDiscountInput('');
  };

  const handleApplyDiscount = (productId: string) => {
    const val = discountType === 'fixed' ? parseVNInput(discountInput) : Number(discountInput);
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

  const handleApplyPriceEdit = (productId: string) => {
    const val = parseVNInput(priceInput);
    if (isNaN(val) || val < 0) { toast.error('Số tiền không hợp lệ'); return; }
    updatePrice(productId, val);
    toast.success('Đã cập nhật giá mới');
    setShowPriceEdit(null);
    setPriceInput('');
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
        discount: items.reduce((sum, i) => sum + i.discount * i.quantity, 0) + getBillDiscountAmount(),
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

      const savedOrder = { ...orderData, orderNumber: order.orderNumber, createdAt: new Date().toISOString(), note: note || '' };
      setLastOrder(savedOrder);
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();

      // Auto-print if enabled in settings
      const rs = getReceiptSettings();
      if (rs.autoPrint) {
        setTimeout(() => {
          const html = generateReceiptHTML({
            orderNumber: savedOrder.orderNumber,
            items: savedOrder.items as Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>,
            subtotal: savedOrder.subtotal, discount: savedOrder.discount,
            total: savedOrder.total, amountPaid: savedOrder.amountPaid,
            changeAmount: savedOrder.changeAmount, paymentMethod: savedOrder.paymentMethod,
            customerName: customerName || undefined, createdAt: savedOrder.createdAt,
            note: savedOrder.note || undefined,
            shopName: (rs.shopName as string) || 'VinPOS Store',
            shopAddress: (rs.shopAddress as string) || '',
            shopPhone: (rs.shopPhone as string) || '',
            taxId: (rs.taxId as string) || '',
          }, rs);
          printReceipt(html);
        }, 500);
      }

      // Refresh stock
      const pRes = await fetch('/api/products?limit=200&active=true');
      const pData = await pRes.json();
      setProducts(pData.products || []);
    } catch (err) {
      toast.error((err as Error).message || 'Lỗi tạo đơn hàng');
    }
    setProcessing(false);
  };

  // Load receipt settings (pre-fetched from DB, cached in ref)
  const getReceiptSettings = useCallback(() => {
    return receiptSettingsRef.current as Record<string, unknown>;
  }, []);

  const handlePrintReceipt = () => {
    if (!lastOrder) return;
    const rs = getReceiptSettings();
    const html = generateReceiptHTML({
      orderNumber: lastOrder.orderNumber as string,
      items: lastOrder.items as Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>,
      subtotal: lastOrder.subtotal as number, discount: lastOrder.discount as number,
      total: lastOrder.total as number, amountPaid: lastOrder.amountPaid as number,
      changeAmount: lastOrder.changeAmount as number, paymentMethod: lastOrder.paymentMethod as string,
      customerName: customerName || undefined, createdAt: lastOrder.createdAt as string,
      cashierName: (rs.cashierName as string) || undefined,
      note: lastOrder.note as string || undefined,
      shopName: (rs.shopName as string) || 'VinPOS Store',
      shopAddress: (rs.shopAddress as string) || '',
      shopPhone: (rs.shopPhone as string) || '',
      taxId: (rs.taxId as string) || '',
    }, rs as Record<string, unknown>);
    printReceipt(html);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-56px)]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const total = getTotal();
  const subtotal = getSubtotal();
  const totalDiscount = items.reduce((s, i) => s + i.discount * i.quantity, 0);
  const billDiscountAmount = getBillDiscountAmount();
  const itemCount = getItemCount();

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row relative overflow-hidden">
      {/* ====== LEFT: Product Browser ====== */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 min-h-0">
        {/* Search & Barcode Bar */}
        <div className="p-2 sm:p-3 bg-white border-b border-gray-200">
          <div className="flex gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="Tìm sản phẩm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 sm:pl-10 h-9 sm:h-10 bg-gray-50 rounded-lg border-gray-200 focus:bg-white text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative w-48 hidden sm:block">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={barcodeRef}
                placeholder="Quét barcode (F3)"
                onKeyDown={handleBarcodeScan}
                className="pl-10 h-9 sm:h-10 bg-gray-50 rounded-lg border-gray-200 focus:bg-white text-sm font-mono"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 sm:gap-1.5 mt-2 sm:mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCat('all')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${selectedCat === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${selectedCat === c.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <CatIcon className="w-3.5 h-3.5" /> {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-2 sm:p-3">
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
                    className={`relative bg-white rounded-lg border p-2 sm:p-3 text-left transition-all hover:shadow-md hover:border-blue-200 active:scale-95 ${inCart ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                      }`}
                  >
                    {/* Stock warning */}
                    {lowStock && (
                      <div className="absolute top-1.5 right-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                    )}

                    <div className="w-full aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md flex items-center justify-center mb-1.5 sm:mb-2">
                      <ProdIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-0.5 sm:mb-1 h-6 sm:h-8">{p.name}</p>
                    <p className="text-xs sm:text-sm font-bold text-blue-600">{formatCurrency(p.price)}</p>
                    <div className="flex items-center justify-between mt-0.5 sm:mt-1">
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

        {/* Bottom Shortcuts Bar - hidden on mobile */}
        <div className="h-10 bg-white border-t border-gray-200 hidden md:flex items-center gap-4 px-4 text-[10px] text-gray-400 font-mono">
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

      {/* Mobile Cart Toggle Button */}
      {!mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-5 right-4 z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-300/50 flex items-center justify-center safe-bottom"
        >
          <ShoppingBag className="w-6 h-6" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      )}

      {/* Mobile Cart Overlay */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setMobileCartOpen(false)} />
      )}

      {/* ====== RIGHT: Cart Panel ====== */}
      <div className={`
        bg-white border-l border-gray-200 flex flex-col
        fixed lg:static bottom-0 left-0 right-0 z-50
        h-[90vh] lg:h-auto w-full lg:w-[380px] xl:w-[400px]
        rounded-t-2xl lg:rounded-none shadow-2xl lg:shadow-none
        transition-transform duration-300 ease-out safe-bottom
        ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="lg:hidden flex items-center justify-between px-4 pb-2">
          <span className="font-bold text-gray-900">Giỏ hàng ({itemCount})</span>
          <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ====== ORDER TABS ====== */}
        <div className="border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center">
            <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const tabItemCount = tab.items.reduce((s, i) => s + i.quantity, 0);
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`group relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                      isActive
                        ? 'bg-white text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="max-w-[80px] truncate">{tab.label}</span>
                    {tabItemCount > 0 && (
                      <span className={`ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tabItemCount}
                      </span>
                    )}
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                        className="ml-0.5 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Đóng đơn"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center px-1 border-l border-gray-200">
              <button
                onClick={() => { addTab(); toast.success('Đã tạo đơn hàng mới'); }}
                className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="Tạo đơn mới"
              >
                <FilePlus2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

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
                        <button
                          onClick={() => {
                            setShowPriceEdit(item.product.id);
                            setPriceInput(formatVNInput(item.product.price));
                          }}
                          className="text-xs text-blue-600 font-semibold hover:text-blue-800 hover:underline cursor-pointer focus:outline-none"
                          title="Sửa giá SP"
                        >
                          {formatCurrency(item.product.price)}
                        </button>
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
        <div className="border-t border-gray-200 p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 bg-white">
          {/* Summary */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tạm tính ({itemCount} sản phẩm)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Giảm giá SP</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            {billDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span className="flex items-center gap-1">
                  Giảm giá bill
                  <button onClick={() => { setBillDiscount(0, 'fixed'); toast.success('Đã xóa giảm giá bill'); }} className="text-red-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
                <span>-{formatCurrency(billDiscountAmount)}{billDiscountType === 'percent' ? ` (${billDiscount}%)` : ''}</span>
              </div>
            )}
          </div>

          {/* Bill Discount Button */}
          <button
            onClick={() => setShowBillDiscount(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-orange-300 text-xs text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <Percent className="w-3.5 h-3.5" /> Giảm giá tổng bill
          </button>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-900">TỔNG CỘNG</span>
            <span className="text-xl sm:text-2xl font-extrabold text-blue-600">{formatCurrency(total)}</span>
          </div>

          {/* Note & Payment Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowNote(true)}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg border border-gray-200 text-[11px] sm:text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" /> Ghi chú (F8)
            </button>
            <Button
              onClick={handleOpenPayment}
              disabled={items.length === 0}
              className="flex-[2] h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200 gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              <CreditCard className="w-4 h-4" /> Thanh toán (F2)
            </Button>
          </div>
        </div>
      </div>

      {/* ====== PAYMENT DIALOG ====== */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-blue-600" /> Thanh toán đơn hàng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tạm tính ({itemCount} sp)</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-1">
                  <span>Giảm giá SP</span><span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              {billDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-orange-600 mb-1">
                  <span>Giảm giá bill{billDiscountType === 'percent' ? ` (${billDiscount}%)` : ''}</span><span>-{formatCurrency(billDiscountAmount)}</span>
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
                    className={`p-3 rounded-lg border text-center transition-all ${paymentMethod === m.key
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
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cashInputDisplay}
                    onChange={e => handleCashInputChange(e.target.value)}
                    placeholder="0"
                    className="h-14 text-2xl font-bold text-center rounded-lg border-2 border-blue-200 focus:border-blue-500 pr-10"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₫</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, Math.ceil(total / 200000) * 200000, Math.ceil(total / 500000) * 500000, 1000000, 2000000, 5000000]
                    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                    .slice(0, 8)
                    .map(v => (
                      <button
                        key={v}
                        onClick={() => handleCashQuickPick(v)}
                        className={`px-2 py-2 rounded-md text-xs font-semibold transition-all ${amountPaid === v ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
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

              {/* Mini receipt preview - matches settings 100% */}
              {(() => {
                const rs = receiptSettingsRef.current;
                // Shop info
                const shopName = (rs.shopName as string) || 'Cửa hàng';
                const shopAddress = (rs.shopAddress as string) || '';
                const shopPhone = (rs.shopPhone as string) || '';
                const taxId = (rs.taxId as string) || '';
                const headerText = (rs.headerText as string) || '';
                const footerText = (rs.footerText as string) || 'Cảm ơn quý khách!';
                const receiptTitle = (rs.receiptTitle as string) ?? 'HÓA ĐƠN BÁN HÀNG';

                // Style settings
                const borderStyle = (rs.borderStyle as string) || 'dashed';
                const fontSize = (rs.fontSize as string) || 'medium';
                const fontWeight = (rs.fontWeight as string) || 'bold';
                const lineHeightSetting = (rs.lineHeight as string) || 'normal';
                const paddingSetting = (rs.padding as string) || 'normal';
                const titleAlign = (rs.titleAlign as string) || 'center';
                const boldTotal = rs.boldTotal !== false;

                // Show/hide settings
                const showLogo = rs.showLogo !== false;
                const showTaxId = rs.showTaxId === true;
                const showDate = rs.showDate !== false;
                const showTime = rs.showTime !== false;
                const showCashier = rs.showCashier !== false;
                const showCustomer = rs.showCustomer !== false;
                const showItemNumber = rs.showItemNumber !== false;
                const showSubtotalSetting = rs.showSubtotal !== false;
                const showPaymentMethodSetting = rs.showPaymentMethod !== false;
                const showChangeSetting = rs.showChange !== false;
                const showOrderNote = rs.showOrderNote !== false;
                const showPoweredBy = rs.showPoweredBy !== false;

                // Compute styles
                const fontSizePx = fontSize === 'small' ? '10px' : fontSize === 'large' ? '14px' : '12px';
                const titleSizePx = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
                const fw = fontWeight === 'normal' ? '400' : fontWeight === 'bolder' ? '700' : '600';
                const lh = lineHeightSetting === 'compact' ? '1.2' : lineHeightSetting === 'relaxed' ? '1.8' : '1.5';
                const pad = paddingSetting === 'compact' ? '8px' : paddingSetting === 'spacious' ? '20px' : '16px';
                const borderCss = `1px ${borderStyle} #ccc`;

                const paymentMethodLabels: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', momo: 'MoMo', zalopay: 'ZaloPay' };
                const orderDate = lastOrder.createdAt ? new Date(lastOrder.createdAt as string) : new Date();
                const dateStr = showDate ? (showTime
                  ? orderDate.toLocaleDateString('vi-VN') + ' ' + orderDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : orderDate.toLocaleDateString('vi-VN')
                ) : (showTime ? orderDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');

                const orderItems = lastOrder.items as Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>;

                return (
                  <div
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                    style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: fontSizePx, fontWeight: fw, lineHeight: lh, padding: pad }}
                  >
                    {/* Shop header */}
                    <div style={{ textAlign: titleAlign as 'left' | 'center' | 'right', paddingBottom: '6px', borderBottom: borderCss }}>
                      {showLogo && <div style={{ fontSize: titleSizePx, fontWeight: 700, marginBottom: '2px' }}>{shopName}</div>}
                      {!showLogo && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{shopName}</div>}
                      {shopAddress && <div className="text-gray-500">{shopAddress}</div>}
                      {shopPhone && <div className="text-gray-500">ĐT: {shopPhone}</div>}
                      {showTaxId && taxId && <div className="text-gray-500">MST: {taxId}</div>}
                      {headerText && <div className="text-gray-400 italic mt-1">{headerText}</div>}
                    </div>

                    {/* Receipt title */}
                    {receiptTitle && (
                      <div style={{ fontSize: titleSizePx, fontWeight: 700, textAlign: titleAlign as 'left' | 'center' | 'right', margin: '6px 0' }}>
                        {receiptTitle}
                      </div>
                    )}

                    {/* Order meta */}
                    <div className="space-y-0.5" style={{ paddingBottom: '4px' }}>
                      <div className="flex justify-between"><span>Số HĐ:</span><span>{lastOrder.orderNumber as string}</span></div>
                      {dateStr && <div className="flex justify-between"><span>Ngày:</span><span>{dateStr}</span></div>}
                      {showCashier && lastOrder.cashierName && <div className="flex justify-between"><span>Thu ngân:</span><span>{String(lastOrder.cashierName)}</span></div>}
                      {showCustomer && customerName && <div className="flex justify-between"><span>KH:</span><span>{customerName}</span></div>}
                    </div>

                    {/* Items divider */}
                    <div style={{ borderTop: borderCss, margin: '4px 0' }} />

                    {/* Items */}
                    <div style={{ paddingBottom: '4px' }}>
                      {orderItems.map((item, i) => (
                        <div key={i} style={{ marginBottom: '4px' }}>
                          <div style={{ fontWeight: 700 }}>
                            {showItemNumber ? `${i + 1}. ` : ''}{item.productName}
                          </div>
                          <div className="flex justify-between">
                            <span>{item.quantity} x {formatCurrency(item.price)}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                          {item.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>&nbsp;&nbsp;Giảm giá:</span>
                              <span>-{formatCurrency(item.discount * item.quantity)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Subtotal divider */}
                    <div style={{ borderTop: borderCss, margin: '4px 0' }} />

                    {/* Totals */}
                    <div className="space-y-0.5">
                      {showSubtotalSetting && (
                        <div className="flex justify-between"><span>Tạm tính:</span><span>{formatCurrency(lastOrder.subtotal as number)}</span></div>
                      )}
                      {(lastOrder.discount as number) > 0 && (
                        <div className="flex justify-between text-green-600"><span>Giảm giá:</span><span>-{formatCurrency(lastOrder.discount as number)}</span></div>
                      )}
                    </div>

                    {/* Total divider */}
                    <div style={{ borderTop: borderCss, margin: '4px 0' }} />

                    {/* Grand total */}
                    <div className="flex justify-between" style={{ fontSize: boldTotal ? titleSizePx : fontSizePx, fontWeight: boldTotal ? 700 : parseInt(fw) }}>
                      <span>TỔNG CỘNG:</span><span>{formatCurrency(lastOrder.total as number)}</span>
                    </div>

                    {showPaymentMethodSetting && (
                      <div className="flex justify-between">
                        <span>Thanh toán ({paymentMethodLabels[(lastOrder.paymentMethod as string)] || (lastOrder.paymentMethod as string)}):</span>
                        <span>{formatCurrency(lastOrder.amountPaid as number)}</span>
                      </div>
                    )}
                    {showChangeSetting && (lastOrder.changeAmount as number) > 0 && (
                      <div className="flex justify-between" style={{ fontWeight: 700 }}>
                        <span>Tiền thừa:</span><span>{formatCurrency(lastOrder.changeAmount as number)}</span>
                      </div>
                    )}

                    {/* Order note */}
                    {showOrderNote && lastOrder.note && (
                      <>
                        <div style={{ borderTop: borderCss, margin: '4px 0' }} />
                        <div className="italic text-gray-500">
                          <strong>Ghi chú:</strong> {lastOrder.note as string}
                        </div>
                      </>
                    )}

                    {/* Footer */}
                    <div style={{ borderTop: borderCss, margin: '4px 0' }} />
                    <div style={{ textAlign: titleAlign as 'left' | 'center' | 'right', marginTop: '6px' }}>
                      {footerText.split('\\n').map((line: string, i: number) => <div key={i} className="text-gray-500">{line}</div>)}
                      {showPoweredBy && <div className="text-gray-300 mt-1" style={{ fontSize: '9px' }}>— Powered by VinPOS —</div>}
                    </div>
                  </div>
                );
              })()}

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
              type="text"
              inputMode="numeric"
              value={discountType === 'fixed' && discountInput ? formatVNInput(parseVNInput(discountInput)) : discountInput}
              onChange={e => {
                if (discountType === 'fixed') {
                  const num = parseVNInput(e.target.value);
                  setDiscountInput(num ? formatVNInput(num) : '');
                } else {
                  setDiscountInput(e.target.value.replace(/[^0-9.]/g, ''));
                }
              }}
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

      {/* ====== PRICE EDIT DIALOG ====== */}
      <Dialog open={!!showPriceEdit} onOpenChange={() => setShowPriceEdit(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2">Chỉnh sửa giá SP</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              value={priceInput ? formatVNInput(parseVNInput(priceInput)) : ''}
              onChange={e => {
                const num = parseVNInput(e.target.value);
                setPriceInput(num ? formatVNInput(num) : '');
              }}
              placeholder="Nhập giá mới..."
              className="h-12 text-lg text-center rounded-lg font-semibold border-blue-200 focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowPriceEdit(null); setPriceInput(''); }} className="flex-1 rounded-lg">Hủy</Button>
              <Button onClick={() => showPriceEdit && handleApplyPriceEdit(showPriceEdit)} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg">Áp dụng</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== BILL DISCOUNT DIALOG ====== */}
      <Dialog open={showBillDiscount} onOpenChange={setShowBillDiscount}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Percent className="w-5 h-5 text-orange-600" /> Giảm giá tổng bill</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setBillDiscountTypeInput('fixed')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${billDiscountTypeInput === 'fixed' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                <Hash className="w-4 h-4 mx-auto mb-0.5" /> Số tiền
              </button>
              <button onClick={() => setBillDiscountTypeInput('percent')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${billDiscountTypeInput === 'percent' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                <Percent className="w-4 h-4 mx-auto mb-0.5" /> Phần trăm
              </button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              value={billDiscountTypeInput === 'fixed' && billDiscountInput ? formatVNInput(parseVNInput(billDiscountInput)) : billDiscountInput}
              onChange={e => {
                if (billDiscountTypeInput === 'fixed') {
                  const num = parseVNInput(e.target.value);
                  setBillDiscountInput(num ? formatVNInput(num) : '');
                } else {
                  setBillDiscountInput(e.target.value.replace(/[^0-9.]/g, ''));
                }
              }}
              placeholder={billDiscountTypeInput === 'fixed' ? 'Nhập số tiền giảm...' : 'Nhập % giảm (0-100)...'}
              className="h-12 text-lg text-center rounded-lg"
              autoFocus
            />
            {/* Quick percent buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 20, 25, 30, 40, 50].map(p => (
                <button key={p} onClick={() => { setBillDiscountTypeInput('percent'); setBillDiscountInput(String(p)); }} className="px-2 py-1.5 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 transition-all">
                  {p}%
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowBillDiscount(false); setBillDiscountInput(''); }} className="flex-1 rounded-lg">Hủy</Button>
              <Button onClick={handleApplyBillDiscount} className="flex-1 bg-orange-600 hover:bg-orange-700 rounded-lg">Áp dụng</Button>
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
