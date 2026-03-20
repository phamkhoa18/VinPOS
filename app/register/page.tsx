'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Store, MapPin, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const arr = value.split('');
    arr[index] = char;
    const newVal = arr.join('').slice(0, 6);
    onChange(newVal);
    if (char && index < 5) inputs.current[index + 1]?.focus();
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) inputs.current[index - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verified, setVerified] = useState(false);
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
      setRegistered(true);
      toast.success('Đăng ký thành công! Kiểm tra email để lấy mã xác thực.');
    } else {
      toast.error(result.error || 'Đăng ký thất bại');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, email: form.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerified(true);
        toast.success('Xác thực thành công!');
      } else {
        toast.error(data.error || 'Mã không hợp lệ');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setVerifying(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message);
      else toast.error(data.error);
    } catch {
      toast.error('Lỗi kết nối server');
    }
    setResending(false);
  };

  // Verified success
  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Xác thực thành công!</h2>
            <p className="text-gray-500 mb-6">Tài khoản của bạn đã sẵn sàng sử dụng.</p>
            <Link href="/login">
              <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-200">
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // OTP input after registration
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nhập mã xác thực</h2>
            <p className="text-gray-500 text-sm mb-6">
              Chúng tôi đã gửi mã 6 số đến <strong className="text-blue-600">{form.email}</strong>
            </p>

            <div className="mb-6">
              <OTPInput value={otpCode} onChange={setOtpCode} />
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={verifying || otpCode.length !== 6}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-200 mb-4"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {verifying ? 'Đang xác thực...' : 'Xác thực'}
            </Button>

            <p className="text-xs text-gray-400 mb-3">Mã có hiệu lực trong 15 phút</p>

            <Button variant="ghost" size="sm" onClick={handleResend} disabled={resending} className="text-xs text-gray-500 gap-1.5">
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {resending ? 'Đang gửi...' : 'Gửi lại mã'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
            <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={120} height={32} className="h-8 w-auto object-contain" />
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
            <p className="text-[11px] text-gray-400">Mã xác thực sẽ được gửi đến email này</p>
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
          <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}
