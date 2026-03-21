'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Store, Printer, Bell, Receipt, Eye, Save, FileText,
  Type, AlignLeft, Hash, Phone, Mail, MapPin, Clock, QrCode,
  Palette, CheckCircle2, RotateCcw,
  UserPlus, Users, Pencil, Trash2, Key, ShieldCheck, ShieldOff,
  Loader2, Search, X, UserCog,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, generateReceiptHTML, printReceipt } from '@/lib/format';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface ReceiptSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  taxId: string;
  paperSize: '58mm' | '80mm';
  autoPrint: boolean;
  printCopy: boolean;
  showLogo: boolean;
  showQR: boolean;
  showTaxId: boolean;
  headerText: string;
  footerText: string;
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'normal' | 'bold' | 'bolder';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  borderStyle: 'dashed' | 'dotted' | 'solid';
  receiptTitle: string;
  showCashier: boolean;
  showCustomer: boolean;
  showItemNumber: boolean;
  showSKU: boolean;
  showDate: boolean;
  showTime: boolean;
  showOrderNote: boolean;
  showSubtotal: boolean;
  showPaymentMethod: boolean;
  showChange: boolean;
  boldTotal: boolean;
  showPoweredBy: boolean;
  titleAlign: 'left' | 'center' | 'right';
  padding: 'compact' | 'normal' | 'spacious';
}

interface NotifySettings {
  lowStockAlert: boolean;
  orderSound: boolean;
  dailyReport: boolean;
  emailNotify: boolean;
}

const defaultReceipt: ReceiptSettings = {
  shopName: 'VinPOS Demo Store',
  shopAddress: '123 Nguyễn Huệ, Quận 1, TP.HCM',
  shopPhone: '0912345678',
  shopEmail: 'shop@vinpos.com',
  taxId: '',
  paperSize: '80mm',
  autoPrint: false,
  printCopy: false,
  showLogo: true,
  showQR: false,
  showTaxId: false,
  headerText: 'Chào mừng quý khách!',
  footerText: 'Cảm ơn quý khách đã mua hàng!\nHẹn gặp lại!',
  fontSize: 'medium',
  fontWeight: 'bold',
  lineHeight: 'normal',
  borderStyle: 'dashed',
  receiptTitle: 'HÓA ĐƠN BÁN HÀNG',
  showCashier: true,
  showCustomer: true,
  showItemNumber: true,
  showSKU: false,
  showDate: true,
  showTime: true,
  showOrderNote: true,
  showSubtotal: true,
  showPaymentMethod: true,
  showChange: true,
  boldTotal: true,
  showPoweredBy: true,
  titleAlign: 'center',
  padding: 'normal',
};

const sampleItems = [
  { name: 'iPhone 15 Pro Max', qty: 1, price: 29990000, discount: 0 },
  { name: 'Ốp lưng MagSafe', qty: 2, price: 890000, discount: 90000 },
  { name: 'Cường lực 9H', qty: 3, price: 150000, discount: 0 },
];

