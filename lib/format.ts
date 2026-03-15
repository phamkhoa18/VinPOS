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
  createdAt: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}): string {
  const paymentMethodMap: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
    card: 'Thẻ',
    momo: 'MoMo',
    zalopay: 'ZaloPay',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 5mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .shop-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .item { margin: 3px 0; }
    .item-name { font-weight: bold; }
    .total-row { font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="center">
    <div class="shop-name">${order.shopName || 'VinPOS Store'}</div>
    <div>${order.shopAddress || ''}</div>
    <div>ĐT: ${order.shopPhone || ''}</div>
  </div>
  <div class="line"></div>
  <div class="center bold">HÓA ĐƠN BÁN HÀNG</div>
  <div class="row"><span>Số HĐ:</span><span>${order.orderNumber}</span></div>
  <div class="row"><span>Ngày:</span><span>${formatDateTime(order.createdAt)}</span></div>
  ${order.customerName ? `<div class="row"><span>KH:</span><span>${order.customerName}</span></div>` : ''}
  <div class="line"></div>
  ${order.items.map((item, i) => `
    <div class="item">
      <div class="item-name">${i + 1}. ${item.productName}</div>
      <div class="row">
        <span>${item.quantity} x ${formatCurrency(item.price)}</span>
        <span>${formatCurrency(item.total)}</span>
      </div>
      ${item.discount > 0 ? `<div class="row"><span>  Giảm giá:</span><span>-${formatCurrency(item.discount * item.quantity)}</span></div>` : ''}
    </div>
  `).join('')}
  <div class="line"></div>
  <div class="row"><span>Tạm tính:</span><span>${formatCurrency(order.subtotal)}</span></div>
  ${order.discount > 0 ? `<div class="row"><span>Giảm giá:</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
  <div class="line"></div>
  <div class="row total-row"><span>TỔNG CỘNG:</span><span>${formatCurrency(order.total)}</span></div>
  <div class="row"><span>Thanh toán (${paymentMethodMap[order.paymentMethod] || order.paymentMethod}):</span><span>${formatCurrency(order.amountPaid)}</span></div>
  ${order.changeAmount > 0 ? `<div class="row"><span>Tiền thừa:</span><span>${formatCurrency(order.changeAmount)}</span></div>` : ''}
  <div class="line"></div>
  <div class="center" style="margin-top: 8px;">
    <div>Cảm ơn quý khách!</div>
    <div>Hẹn gặp lại ♥</div>
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
