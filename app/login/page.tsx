'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Loader2, Package, ShoppingCart, BarChart3, Printer,
  RefreshCw, CheckCircle2,
} from 'lucide-react';
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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needVerification, setNeedVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Đăng nhập thành công!');
      const { user, setShopMode } = useAuthStore.getState();
      if (user?.role === 'admin') router.push('/admin');
      else if (user?.role === 'employee') { setShopMode('pos'); router.push('/pos'); }
      else router.push('/dashboard');
    } else if ((result as any).needVerification) {
      setNeedVerification(true);
      setVerifyEmail((result as any).email || email);
      toast.error('Email chưa được xác thực');
    } else {
      toast.error(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Đã gửi lại mã xác thực!');
      else toast.error(data.error || 'Không thể gửi email');
    } catch { toast.error('Lỗi kết nối server'); }
    setResending(false);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { toast.error('Vui lòng nhập đủ 6 số'); return; }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, email: verifyEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerified(true);
        toast.success('Xác thực thành công!');
      } else toast.error(data.error || 'Mã không hợp lệ');
    } catch { toast.error('Lỗi kết nối server'); }
    setVerifying(false);
  };

  // Verified success
  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-white">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Xác thực thành công!</h2>
            <p className="text-gray-500 mb-6">Hãy đăng nhập lại để sử dụng.</p>
            <Button
              onClick={() => { setVerified(false); setNeedVerification(false); setOtpCode(''); }}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-200"
            >
              Đăng nhập
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // OTP verification screen
  if (needVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-white">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Xác thực email</h2>
            <p className="text-gray-500 text-sm mb-6">
              Nhập mã 6 số đã gửi đến <strong className="text-blue-600">{verifyEmail}</strong>
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

            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleResendVerification} disabled={resending} className="text-xs text-gray-500 gap-1.5">
                {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {resending ? 'Đang gửi...' : 'Gửi lại mã'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNeedVerification(false)} className="text-xs text-gray-500">
                Quay lại
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex items-center gap-4 mb-10">
              <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={64} height={64} className="w-16 h-16 object-contain drop-shadow-lg" />
              <div>
                <h1 className="text-4xl font-bold text-white">VinPOS</h1>
                <p className="text-blue-200 text-sm">Quản lý bán hàng thông minh</p>
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4 leading-tight">
              Giải pháp quản lý<br /><span className="text-blue-200">cửa hàng toàn diện</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
              Quản lý sản phẩm, đơn hàng, khách hàng, kho hàng và in hóa đơn. Tất cả trong một nền tảng duy nhất.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { icon: <Package className="w-5 h-5 text-blue-200" />, title: 'Quản lý sản phẩm', desc: 'CRUD đầy đủ' },
                { icon: <ShoppingCart className="w-5 h-5 text-blue-200" />, title: 'Bán hàng POS', desc: 'Nhanh & tiện lợi' },
                { icon: <BarChart3 className="w-5 h-5 text-blue-200" />, title: 'Báo cáo doanh thu', desc: 'Real-time' },
                { icon: <Printer className="w-5 h-5 text-blue-200" />, title: 'In hóa đơn', desc: 'Máy in bill' },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
            <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={120} height={32} className="h-8 w-auto object-contain" />
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
                <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-medium">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-200 transition-all duration-200 hover:shadow-xl hover:shadow-blue-200">
              {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...</span> : 'Đăng nhập'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">Đăng ký ngay</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