export default function SettingsPage() {
  const [receipt, setReceipt] = useState<ReceiptSettings>(defaultReceipt);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [notify, setNotify] = useState<NotifySettings>({
    lowStockAlert: true, orderSound: false, dailyReport: false, emailNotify: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'shop' | 'employees' | 'printer' | 'receipt' | 'notify'>('shop');

  // ====== EMPLOYEE MANAGEMENT STATE ======
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState<Employee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Employee | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch settings from DB on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const rs = data.receiptSettings || {};
          setReceipt(prev => ({
            ...prev,
            shopName: data.shop?.name || prev.shopName,
            shopAddress: data.shop?.address || prev.shopAddress,
            shopPhone: data.shop?.phone || prev.shopPhone,
            shopEmail: data.shop?.email || prev.shopEmail,
            taxId: data.shop?.taxCode || prev.taxId,
            ...rs,
          }));
        }
      } catch {
        // Fallback to defaults on error
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  // Fetch employees when tab is active
  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab]);

  const fetchEmployees = async () => {
    setEmployeeLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch {
      toast.error('Lỗi khi tải danh sách nhân viên');
    }
    setEmployeeLoading(false);
  };

  const handleCreateEmployee = async () => {
    if (!employeeForm.name || !employeeForm.email || !employeeForm.phone || !employeeForm.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (employeeForm.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã tạo nhân viên: ${data.name}`);
        setShowCreateEmployee(false);
        setEmployeeForm({ name: '', email: '', phone: '', password: '' });
        fetchEmployees();
      } else {
        toast.error(data.error || 'Lỗi khi tạo nhân viên');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setSaving(false);
  };

  const handleUpdateEmployee = async () => {
    if (!showEditEmployee) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${showEditEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã cập nhật thông tin nhân viên');
        setShowEditEmployee(null);
        fetchEmployees();
      } else {
        toast.error(data.error || 'Lỗi khi cập nhật');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setSaving(false);
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      if (res.ok) {
        toast.success(emp.isActive ? 'Đã vô hiệu hóa nhân viên' : 'Đã kích hoạt nhân viên');
        fetchEmployees();
      }
    } catch {
      toast.error('Lỗi');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${showResetPassword.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast.success('Đã đổi mật khẩu nhân viên');
        setShowResetPassword(null);
        setNewPassword('');
      } else {
        toast.error('Lỗi khi đổi mật khẩu');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setSaving(false);
  };

  const handleDeleteEmployee = async () => {
    if (!showDeleteConfirm) return;
    try {
      const res = await fetch(`/api/employees/${showDeleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã vô hiệu hóa nhân viên');
        setShowDeleteConfirm(null);
        fetchEmployees();
      }
    } catch {
      toast.error('Lỗi khi xóa nhân viên');
    }
  };

  const filteredEmployees = employees.filter(e =>
    !employeeSearch ||
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.phone.includes(employeeSearch)
  );

  // Test print function
  const handleTestPrint = () => {
    const testItems = sampleItems.map(item => ({
      productName: item.name,
      quantity: item.qty,
      price: item.price,
      discount: item.discount,
      total: (item.price - item.discount) * item.qty,
    }));
    const testSubtotal = sampleItems.reduce((s, i) => s + i.price * i.qty, 0);
    const testDiscount = sampleItems.reduce((s, i) => s + i.discount * i.qty, 0);
    const testTotal = testSubtotal - testDiscount;

    const html = generateReceiptHTML({
      orderNumber: 'KV-TEST-001',
      items: testItems,
      subtotal: testSubtotal,
      discount: testDiscount,
      total: testTotal,
      amountPaid: 32000000,
      changeAmount: 32000000 - testTotal,
      paymentMethod: 'cash',
      customerName: 'Khách hàng thử nghiệm',
      createdAt: new Date().toISOString(),
      shopName: receipt.shopName,
      shopAddress: receipt.shopAddress,
      shopPhone: receipt.shopPhone,
      taxId: receipt.taxId,
    }, receipt);
    printReceipt(html);
    toast.success('Đã gửi lệnh in thử!');
  };

  const updateReceipt = (key: keyof ReceiptSettings, value: unknown) => {
    setReceipt(prev => ({ ...prev, [key]: value }));
  };

  // Save settings to DB (and also cache in localStorage for POS fast access)
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopInfo: {
            name: receipt.shopName,
            address: receipt.shopAddress,
            phone: receipt.shopPhone,
            email: receipt.shopEmail,
            taxCode: receipt.taxId,
          },
          receiptSettings: {
            paperSize: receipt.paperSize,
            autoPrint: receipt.autoPrint,
            printCopy: receipt.printCopy,
            showLogo: receipt.showLogo,
            showQR: receipt.showQR,
            showTaxId: receipt.showTaxId,
            headerText: receipt.headerText,
            footerText: receipt.footerText,
            fontSize: receipt.fontSize,
            fontWeight: receipt.fontWeight,
            lineHeight: receipt.lineHeight,
            borderStyle: receipt.borderStyle,
            receiptTitle: receipt.receiptTitle,
            showCashier: receipt.showCashier,
            showCustomer: receipt.showCustomer,
            showItemNumber: receipt.showItemNumber,
            showSKU: receipt.showSKU,
            showDate: receipt.showDate,
            showTime: receipt.showTime,
            showOrderNote: receipt.showOrderNote,
            showSubtotal: receipt.showSubtotal,
            showPaymentMethod: receipt.showPaymentMethod,
            showChange: receipt.showChange,
            boldTotal: receipt.boldTotal,
            showPoweredBy: receipt.showPoweredBy,
            titleAlign: receipt.titleAlign,
            padding: receipt.padding,
          },
        }),
      });
      if (res.ok) {
        // Cache in localStorage for POS page fast access
        try { localStorage.setItem('vinpos_receipt_settings', JSON.stringify(receipt)); } catch {}
        toast.success('Đã lưu cấu hình thành công!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Lỗi lưu cấu hình');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setSettingsSaving(false);
  };

  const sampleSubtotal = sampleItems.reduce((s, i) => s + i.price * i.qty, 0);
  const sampleDiscount = sampleItems.reduce((s, i) => s + i.discount * i.qty, 0);
  const sampleTotal = sampleSubtotal - sampleDiscount;

  const tabs = [
    { key: 'shop', label: 'Cửa hàng', icon: <Store className="w-4 h-4" /> },
    { key: 'employees', label: 'Nhân viên', icon: <Users className="w-4 h-4" /> },
    { key: 'printer', label: 'Máy in', icon: <Printer className="w-4 h-4" /> },
    { key: 'receipt', label: 'Phiếu in', icon: <Receipt className="w-4 h-4" /> },
    { key: 'notify', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Cài đặt</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Tùy chỉnh cửa hàng và hệ thống</p>
        </div>
      </div>

      {/* Tab navigation - horizontally scrollable on mobile */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Fade hint for scroll on mobile */}
        <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none sm:hidden" />
      </div>

      <div className="max-w-3xl w-full">
        {/* ====== SHOP INFO ====== */}
        {activeTab === 'shop' && (
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Thông tin cửa hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Store className="w-3.5 h-3.5 text-gray-400" /> Tên cửa hàng</Label>
                  <Input value={receipt.shopName} onChange={e => updateReceipt('shopName', e.target.value)} className="h-9 sm:h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Phone className="w-3.5 h-3.5 text-gray-400" /> Số điện thoại</Label>
                  <Input value={receipt.shopPhone} onChange={e => updateReceipt('shopPhone', e.target.value)} className="h-9 sm:h-10 rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Địa chỉ</Label>
                <Input value={receipt.shopAddress} onChange={e => updateReceipt('shopAddress', e.target.value)} className="h-9 sm:h-10 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email</Label>
                  <Input value={receipt.shopEmail} onChange={e => updateReceipt('shopEmail', e.target.value)} className="h-9 sm:h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><Hash className="w-3.5 h-3.5 text-gray-400" /> Mã số thuế</Label>
                  <Input value={receipt.taxId} onChange={e => updateReceipt('taxId', e.target.value)} placeholder="Nhập MST (nếu có)" className="h-9 sm:h-10 rounded-lg text-sm" />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 text-sm">
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {settingsSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ====== EMPLOYEE MANAGEMENT ====== */}
        {activeTab === 'employees' && (
          <div className="space-y-3 sm:space-y-4">
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Nhân viên</span>
                    {employees.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] sm:text-xs rounded-md flex-shrink-0">{employees.length}</Badge>
                    )}
                  </CardTitle>
                  <Button
                    onClick={() => { setShowCreateEmployee(true); setEmployeeForm({ name: '', email: '', phone: '', password: '' }); }}
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Thêm</span>
                    <span className="hidden sm:inline"> nhân viên</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {/* Search */}
                <div className="relative mb-3 sm:mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm nhân viên..."
                    value={employeeSearch}
                    onChange={e => setEmployeeSearch(e.target.value)}
                    className="pl-10 h-9 sm:h-10 rounded-lg text-sm"
                  />
                  {employeeSearch && (
                    <button onClick={() => setEmployeeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {employeeLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Chưa có nhân viên nào</p>
                    <p className="text-xs mt-1">Nhấn &ldquo;Thêm nhân viên&rdquo; để tạo tài khoản cho nhân viên</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEmployees.map(emp => (
                      <div
                        key={emp.id}
                        className={`p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm ${emp.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {/* Employee info */}
                          <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                              <AvatarFallback className={`font-semibold text-xs sm:text-sm ${emp.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {emp.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                                <Badge className={`text-[9px] sm:text-[10px] px-1.5 py-0 h-4 rounded flex-shrink-0 ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                  {emp.isActive ? 'Hoạt động' : 'Đã khóa'}
                                </Badge>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-0.5">
                                <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 truncate">
                                  <Mail className="w-3 h-3 flex-shrink-0" /> {emp.email}
                                </span>
                                <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3 flex-shrink-0" /> {emp.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 sm:gap-1 border-t sm:border-t-0 border-gray-50 pt-2 sm:pt-0 -mx-1 px-1 sm:mx-0 sm:px-0 flex-shrink-0">
                            <button
                              onClick={() => {
                                setShowEditEmployee(emp);
                                setEditForm({ name: emp.name, email: emp.email, phone: emp.phone });
                              }}
                              title="Chỉnh sửa"
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:hidden">Sửa</span>
                            </button>
                            <button
                              onClick={() => { setShowResetPassword(emp); setNewPassword(''); }}
                              title="Đổi mật khẩu"
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                            >
                              <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:hidden">MK</span>
                            </button>
                            <button
                              onClick={() => handleToggleActive(emp)}
                              title={emp.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 p-1.5 sm:p-2 rounded-lg transition-colors ${emp.isActive
                                  ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-600'
                                  : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                                }`}
                            >
                              {emp.isActive ? <ShieldOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                              <span className="text-[10px] sm:hidden">{emp.isActive ? 'Khóa' : 'Mở'}</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(emp)}
                              title="Xóa"
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 p-1.5 sm:p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:hidden">Xóa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="bg-blue-50/50 border-blue-100 shadow-sm rounded-xl">
              <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-800">Về tài khoản nhân viên</p>
                    <ul className="text-[10px] sm:text-xs text-blue-700/80 mt-1 space-y-0.5 list-disc list-inside">
                      <li>Nhân viên chỉ truy cập được <strong>POS</strong></li>
                      <li>Không xem được báo cáo, quản lý SP, cài đặt</li>
                      <li>Đơn hàng ghi nhận nhân viên tạo đơn</li>
                      <li>Có thể vô hiệu hóa bất kỳ lúc nào</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== PRINTER CONFIG ====== */}
        {activeTab === 'printer' && (
          <div className="space-y-3 sm:space-y-4">
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Máy in & kiểu chữ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6">
                {/* Paper size */}
                <div className="space-y-2">
                  <Label className="font-medium">Khổ giấy in</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['58mm', '80mm'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => updateReceipt('paperSize', size)}
                        className={`p-4 rounded-lg border-2 transition-all text-center ${receipt.paperSize === size
                            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className={`mx-auto mb-2 bg-gray-100 rounded border border-gray-300 ${size === '58mm' ? 'w-10 h-16' : 'w-14 h-16'
                          }`}>
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className={`text-gray-400 ${size === '58mm' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${receipt.paperSize === size ? 'text-blue-700' : 'text-gray-700'}`}>{size}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{size === '58mm' ? 'Máy in mini' : 'Máy in chuẩn'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font size */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-gray-400" /> Cỡ chữ</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'small', label: 'Nhỏ', desc: '10px' },
                      { key: 'medium', label: 'Vừa', desc: '12px' },
                      { key: 'large', label: 'Lớn', desc: '14px' },
                    ] as const).map(s => (
                      <button
                        key={s.key}
                        onClick={() => updateReceipt('fontSize', s.key)}
                        className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${receipt.fontSize === s.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <span className="text-sm font-medium block">{s.label}</span>
                        <span className="text-[10px] text-gray-400">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font weight */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-gray-400" /> Độ đậm chữ</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'normal', label: 'Thường', sample: 'Aa' },
                      { key: 'bold', label: 'Đậm', sample: 'Aa' },
                      { key: 'bolder', label: 'Rất đậm', sample: 'Aa' },
                    ] as const).map(w => (
                      <button
                        key={w.key}
                        onClick={() => updateReceipt('fontWeight', w.key)}
                        className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${receipt.fontWeight === w.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <span className={`text-lg block ${w.key === 'normal' ? 'font-normal' : w.key === 'bold' ? 'font-bold' : 'font-black'}`}>{w.sample}</span>
                        <span className="text-[10px] text-gray-400">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line height */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Khoảng cách dòng</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'compact', label: 'Sát', desc: 'Tiết kiệm giấy' },
                      { key: 'normal', label: 'Bình thường', desc: 'Mặc định' },
                      { key: 'relaxed', label: 'Thoáng', desc: 'Dễ đọc hơn' },
                    ] as const).map(l => (
                      <button
                        key={l.key}
                        onClick={() => updateReceipt('lineHeight', l.key)}
                        className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${receipt.lineHeight === l.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <span className="text-sm font-medium block">{l.label}</span>
                        <span className="text-[10px] text-gray-400">{l.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border style */}
                <div className="space-y-2">
                  <Label className="font-medium">Kiểu đường kẻ phân cách</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'dashed', label: 'Gạch nối', style: 'border-dashed' },
                      { key: 'dotted', label: 'Chấm', style: 'border-dotted' },
                      { key: 'solid', label: 'Liền', style: 'border-solid' },
                    ] as const).map(b => (
                      <button
                        key={b.key}
                        onClick={() => updateReceipt('borderStyle', b.key)}
                        className={`flex-1 py-3 rounded-lg border text-center transition-all ${receipt.borderStyle === b.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <div className={`border-b-2 ${b.style} border-gray-400 mx-4 mb-2`} />
                        <span className="text-xs font-medium">{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Padding */}
                <div className="space-y-2">
                  <Label className="font-medium">Khoảng cách lề</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'compact', label: 'Hẹp' },
                      { key: 'normal', label: 'Bình thường' },
                      { key: 'spacious', label: 'Rộng' },
                    ] as const).map(p => (
                      <button
                        key={p.key}
                        onClick={() => updateReceipt('padding', p.key)}
                        className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${receipt.padding === p.key
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <span className="text-sm font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle switches */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tự động in sau thanh toán</p>
                      <p className="text-xs text-gray-500">In bill tự động khi hoàn thành đơn</p>
                    </div>
                    <Switch checked={receipt.autoPrint} onCheckedChange={(v: boolean) => updateReceipt('autoPrint', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">In bản sao</p>
                      <p className="text-xs text-gray-500">In 2 bản (1 cho shop, 1 cho khách)</p>
                    </div>
                    <Switch checked={receipt.printCopy} onCheckedChange={v => updateReceipt('printCopy', v)} />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSaveSettings} disabled={settingsSaving} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 text-sm w-full sm:w-auto">
                    {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {settingsSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </Button>
                  <Button variant="outline" onClick={handleTestPrint} className="rounded-lg gap-2 border-green-300 text-green-700 hover:bg-green-50 text-sm w-full sm:w-auto">
                    <Printer className="w-4 h-4" /> In thử
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== RECEIPT TEMPLATE ====== */}
        {activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            {/* Config */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Tùy chỉnh phiếu in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pr-1 px-4 sm:px-6">
                {/* Receipt title */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> Tiêu đề hóa đơn</Label>
                  <Input value={receipt.receiptTitle} onChange={e => updateReceipt('receiptTitle', e.target.value)} placeholder="HÓA ĐƠN BÁN HÀNG" className="h-10 rounded-lg font-semibold" />
                </div>

                {/* Title align */}
                <div className="space-y-2">
                  <Label className="font-medium">Căn lề tiêu đề</Label>
                  <div className="flex gap-2">
                    {([
                      { key: 'left', label: 'Trái' },
                      { key: 'center', label: 'Giữa' },
                      { key: 'right', label: 'Phải' },
                    ] as const).map(a => (
                      <button key={a.key} onClick={() => updateReceipt('titleAlign', a.key)}
                        className={`flex-1 py-2 rounded-lg border text-center text-sm font-medium transition-all ${receipt.titleAlign === a.key ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION: Header */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phần đầu phiếu</p>
                  <div className="space-y-2">
                    {[
                      { key: 'showLogo' as const, title: 'Tên cửa hàng', desc: 'Hiện tên shop lớn ở đầu phiếu' },
                      { key: 'showTaxId' as const, title: 'Mã số thuế', desc: 'Hiện MST trên phiếu in' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                        <Switch checked={receipt[item.key]} onCheckedChange={v => updateReceipt(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: Info */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông tin đơn hàng</p>
                  <div className="space-y-2">
                    {[
                      { key: 'showDate' as const, title: 'Ngày tạo', desc: 'Hiện ngày lập hóa đơn' },
                      { key: 'showTime' as const, title: 'Giờ tạo', desc: 'Hiện giờ lập hóa đơn' },
                      { key: 'showCashier' as const, title: 'Thu ngân', desc: 'Hiện tên nhân viên thu ngân' },
                      { key: 'showCustomer' as const, title: 'Tên khách hàng', desc: 'Hiện tên khách hàng (nếu có)' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                        <Switch checked={receipt[item.key]} onCheckedChange={v => updateReceipt(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: Items */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Danh sách sản phẩm</p>
                  <div className="space-y-2">
                    {[
                      { key: 'showItemNumber' as const, title: 'STT sản phẩm', desc: 'Hiện số thứ tự từng dòng' },
                      { key: 'showSKU' as const, title: 'Mã SKU', desc: 'Hiện mã sản phẩm bên dưới tên' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                        <Switch checked={receipt[item.key]} onCheckedChange={v => updateReceipt(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: Totals */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phần tổng cộng</p>
                  <div className="space-y-2">
                    {[
                      { key: 'showSubtotal' as const, title: 'Tạm tính', desc: 'Hiện dòng tạm tính trước giảm giá' },
                      { key: 'boldTotal' as const, title: 'In đậm tổng cộng', desc: 'Tổng cộng được in rất đậm & lớn' },
                      { key: 'showPaymentMethod' as const, title: 'Phương thức thanh toán', desc: 'Hiện cách thanh toán (tiền mặt / thẻ)' },
                      { key: 'showChange' as const, title: 'Tiền thừa', desc: 'Hiện tiền thừa trả lại khách' },
                      { key: 'showOrderNote' as const, title: 'Ghi chú đơn hàng', desc: 'Hiện ghi chú nếu có' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                        <Switch checked={receipt[item.key]} onCheckedChange={v => updateReceipt(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: Footer */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phần cuối phiếu</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div><p className="text-sm font-medium text-gray-900">Mã QR thanh toán</p><p className="text-xs text-gray-500">Hiện QR chuyển khoản trên phiếu</p></div>
                      <Switch checked={receipt.showQR} onCheckedChange={v => updateReceipt('showQR', v)} />
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div><p className="text-sm font-medium text-gray-900">Powered by VinPOS</p><p className="text-xs text-gray-500">Hiện dòng thương hiệu cuối phiếu</p></div>
                      <Switch checked={receipt.showPoweredBy} onCheckedChange={v => updateReceipt('showPoweredBy', v)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Lời chào đầu phiếu</Label>
                  <Input value={receipt.headerText} onChange={e => updateReceipt('headerText', e.target.value)} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Chân phiếu</Label>
                  <Textarea value={receipt.footerText} onChange={e => updateReceipt('footerText', e.target.value)} className="rounded-lg" rows={3} />
                </div>

                <div className="flex gap-2 sticky bottom-0 bg-white pt-3 border-t border-gray-100">
                  <Button onClick={() => { setReceipt(defaultReceipt); toast.success('Đã khôi phục mặc định'); }} variant="outline" className="rounded-lg gap-2">
                    <RotateCcw className="w-4 h-4" /> Mặc định
                  </Button>
                  <Button onClick={handleSaveSettings} disabled={settingsSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                    {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {settingsSaving ? 'Đang lưu...' : 'Lưu mẫu'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* LIVE PREVIEW */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Eye className="w-4 h-4" /> Xem trước phiếu in</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleTestPrint} className="rounded-lg text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50">
                    <Printer className="w-3 h-3" /> In thử
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="rounded-lg text-xs gap-1">
                    <Eye className="w-3 h-3" /> Phóng to
                  </Button>
                </div>
              </div>
              <ReceiptPreview receipt={receipt} items={sampleItems} subtotal={sampleSubtotal} discount={sampleDiscount} total={sampleTotal} />
            </div>
          </div>
        )}

        {/* ====== NOTIFICATIONS ====== */}
        {activeTab === 'notify' && (
          <Card className="bg-white border-gray-100 shadow-sm rounded-xl">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Thông báo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
              {[
                { key: 'lowStockAlert' as const, title: 'Cảnh báo hết hàng', desc: 'Thông báo khi tồn kho dưới mức tối thiểu', icon: <Settings className="w-4 h-4 text-orange-500" /> },
                { key: 'orderSound' as const, title: 'Âm thanh khi bán hàng', desc: 'Phát âm thanh khi thêm sản phẩm vào giỏ', icon: <Bell className="w-4 h-4 text-blue-500" /> },
                { key: 'dailyReport' as const, title: 'Báo cáo hàng ngày', desc: 'Gửi báo cáo doanh thu cuối ngày', icon: <Clock className="w-4 h-4 text-green-500" /> },
                { key: 'emailNotify' as const, title: 'Thông báo email', desc: 'Nhận thông báo qua email', icon: <Mail className="w-4 h-4 text-purple-500" /> },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Switch checked={notify[item.key]} onCheckedChange={v => setNotify(prev => ({ ...prev, [item.key]: v }))} className="flex-shrink-0" />
                </div>
              ))}
              <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 mt-2 text-sm">
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {settingsSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md p-4 sm:p-8 bg-gray-100 mx-1 sm:mx-auto rounded-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm sm:text-base"><Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Phiếu in ({receipt.paperSize})</DialogTitle></DialogHeader>
          <ReceiptPreview receipt={receipt} items={sampleItems} subtotal={sampleSubtotal} discount={sampleDiscount} total={sampleTotal} large />
        </DialogContent>
      </Dialog>

      {/* ====== CREATE EMPLOYEE DIALOG ====== */}
      <Dialog open={showCreateEmployee} onOpenChange={setShowCreateEmployee}>
        <DialogContent className="sm:max-w-md mx-1 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Thêm nhân viên mới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /> Họ tên *</Label>
              <Input
                placeholder="Nhập họ tên nhân viên"
                value={employeeForm.name}
                onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-10 rounded-lg"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={employeeForm.email}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> SĐT *</Label>
                <Input
                  placeholder="09xxxxxxxx"
                  value={employeeForm.phone}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-gray-400" /> Mật khẩu * (tối thiểu 6 ký tự)</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu"
                value={employeeForm.password}
                onChange={e => setEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-medium mb-1">Lưu ý:</p>
              <p>Nhân viên sẽ dùng email và mật khẩu này để đăng nhập. Sau khi đăng nhập, nhân viên chỉ có thể sử dụng chức năng bán hàng (POS).</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateEmployee(false)} className="flex-1 rounded-lg">Hủy</Button>
              <Button
                onClick={handleCreateEmployee}
                disabled={saving}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 rounded-lg gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {saving ? 'Đang tạo...' : 'Tạo nhân viên'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== EDIT EMPLOYEE DIALOG ====== */}
      <Dialog open={!!showEditEmployee} onOpenChange={() => setShowEditEmployee(null)}>
        <DialogContent className="sm:max-w-md mx-1 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" /> Chỉnh sửa nhân viên
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /> Họ tên</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-10 rounded-lg"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> SĐT</Label>
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditEmployee(null)} className="flex-1 rounded-lg">Hủy</Button>
              <Button
                onClick={handleUpdateEmployee}
                disabled={saving}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 rounded-lg gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== RESET PASSWORD DIALOG ====== */}
      <Dialog open={!!showResetPassword} onOpenChange={() => setShowResetPassword(null)}>
        <DialogContent className="sm:max-w-sm mx-1 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-yellow-600" /> Đổi mật khẩu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
              <p className="text-sm text-yellow-800">
                Đổi mật khẩu cho nhân viên: <strong>{showResetPassword?.name}</strong>
              </p>
              <p className="text-xs text-yellow-600 mt-1">{showResetPassword?.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu mới (tối thiểu 6 ký tự)</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="h-10 rounded-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowResetPassword(null)} className="flex-1 rounded-lg">Hủy</Button>
              <Button
                onClick={handleResetPassword}
                disabled={saving || newPassword.length < 6}
                className="flex-[2] bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== DELETE CONFIRM DIALOG ====== */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm mx-1 sm:mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" /> Vô hiệu hóa nhân viên
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
              <p className="text-sm text-red-800">
                Bạn có chắc muốn vô hiệu hóa tài khoản nhân viên:
              </p>
              <p className="text-base font-bold text-red-900 mt-1">{showDeleteConfirm?.name}</p>
              <p className="text-xs text-red-600 mt-0.5">{showDeleteConfirm?.email}</p>
              <p className="text-xs text-red-500 mt-2">Nhân viên sẽ không thể đăng nhập nữa.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-lg">Không</Button>
              <Button
                onClick={handleDeleteEmployee}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white rounded-lg gap-2"
              >
                <Trash2 className="w-4 h-4" /> Vô hiệu hóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== RECEIPT PREVIEW COMPONENT ======
function ReceiptPreview({
  receipt, items, subtotal, discount, total, large = false,
}: {
  receipt: ReceiptSettings;
  items: { name: string; qty: number; price: number; discount: number }[];
  subtotal: number; discount: number; total: number; large?: boolean;
}) {
  const fontSize = receipt.fontSize === 'small' ? 'text-[9px]' : receipt.fontSize === 'large' ? 'text-[13px]' : 'text-[11px]';
  const titleSize = receipt.fontSize === 'small' ? 'text-xs' : receipt.fontSize === 'large' ? 'text-lg' : 'text-sm';
  const fontWeightCls = receipt.fontWeight === 'normal' ? 'font-normal' : receipt.fontWeight === 'bolder' ? 'font-black' : 'font-semibold';
  const lineHeightCls = receipt.lineHeight === 'compact' ? 'space-y-0.5' : receipt.lineHeight === 'relaxed' ? 'space-y-3' : 'space-y-2';
  const borderCls = `border-b border-${receipt.borderStyle} border-gray-400`;
  const paddingCls = receipt.padding === 'compact' ? 'px-2 py-2' : receipt.padding === 'spacious' ? 'px-6 py-5' : 'px-4 py-3';
  const alignCls = receipt.titleAlign === 'left' ? 'text-left' : receipt.titleAlign === 'right' ? 'text-right' : 'text-center';

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-inner mx-auto font-mono overflow-hidden ${receipt.paperSize === '58mm' ? (large ? 'max-w-[270px]' : 'max-w-[220px]') : (large ? 'max-w-[350px]' : 'max-w-[280px]')
      }`}>
      {/* Top tear edge */}
      <div className="h-3 bg-gradient-to-b from-gray-200 to-white" />

      <div className={`${paddingCls} ${lineHeightCls} ${fontSize} ${fontWeightCls}`}>
        {/* Header */}
        <div className={`${alignCls} space-y-0.5`}>
          {receipt.showLogo && (
            <p className={`font-extrabold ${titleSize} tracking-wide`}>{receipt.shopName}</p>
          )}
          <p className="text-gray-500">{receipt.shopAddress}</p>
          <p className="text-gray-500">ĐT: {receipt.shopPhone}</p>
          {receipt.showTaxId && receipt.taxId && (
            <p className="text-gray-500">MST: {receipt.taxId}</p>
          )}
          {receipt.headerText && (
            <p className="italic text-gray-400 mt-1">{receipt.headerText}</p>
          )}
        </div>

        <div className={borderCls} />

        {/* Receipt title */}
        {receipt.receiptTitle && (
          <p className={`${alignCls} font-extrabold ${titleSize} tracking-widest py-0.5`}>{receipt.receiptTitle}</p>
        )}

        {/* Receipt info */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Số HĐ:</span>
            <span className="font-bold">#KV-20260315-001</span>
          </div>
          {receipt.showDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày:</span>
              <span>15/03/2026{receipt.showTime ? ' 19:30' : ''}</span>
            </div>
          )}
          {receipt.showCashier && (
            <div className="flex justify-between">
              <span className="text-gray-500">Thu ngân:</span>
              <span>Nguyễn Văn A</span>
            </div>
          )}
          {receipt.showCustomer && (
            <div className="flex justify-between">
              <span className="text-gray-500">Khách:</span>
              <span>Trần Thị B</span>
            </div>
          )}
        </div>

        <div className={borderCls} />

        {/* Items */}
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between">
                <span className="truncate flex-1 mr-2 font-medium">
                  {receipt.showItemNumber ? `${i + 1}. ` : ''}{item.name}
                </span>
              </div>
              {receipt.showSKU && (
                <p className="text-gray-400 pl-2" style={{ fontSize: '8px' }}>SKU: SP-{String(1000 + i)}</p>
              )}
              <div className="flex justify-between pl-2 text-gray-500">
                <span>{item.qty} x {formatCurrency(item.price)}</span>
                <span className="font-medium text-gray-700">{formatCurrency(item.price * item.qty)}</span>
              </div>
              {item.discount > 0 && (
                <div className="flex justify-between pl-2 text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(item.discount * item.qty)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={borderCls} />

        {/* Totals */}
        <div className="space-y-0.5">
          {receipt.showSubtotal && (
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className={`flex justify-between ${receipt.boldTotal ? 'font-extrabold' : 'font-semibold'} border-t border-${receipt.borderStyle} border-gray-400 pt-1 ${receipt.boldTotal ? titleSize : ''}`}>
            <span>TỔNG CỘNG:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {receipt.showPaymentMethod && (
            <div className="flex justify-between">
              <span>Tiền mặt:</span>
              <span>{formatCurrency(32000000)}</span>
            </div>
          )}
          {receipt.showChange && (
            <div className="flex justify-between font-bold">
              <span>Tiền thừa:</span>
              <span>{formatCurrency(32000000 - total)}</span>
            </div>
          )}
        </div>

        {receipt.showOrderNote && (
          <>
            <div className={borderCls} />
            <div className="text-gray-500 italic">
              <span className="font-medium text-gray-700">Ghi chú: </span>Giao hàng trước 5h chiều
            </div>
          </>
        )}

        <div className={borderCls} />

        {/* QR Code placeholder */}
        {receipt.showQR && (
          <div className="text-center py-2">
            <div className="w-20 h-20 mx-auto bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center mb-1">
              <QrCode className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-[9px] text-gray-400">Quét để chuyển khoản</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-0.5 pt-1">
          {receipt.footerText.split('\n').map((line, i) => (
            <p key={i} className="text-gray-500">{line}</p>
          ))}
          {receipt.showPoweredBy && (
            <p className="text-gray-300 mt-2">— Powered by VinPOS —</p>
          )}
        </div>
      </div>

      {/* Bottom tear edge */}
      <div className="h-3 bg-gradient-to-t from-gray-200 to-white" />
    </div>
  );
}
