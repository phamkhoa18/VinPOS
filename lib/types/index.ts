// ========== USER & AUTH TYPES ==========
export type UserRole = 'admin' | 'shop_owner' | 'employee';
export type ShopMode = 'management' | 'pos';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  shopId?: string;
  isActive: boolean;
  createdAt: string;
}

// ========== PRODUCT TYPES ==========
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  productCount: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: Category;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== ORDER TYPES ==========
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'momo' | 'zalopay';

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customer?: Customer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ========== CUSTOMER TYPES ==========
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  points: number;
  createdAt: string;
}

// ========== SHOP TYPES ==========
export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  logo?: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

// ========== INVENTORY TYPES ==========
export type InventoryAction = 'import' | 'export' | 'adjustment';

export interface InventoryLog {
  id: string;
  productId: string;
  product?: Product;
  action: InventoryAction;
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

// ========== EMPLOYEE TYPES ==========
export interface Employee {
  id: string;
  userId: string;
  user?: User;
  shopId: string;
  position: string;
  salary: number;
  isActive: boolean;
  startDate: string;
}

// ========== DASHBOARD STATS ==========
export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  todayCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  recentOrders: Order[];
  topProducts: { product: Product; soldCount: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

// ========== CART (POS) ==========
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}
