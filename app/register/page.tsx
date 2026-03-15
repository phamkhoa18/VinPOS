'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Store, MapPin, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    shopName: '', shopAddress: '', shopPhone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.phone) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    const result = await register(form);
    setLoading(false);

    if (result.success) {
      toast.success('Đăng ký thành công!');
      router.push('/dashboard');
    } else {
      toast.error(result.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">
              Vin<span className="text-green-600">POS</span>
            </h1>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Tạo tài khoản mới</h2>
          <p className="text-gray-500 mt-1">Bắt đầu quản lý cửa hàng của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg shadow-gray-100/50 border border-gray-100 p-8 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Thông tin cá nhân</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-sm">Họ tên *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input name="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Văn A" className="pl-10 h-11 rounded-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-sm">SĐT *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input name="phone" value={form.phone} onChange={handleChange} placeholder="0912345678" className="pl-10 h-11 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600 text-sm">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className="pl-10 h-11 rounded-lg" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600 text-sm">Mật khẩu *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Tối thiểu 6 ký tự" className="pl-10 h-11 rounded-lg" />
            </div>
          </div>

          <div className="border-t pt-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Thông tin cửa hàng</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm">Tên cửa hàng</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input name="shopName" value={form.shopName} onChange={handleChange} placeholder="Cửa hàng ABC" className="pl-10 h-11 rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm">Địa chỉ</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input name="shopAddress" value={form.shopAddress} onChange={handleChange} placeholder="123 Nguyễn Huệ, Q1, HCM" className="pl-10 h-11 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Đăng nhập
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
