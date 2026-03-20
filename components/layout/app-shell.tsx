'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, BarChart3,
  Warehouse, Settings, LogOut, ChevronLeft, ChevronRight, Store,
  Menu, X, Monitor, UserCog, ShieldCheck, Building2, CreditCard,
} from 'lucide-react';
import { useAuthStore, type ShopMode } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationBell from '@/components/notification-bell';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const getShopNavItems = (mode: ShopMode): NavItem[] => {
  if (mode === 'pos') {
    return [
      { icon: <CreditCard className="w-5 h-5" />, label: 'Bán hàng', href: '/pos' },
    ];
  }
  return [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Tổng quan', href: '/dashboard' },
    { icon: <Package className="w-5 h-5" />, label: 'Sản phẩm', href: '/products' },
    { icon: <FolderTree className="w-5 h-5" />, label: 'Danh mục', href: '/categories' },
    { icon: <ShoppingCart className="w-5 h-5" />, label: 'Đơn hàng', href: '/orders' },
    { icon: <Users className="w-5 h-5" />, label: 'Khách hàng', href: '/customers' },
    { icon: <Warehouse className="w-5 h-5" />, label: 'Kho hàng', href: '/inventory' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Báo cáo', href: '/reports' },
    { icon: <Settings className="w-5 h-5" />, label: 'Cài đặt', href: '/settings' },
  ];
};

const adminNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Tổng quan', href: '/admin' },
  { icon: <UserCog className="w-5 h-5" />, label: 'Người dùng', href: '/admin/users' },
  { icon: <Building2 className="w-5 h-5" />, label: 'Cửa hàng', href: '/admin/shops' },
  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Cài đặt', href: '/admin/settings' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, shopMode, setShopMode, logout, checkAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Only redirect to login AFTER loading is done AND auth failed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  // Force employees to POS mode always
  const isEmployee = user?.role === 'employee';
  useEffect(() => {
    if (isEmployee && isAuthenticated) {
      if (shopMode !== 'pos') {
        setShopMode('pos');
      }
      // Redirect employee away from management pages
      if (pathname !== '/pos') {
        router.replace('/pos');
      }
    }
  }, [isEmployee, isAuthenticated, pathname, shopMode]);

  // Show loading spinner while checking auth
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isPOS = (shopMode === 'pos' && !isAdmin) || isEmployee;
  const navItems = isAdmin ? adminNavItems : getShopNavItems(shopMode);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const toggleMode = () => {
    const newMode = shopMode === 'management' ? 'pos' : 'management';
    setShopMode(newMode);
    router.push(newMode === 'pos' ? '/pos' : '/dashboard');
  };

  // Full-screen POS mode
  if (isPOS) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={32} height={32} className="w-8 h-8 object-contain" />
            <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={80} height={24} className="h-5 w-auto object-contain" />
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">
              Chế độ bán hàng
            </span>
            {isEmployee && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium">
                Nhân viên
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Only show management toggle for shop owners, not employees */}
            {!isEmployee && (
              <Button variant="outline" size="sm" onClick={toggleMode} className="text-xs gap-1.5 border-gray-200 rounded-lg">
                <Monitor className="w-3.5 h-3.5" /> Chế độ quản lý
              </Button>
            )}
            <NotificationBell />
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700 hidden sm:inline">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-white border-r border-gray-200/80 shadow-sm
          flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={36} height={36} className="w-9 h-9 object-contain flex-shrink-0" />
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap"
              >
                <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={100} height={28} className="h-6 w-auto object-contain" />
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        {!isAdmin && !collapsed && (
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
              <button
                onClick={() => { setShopMode('management'); router.push('/dashboard'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-all ${shopMode === 'management' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Quản lý
              </button>
              <button
                onClick={() => { setShopMode('pos'); router.push('/pos'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-all ${shopMode === 'pos' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Bán hàng
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setMobileOpen(false); }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 ${collapsed ? 'p-3' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                >
                  <span className={isActive ? 'text-blue-600' : ''}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-100 p-3">
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="w-full flex items-center justify-center p-3 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-50">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen flex flex-col min-w-0 overflow-x-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {navItems.find((i) => pathname === i.href || (i.href !== '/dashboard' && i.href !== '/admin' && pathname.startsWith(i.href)))?.label || 'Tổng quan'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <Button variant="outline" size="sm" onClick={toggleMode} className="text-xs gap-1.5 border-gray-200 hidden sm:flex rounded-lg">
                {shopMode === 'management' ? (
                  <><CreditCard className="w-3.5 h-3.5" /> Mở bán hàng</>
                ) : (
                  <><Monitor className="w-3.5 h-3.5" /> Quản lý</>
                )}
              </Button>
            )}
            <NotificationBell />
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 hidden md:inline">{user.name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
