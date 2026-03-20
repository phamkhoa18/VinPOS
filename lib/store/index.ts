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

// Single order tab data
export interface OrderTab {
  id: string;
  label: string;
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  note: string;
  paymentMethod: string;
  amountPaid: number;
  billDiscount: number;
  billDiscountType: 'fixed' | 'percent';
  createdAt: number;
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
          if (!res.ok) {
            if (data.needVerification) {
              return { success: false, error: data.error, needVerification: true, email: data.email };
            }
            return { success: false, error: data.error };
          }

          // Auto-set POS mode for employees
          const isEmployee = data.user?.role === 'employee';
          set({
            user: data.user,
            shopId: data.shopId,
            isAuthenticated: true,
            isLoading: false,
            ...(isEmployee ? { shopMode: 'pos' as const } : {}),
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

          // Don't auto-login - user needs to verify email first
          return { success: true, needVerification: data.needVerification };
        } catch {
          return { success: false, error: 'Lỗi kết nối server' };
        }
      },

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        set({ user: null, shopId: null, isAuthenticated: false, shopMode: 'management', isLoading: false });
      },

      checkAuth: async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            // Auto-set POS mode for employees
            const isEmployee = data.user?.role === 'employee';
            set({
              user: data.user,
              shopId: data.shopId,
              isAuthenticated: true,
              isLoading: false,
              ...(isEmployee ? { shopMode: 'pos' } : {}),
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

// ========== HELPER: Create empty tab ==========
let _tabCounter = 1;
function createNewTab(): OrderTab {
  const num = _tabCounter++;
  return {
    id: `tab_${Date.now()}_${num}`,
    label: `Đơn ${num}`,
    items: [],
    customerId: null,
    customerName: '',
    note: '',
    paymentMethod: 'cash',
    amountPaid: 0,
    billDiscount: 0,
    billDiscountType: 'fixed',
    createdAt: Date.now(),
  };
}

// ========== CART STORE (POS) with MULTI-TAB ==========
interface CartState {
  // Multi-tab
  tabs: OrderTab[];
  activeTabId: string;

  // Computed from active tab (for backward compat)
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  note: string;
  paymentMethod: string;
  amountPaid: number;
  billDiscount: number;
  billDiscountType: 'fixed' | 'percent';

  // Tab management
  addTab: () => void;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, label: string) => void;

  // Cart actions (operate on active tab)
  addItem: (product: CartItem['product']) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setCustomer: (id: string | null, name?: string) => void;
  setNote: (note: string) => void;
  setPaymentMethod: (method: string) => void;
  setAmountPaid: (amount: number) => void;
  setBillDiscount: (amount: number, type: 'fixed' | 'percent') => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getBillDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getChangeAmount: () => number;
}

// Helper: sync active tab fields to top-level state
function syncActiveTab(tabs: OrderTab[], activeTabId: string) {
  const tab = tabs.find(t => t.id === activeTabId) || tabs[0];
  if (!tab) {
    const newTab = createNewTab();
    return {
      tabs: [newTab],
      activeTabId: newTab.id,
      items: [],
      customerId: null,
      customerName: '',
      note: '',
      paymentMethod: 'cash',
      amountPaid: 0,
      billDiscount: 0,
      billDiscountType: 'fixed' as const,
    };
  }
  return {
    tabs,
    activeTabId: tab.id,
    items: tab.items,
    customerId: tab.customerId,
    customerName: tab.customerName,
    note: tab.note,
    paymentMethod: tab.paymentMethod,
    amountPaid: tab.amountPaid,
    billDiscount: tab.billDiscount,
    billDiscountType: tab.billDiscountType,
  };
}

// Helper: update active tab in tabs array and sync
function updateActiveTab(
  tabs: OrderTab[],
  activeTabId: string,
  update: Partial<OrderTab>
) {
  const newTabs = tabs.map(t =>
    t.id === activeTabId ? { ...t, ...update } : t
  );
  return syncActiveTab(newTabs, activeTabId);
}

const initialTab = createNewTab();

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      items: [],
      customerId: null,
      customerName: '',
      note: '',
      paymentMethod: 'cash',
      amountPaid: 0,
      billDiscount: 0,
      billDiscountType: 'fixed' as const,

      // ===== Tab Management =====
      addTab: () => {
        const newTab = createNewTab();
        const newTabs = [...get().tabs, newTab];
        set(syncActiveTab(newTabs, newTab.id));
      },

      removeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        if (tabs.length <= 1) {
          // Can't remove last tab, just clear it
          const fresh = createNewTab();
          set(syncActiveTab([fresh], fresh.id));
          return;
        }
        const newTabs = tabs.filter(t => t.id !== tabId);
        const newActiveId = tabId === activeTabId
          ? newTabs[Math.max(0, tabs.findIndex(t => t.id === tabId) - 1)]?.id || newTabs[0].id
          : activeTabId;
        set(syncActiveTab(newTabs, newActiveId));
      },

      switchTab: (tabId) => {
        const { tabs } = get();
        set(syncActiveTab(tabs, tabId));
      },

      renameTab: (tabId, label) => {
        const newTabs = get().tabs.map(t =>
          t.id === tabId ? { ...t, label } : t
        );
        set({ tabs: newTabs });
      },

      // ===== Cart Actions (on active tab) =====
      addItem: (product) => {
        const { tabs, activeTabId } = get();
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab) return;
        const existing = tab.items.find(i => i.product.id === product.id);
        let newItems: CartItem[];
        if (existing) {
          if (existing.quantity >= product.stock) return;
          newItems = tab.items.map(i =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          newItems = [...tab.items, { product, quantity: 1, discount: 0 }];
        }
        set(updateActiveTab(tabs, activeTabId, { items: newItems }));
      },

      removeItem: (productId) => {
        const { tabs, activeTabId } = get();
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab) return;
        set(updateActiveTab(tabs, activeTabId, {
          items: tab.items.filter(i => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const { tabs, activeTabId } = get();
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab) return;
        set(updateActiveTab(tabs, activeTabId, {
          items: tab.items.map(i =>
            i.product.id === productId ? { ...i, quantity: Math.min(quantity, i.product.stock) } : i
          ),
        }));
      },

      updateDiscount: (productId, discount) => {
        const { tabs, activeTabId } = get();
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab) return;
        set(updateActiveTab(tabs, activeTabId, {
          items: tab.items.map(i =>
            i.product.id === productId ? { ...i, discount: Math.max(0, discount) } : i
          ),
        }));
      },

      setCustomer: (id, name = '') => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, { customerId: id, customerName: name }));
      },
      setNote: (note) => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, { note }));
      },
      setPaymentMethod: (method) => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, { paymentMethod: method }));
      },
      setAmountPaid: (amount) => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, { amountPaid: amount }));
      },
      setBillDiscount: (amount, type) => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, { billDiscount: amount, billDiscountType: type }));
      },

      clearCart: () => {
        const { tabs, activeTabId } = get();
        set(updateActiveTab(tabs, activeTabId, {
          items: [],
          customerId: null,
          customerName: '',
          note: '',
          paymentMethod: 'cash',
          amountPaid: 0,
          billDiscount: 0,
          billDiscountType: 'fixed',
        }));
      },

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      getTotalDiscount: () => get().items.reduce((sum, i) => sum + i.discount * i.quantity, 0),
      getBillDiscountAmount: () => {
        const { billDiscount, billDiscountType } = get();
        const afterItemDiscount = get().getSubtotal() - get().getTotalDiscount();
        if (billDiscountType === 'percent') return Math.round(afterItemDiscount * billDiscount / 100);
        return Math.min(billDiscount, afterItemDiscount);
      },
      getTotal: () => Math.max(0, get().getSubtotal() - get().getTotalDiscount() - get().getBillDiscountAmount()),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getChangeAmount: () => Math.max(0, get().amountPaid - get().getTotal()),
    }),
    {
      name: 'vinpos-cart',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      onRehydrate: (state) => {
        // After rehydrating from localStorage, sync computed fields
        return (rehydratedState) => {
          if (rehydratedState && rehydratedState.tabs?.length > 0) {
            // Restore tab counter
            const maxNum = rehydratedState.tabs.reduce((max: number, t: OrderTab) => {
              const match = t.label.match(/Đơn (\d+)/);
              return match ? Math.max(max, parseInt(match[1])) : max;
            }, 0);
            _tabCounter = maxNum + 1;

            const synced = syncActiveTab(rehydratedState.tabs, rehydratedState.activeTabId);
            Object.assign(rehydratedState, synced);
          }
        };
      },
    }
  )
);
