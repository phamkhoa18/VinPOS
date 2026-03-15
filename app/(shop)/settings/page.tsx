'use client';

import { useState } from 'react';
import {
  Settings, Store, Printer, Bell, Receipt, Eye, Save, FileText,
  Type, AlignLeft, Hash, Phone, Mail, MapPin, Clock, QrCode,
  Palette, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, generateReceiptHTML, printReceipt } from '@/lib/format';
import toast from 'react-hot-toast';

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
};

const sampleItems = [
  { name: 'iPhone 15 Pro Max', qty: 1, price: 29990000, discount: 0 },
  { name: 'Ốp lưng MagSafe', qty: 2, price: 890000, discount: 90000 },
  { name: 'Cường lực 9H', qty: 3, price: 150000, discount: 0 },
];

export default function SettingsPage() {
  const [receipt, setReceipt] = useState<ReceiptSettings>(defaultReceipt);
  const [notify, setNotify] = useState<NotifySettings>({
    lowStockAlert: true, orderSound: false, dailyReport: false, emailNotify: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'shop' | 'printer' | 'receipt' | 'notify'>('shop');

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
    });
    printReceipt(html);
    toast.success('Đã gửi lệnh in thử!');
  };

  const updateReceipt = (key: keyof ReceiptSettings, value: unknown) => {
    setReceipt(prev => ({ ...prev, [key]: value }));
  };

  const sampleSubtotal = sampleItems.reduce((s, i) => s + i.price * i.qty, 0);
  const sampleDiscount = sampleItems.reduce((s, i) => s + i.discount * i.qty, 0);
  const sampleTotal = sampleSubtotal - sampleDiscount;

  const tabs = [
    { key: 'shop', label: 'Cửa hàng', icon: <Store className="w-4 h-4" /> },
    { key: 'printer', label: 'Máy in', icon: <Printer className="w-4 h-4" /> },
    { key: 'receipt', label: 'Phiếu in', icon: <Receipt className="w-4 h-4" /> },
    { key: 'notify', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" /> Cài đặt</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tùy chỉnh cửa hàng và hệ thống</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl">
        {/* ====== SHOP INFO ====== */}
        {activeTab === 'shop' && (
          <Card className="bg-white border-gray-100 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" /> Thông tin cửa hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-gray-400" /> Tên cửa hàng</Label>
                  <Input value={receipt.shopName} onChange={e => updateReceipt('shopName', e.target.value)} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> Số điện thoại</Label>
                  <Input value={receipt.shopPhone} onChange={e => updateReceipt('shopPhone', e.target.value)} className="h-10 rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Địa chỉ</Label>
                <Input value={receipt.shopAddress} onChange={e => updateReceipt('shopAddress', e.target.value)} className="h-10 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email</Label>
                  <Input value={receipt.shopEmail} onChange={e => updateReceipt('shopEmail', e.target.value)} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-gray-400" /> Mã số thuế</Label>
                  <Input value={receipt.taxId} onChange={e => updateReceipt('taxId', e.target.value)} placeholder="Nhập MST (nếu có)" className="h-10 rounded-lg" />
                </div>
              </div>
              <Button onClick={() => toast.success('Đã lưu thông tin cửa hàng!')} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                <Save className="w-4 h-4" /> Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ====== PRINTER CONFIG ====== */}
        {activeTab === 'printer' && (
          <div className="space-y-4">
            <Card className="bg-white border-gray-100 shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" /> Cấu hình máy in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Paper size */}
                <div className="space-y-2">
                  <Label className="font-medium">Khổ giấy in</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['58mm', '80mm'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => updateReceipt('paperSize', size)}
                        className={`p-4 rounded-lg border-2 transition-all text-center ${
                          receipt.paperSize === size
                            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className={`mx-auto mb-2 bg-gray-100 rounded border border-gray-300 ${
                          size === '58mm' ? 'w-10 h-16' : 'w-14 h-16'
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
                        className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${
                          receipt.fontSize === s.key
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

                <div className="flex gap-2">
                  <Button onClick={() => toast.success('Đã lưu cấu hình máy in!')} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                    <Save className="w-4 h-4" /> Lưu cấu hình
                  </Button>
                  <Button variant="outline" onClick={handleTestPrint} className="rounded-lg gap-2 border-green-300 text-green-700 hover:bg-green-50">
                    <Printer className="w-4 h-4" /> In thử
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== RECEIPT TEMPLATE ====== */}
        {activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Config */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" /> Tùy chỉnh phiếu in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium text-gray-900">Hiện logo</p><p className="text-xs text-gray-500">Hiện tên shop lớn ở đầu phiếu</p></div>
                    <Switch checked={receipt.showLogo} onCheckedChange={v => updateReceipt('showLogo', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium text-gray-900">Mã QR thanh toán</p><p className="text-xs text-gray-500">Hiện QR chuyển khoản trên phiếu</p></div>
                    <Switch checked={receipt.showQR} onCheckedChange={v => updateReceipt('showQR', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium text-gray-900">Mã số thuế</p><p className="text-xs text-gray-500">Hiện MST trên phiếu in</p></div>
                    <Switch checked={receipt.showTaxId} onCheckedChange={v => updateReceipt('showTaxId', v)} />
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

                <div className="flex gap-2">
                  <Button onClick={() => { setReceipt(defaultReceipt); toast.success('Đã khôi phục mặc định'); }} variant="outline" className="rounded-lg gap-2">
                    <RotateCcw className="w-4 h-4" /> Mặc định
                  </Button>
                  <Button onClick={() => toast.success('Đã lưu mẫu phiếu in!')} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg gap-2">
                    <Save className="w-4 h-4" /> Lưu mẫu
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
          <Card className="bg-white border-gray-100 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" /> Thông báo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'lowStockAlert' as const, title: 'Cảnh báo hết hàng', desc: 'Thông báo khi tồn kho dưới mức tối thiểu', icon: <Settings className="w-4 h-4 text-orange-500" /> },
                { key: 'orderSound' as const, title: 'Âm thanh khi bán hàng', desc: 'Phát âm thanh khi thêm sản phẩm vào giỏ', icon: <Bell className="w-4 h-4 text-blue-500" /> },
                { key: 'dailyReport' as const, title: 'Báo cáo hàng ngày', desc: 'Gửi báo cáo doanh thu cuối ngày', icon: <Clock className="w-4 h-4 text-green-500" /> },
                { key: 'emailNotify' as const, title: 'Thông báo email', desc: 'Nhận thông báo qua email', icon: <Mail className="w-4 h-4 text-purple-500" /> },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <Switch checked={notify[item.key]} onCheckedChange={v => setNotify(prev => ({ ...prev, [item.key]: v }))} />
                </div>
              ))}
              <Button onClick={() => toast.success('Đã lưu cài đặt thông báo!')} className="bg-blue-600 hover:bg-blue-700 rounded-lg gap-2 mt-2">
                <Save className="w-4 h-4" /> Lưu cài đặt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md p-8 bg-gray-100">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> Xem trước phiếu in ({receipt.paperSize})</DialogTitle></DialogHeader>
          <ReceiptPreview receipt={receipt} items={sampleItems} subtotal={sampleSubtotal} discount={sampleDiscount} total={sampleTotal} large />
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
  const titleSize = receipt.fontSize === 'small' ? 'text-xs' : receipt.fontSize === 'large' ? 'text-base' : 'text-sm';

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-inner mx-auto font-mono overflow-hidden ${
      receipt.paperSize === '58mm' ? (large ? 'max-w-[270px]' : 'max-w-[220px]') : (large ? 'max-w-[350px]' : 'max-w-[280px]')
    }`}>
      {/* Top tear edge */}
      <div className="h-3 bg-gradient-to-b from-gray-200 to-white" />

      <div className={`px-4 py-3 space-y-2 ${fontSize}`}>
        {/* Header */}
        <div className="text-center space-y-0.5">
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

        {/* Divider */}
        <div className="border-b border-dashed border-gray-400" />

        {/* Receipt info */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Số HĐ:</span>
            <span className="font-bold">#KV-20260315-001</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ngày:</span>
            <span>15/03/2026 19:30</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thu ngân:</span>
            <span>Nguyễn Văn A</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Khách:</span>
            <span>Trần Thị B</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Items */}
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between">
                <span className="truncate flex-1 mr-2 font-medium">{item.name}</span>
              </div>
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

        <div className="border-b border-dashed border-gray-400" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Tạm tính:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className={`flex justify-between font-extrabold border-t border-dashed border-gray-400 pt-1 ${titleSize}`}>
            <span>TỔNG CỘNG:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tiền mặt:</span>
            <span>{formatCurrency(32000000)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Tiền thừa:</span>
            <span>{formatCurrency(32000000 - total)}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

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
          <p className="text-gray-300 mt-2">— Powered by VinPOS —</p>
        </div>
      </div>

      {/* Bottom tear edge */}
      <div className="h-3 bg-gradient-to-t from-gray-200 to-white" />
    </div>
  );
}
