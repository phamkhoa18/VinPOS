// Format Vietnamese currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

// Format short number (e.g., 1.2M)
export function formatShortNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// Format datetime
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatDate(date);
}

// Generate receipt for printing
export function generateReceiptHTML(order: {
  orderNumber: string;
  items: Array<{ productName: string; quantity: number; price: number; discount: number; total: number }>;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  customerName?: string;
  cashierName?: string;
  note?: string;
  createdAt: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  taxId?: string;
}, settings?: {
  paperSize?: '58mm' | '80mm';
  fontSize?: 'small' | 'medium' | 'large';
  fontWeight?: 'normal' | 'bold' | 'bolder';
  lineHeight?: 'compact' | 'normal' | 'relaxed';
  borderStyle?: 'dashed' | 'dotted' | 'solid';
  padding?: 'compact' | 'normal' | 'spacious';
  receiptTitle?: string;
  titleAlign?: 'left' | 'center' | 'right';
  headerText?: string;
  footerText?: string;
  showLogo?: boolean;
  showTaxId?: boolean;
  showQR?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  showCashier?: boolean;
  showCustomer?: boolean;
  showItemNumber?: boolean;
  showSKU?: boolean;
  showSubtotal?: boolean;
  showPaymentMethod?: boolean;
  showChange?: boolean;
  showOrderNote?: boolean;
  boldTotal?: boolean;
  showPoweredBy?: boolean;
}): string {
  const s = {
    paperSize: '80mm', fontSize: 'medium', fontWeight: 'bold', lineHeight: 'normal',
    borderStyle: 'dashed', padding: 'normal', receiptTitle: 'HÓA ĐƠN BÁN HÀNG',
    titleAlign: 'center', headerText: '', footerText: 'Cảm ơn quý khách!\nHẹn gặp lại ♥',
    showLogo: true, showTaxId: false, showQR: false, showDate: true, showTime: true,
    showCashier: true, showCustomer: true, showItemNumber: true, showSKU: false,
    showSubtotal: true, showPaymentMethod: true, showChange: true, showOrderNote: true,
    boldTotal: true, showPoweredBy: true, ...settings,
  };

  const paymentMethodMap: Record<string, string> = {
    cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', momo: 'MoMo', zalopay: 'ZaloPay',
  };

  const fontSizePx = s.fontSize === 'small' ? '10px' : s.fontSize === 'large' ? '14px' : '12px';
  const titleSizePx = s.fontSize === 'small' ? '14px' : s.fontSize === 'large' ? '20px' : '16px';
  const fw = s.fontWeight === 'normal' ? '400' : s.fontWeight === 'bolder' ? '900' : '700';
  const lh = s.lineHeight === 'compact' ? '1.2' : s.lineHeight === 'relaxed' ? '1.8' : '1.5';
  const border = `1px ${s.borderStyle} #000`;
  const pad = s.padding === 'compact' ? '2mm' : s.padding === 'spacious' ? '8mm' : '5mm';
  const align = s.titleAlign;

  const dateStr = s.showDate ? (s.showTime ? formatDateTime(order.createdAt) : formatDate(order.createdAt)) : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: ${fontSizePx}; font-weight: ${fw}; line-height: ${lh}; width: ${s.paperSize}; padding: ${pad}; }
    .center { text-align: center; }
    .align { text-align: ${align}; }
    .bold { font-weight: bold; }
    .bolder { font-weight: 900; }
    .line { border-top: ${border}; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .shop-name { font-size: ${titleSizePx}; font-weight: 900; margin-bottom: 4px; }
    .receipt-title { font-size: ${titleSizePx}; font-weight: 900; letter-spacing: 2px; text-align: ${align}; margin: 4px 0; }
    .item { margin: 3px 0; }
    .item-name { font-weight: bold; }
    .item-sku { font-size: ${s.fontSize === 'small' ? '8px' : '9px'}; color: #666; padding-left: 8px; }
    .total-row { font-size: ${s.boldTotal ? titleSizePx : fontSizePx}; font-weight: ${s.boldTotal ? '900' : fw}; }
    .note { font-style: italic; color: #555; margin: 3px 0; }
    .powered { color: #999; margin-top: 8px; font-size: 9px; }
  </style>
</head>
<body>
  ${s.showLogo ? `<div class="align"><div class="shop-name">${order.shopName || 'VinPOS Store'}</div></div>` : ''}
  <div class="align">
    ${order.shopAddress ? `<div>${order.shopAddress}</div>` : ''}
    ${order.shopPhone ? `<div>ĐT: ${order.shopPhone}</div>` : ''}
    ${s.showTaxId && order.taxId ? `<div>MST: ${order.taxId}</div>` : ''}
  </div>
  ${s.headerText ? `<div class="align" style="font-style: italic; color: #666; margin-top: 4px;">${s.headerText}</div>` : ''}
  <div class="line"></div>
  ${s.receiptTitle ? `<div class="receipt-title">${s.receiptTitle}</div>` : ''}
  <div class="row"><span>Số HĐ:</span><span>${order.orderNumber}</span></div>
  ${dateStr ? `<div class="row"><span>Ngày:</span><span>${dateStr}</span></div>` : ''}
  ${s.showCashier && order.cashierName ? `<div class="row"><span>Thu ngân:</span><span>${order.cashierName}</span></div>` : ''}
  ${s.showCustomer && order.customerName ? `<div class="row"><span>KH:</span><span>${order.customerName}</span></div>` : ''}
  <div class="line"></div>
  ${order.items.map((item, i) => `
    <div class="item">
      <div class="item-name">${s.showItemNumber ? `${i + 1}. ` : ''}${item.productName}</div>
      ${s.showSKU ? `<div class="item-sku">SKU: SP-${String(1000 + i)}</div>` : ''}
      <div class="row">
        <span>${item.quantity} x ${formatCurrency(item.price)}</span>
        <span>${formatCurrency(item.total)}</span>
      </div>
      ${item.discount > 0 ? `<div class="row"><span>  Giảm giá:</span><span>-${formatCurrency(item.discount * item.quantity)}</span></div>` : ''}
    </div>
  `).join('')}
  <div class="line"></div>
  ${s.showSubtotal ? `<div class="row"><span>Tạm tính:</span><span>${formatCurrency(order.subtotal)}</span></div>` : ''}
  ${order.discount > 0 ? `<div class="row"><span>Giảm giá:</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
  <div class="line"></div>
  <div class="row total-row"><span>TỔNG CỘNG:</span><span>${formatCurrency(order.total)}</span></div>
  ${s.showPaymentMethod ? `<div class="row"><span>Thanh toán (${paymentMethodMap[order.paymentMethod] || order.paymentMethod}):</span><span>${formatCurrency(order.amountPaid)}</span></div>` : ''}
  ${s.showChange && order.changeAmount > 0 ? `<div class="row"><span>Tiền thừa:</span><span>${formatCurrency(order.changeAmount)}</span></div>` : ''}
  ${s.showOrderNote && order.note ? `<div class="line"></div><div class="note"><strong>Ghi chú:</strong> ${order.note}</div>` : ''}
  <div class="line"></div>
  <div class="align" style="margin-top: 8px;">
    ${s.footerText.split('\n').map(line => `<div>${line}</div>`).join('')}
    ${s.showPoweredBy ? '<div class="powered">— Powered by VinPOS —</div>' : ''}
  </div>
</body>
</html>`;
}

// Print receipt
export function printReceipt(receiptHTML: string) {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}

// Order status helpers
export const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Hoàn trả', color: 'bg-purple-100 text-purple-800' },
};

export const paymentMethodMap: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
};
