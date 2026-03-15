import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== Types ==========
export interface UserData {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'shop_owner' | 'employee';
  avatar?: string;
  shopId?: string;
  isActive: boolean;
  createdAt: string;
}

export type ShopMode = 'management' | 'pos';

export interface CartItem {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    stock: number;
    unit: string;
    image?: string;
    categoryId: string;
  };
  quantity: number;
  discount: number;
}

// ========== AUTH STORE ==========
interface AuthState {
  user: UserData | null;
  shopId: string | null;
  isAuthenticated: boolean;
  shopMode: ShopMode;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setShopMode: (mode: ShopMode) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      shopId: null,
      isAuthenticated: false,
      shopMode: 'management',
      isLoading: true,

      login: async (email, password) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) return { success: false, error: data.error };
          
          set({
            user: data.user,
            shopId: data.shopId,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'Lỗi kết nối server' };
        }
      },

      register: async (formData) => {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const data = await res.json();
          if (!res.ok) return { success: false, error: data.error };

          set({
            user: data.user,
            shopId: data.shopId,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'Lỗi kết nối server' };
        }
      },

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        set({ user: null, shopId: null, isAuthenticated: false, shopMode: 'management' });
      },

      checkAuth: async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            set({
              user: data.user,
              shopId: data.shopId,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setShopMode: (mode) => set({ shopMode: mode }),
    }),
    {
      name: 'vinpos-auth',
      partialize: (state) => ({
        shopMode: state.shopMode,
      }),
    }
  )
);

// ========== CART STORE (POS) ==========
interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  note: string;
  paymentMethod: string;
  amountPaid: number;
  addItem: (product: CartItem['product']) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setCustomer: (id: string | null, name?: string) => void;
  setNote: (note: string) => void;
  setPaymentMethod: (method: string) => void;
  setAmountPaid: (amount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getChangeAmount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  customerId: null,
  customerName: '',
  note: '',
  paymentMethod: 'cash',
  amountPaid: 0,

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return; // Don't exceed stock
      set({
        items: get().items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ items: [...get().items, { product, quantity: 1, discount: 0 }] });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.min(quantity, i.product.stock) } : i
      ),
    });
  },

  updateDiscount: (productId, discount) => {
    set({
      items: get().items.map((i) =>
        i.product.id === productId ? { ...i, discount: Math.max(0, discount) } : i
      ),
    });
  },

  setCustomer: (id, name = '') => set({ customerId: id, customerName: name }),
  setNote: (note) => set({ note }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setAmountPaid: (amount) => set({ amountPaid: amount }),

  clearCart: () =>
    set({ items: [], customerId: null, customerName: '', note: '', paymentMethod: 'cash', amountPaid: 0 }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  getTotalDiscount: () => get().items.reduce((sum, i) => sum + i.discount * i.quantity, 0),
  getTotal: () => get().getSubtotal() - get().getTotalDiscount(),
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  getChangeAmount: () => Math.max(0, get().amountPaid - get().getTotal()),
}));
