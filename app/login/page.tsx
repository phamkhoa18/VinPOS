'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Store, Loader2, Package, ShoppingCart, BarChart3, Printer,
  Sprout, TestTubes,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Đăng nhập thành công!');
      const { user } = useAuthStore.getState();
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      toast.error(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đã tạo dữ liệu mẫu!');
      } else {
        toast.error(data.error || 'Lỗi tạo dữ liệu');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setSeeding(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-300/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4 mb-10">
              <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={64} height={64} className="w-16 h-16 object-contain drop-shadow-lg" />
              <div>
                <h1 className="text-4xl font-bold text-white">VinPOS</h1>
                <p className="text-blue-200 text-sm">Quản lý bán hàng thông minh</p>
              </div>
            </div>

            <h2 className="text-3xl font-semibold text-white mb-4 leading-tight">
              Giải pháp quản lý <br />
              <span className="text-blue-200">cửa hàng toàn diện</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
              Quản lý sản phẩm, đơn hàng, khách hàng, kho hàng và in hóa đơn. 
              Tất cả trong một nền tảng duy nhất.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { icon: <Package className="w-5 h-5 text-blue-200" />, title: 'Quản lý sản phẩm', desc: 'CRUD đầy đủ' },
                { icon: <ShoppingCart className="w-5 h-5 text-blue-200" />, title: 'Bán hàng POS', desc: 'Nhanh & tiện lợi' },
                { icon: <BarChart3 className="w-5 h-5 text-blue-200" />, title: 'Báo cáo doanh thu', desc: 'Real-time' },
                { icon: <Printer className="w-5 h-5 text-blue-200" />, title: 'In hóa đơn', desc: 'Máy in bill' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-white/8 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                >
                  <span className="flex">{f.icon}</span>
                  <h3 className="text-white font-medium mt-2 text-sm">{f.title}</h3>
                  <p className="text-blue-200/70 text-xs">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">
              Vin<span className="text-green-600">POS</span>
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Chào mừng trở lại!</h2>
            <p className="text-gray-500 mt-2">Đăng nhập để quản lý cửa hàng của bạn</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200 transition-all duration-200 hover:shadow-xl hover:shadow-blue-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Seed & Demo */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 font-medium mb-3 flex items-center gap-1.5">
              <TestTubes className="w-3.5 h-3.5" /> Tài khoản demo
            </p>
            <div className="space-y-1 text-xs text-blue-600">
              <p><strong>Admin:</strong> admin@vinpos.com / 123456</p>
              <p><strong>Shop Owner:</strong> shop@vinpos.com / 123456</p>
              <p><strong>Nhân viên:</strong> nhanvien@vinpos.com / 123456</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="mt-3 w-full text-xs border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg gap-1.5"
            >
              {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sprout className="w-3.5 h-3.5" />}
              {seeding ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
