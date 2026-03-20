'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
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
          className="w-11 h-13 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
        />
      ))}
    </div>
  );
}

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Vui lòng nhập email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('otp');
        toast.success('Đã gửi mã xác thực!');
      } else toast.error(data.error || 'Không thể gửi email');
    } catch { toast.error('Lỗi kết nối server'); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { toast.error('Vui lòng nhập đủ 6 số'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('password');
      } else {
        toast.error(data.error || 'Mã xác thực không đúng');
        setOtpCode('');
      }
    } catch { toast.error('Lỗi kết nối server'); }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) { toast.error('Vui lòng nhập đầy đủ'); return; }
    if (password.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (password !== confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('done');
        toast.success('Đặt lại mật khẩu thành công!');
      } else {
        toast.error(data.error || 'Không thể đặt lại mật khẩu');
        if (data.error?.includes('hết hạn')) setStep('otp');
      }
    } catch { toast.error('Lỗi kết nối server'); }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setOtpCode(''); toast.success('Đã gửi lại mã!'); }
      else toast.error(data.error);
    } catch { toast.error('Lỗi kết nối server'); }
    setResending(false);
  };

  const stepIndex = ['email', 'otp', 'password', 'done'].indexOf(step);
  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['email', 'otp', 'password'].map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            step === s ? 'bg-blue-600 text-white' :
            stepIndex > i ? 'bg-green-500 text-white' :
            'bg-gray-200 text-gray-400'
          }`}>
            {stepIndex > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < 2 && <div className={`w-8 h-0.5 ${stepIndex > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
            <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={120} height={32} className="h-8 w-auto object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
          {step !== 'done' && stepIndicator}

          {/* Bước 1: Nhập Email */}
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Quên mật khẩu?</h2>
                <p className="text-gray-500 text-sm mt-2">Nhập email đăng ký để nhận mã xác thực</p>
              </div>
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white border-gray-200 rounded-lg" />
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-200">
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</span> : 'Gửi mã xác thực'}
                </Button>
              </form>
              <Link href="/login" className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quay về đăng nhập
              </Link>
            </motion.div>
          )}

          {/* Bước 2: Nhập OTP */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Nhập mã xác thực</h2>
              <p className="text-gray-500 text-sm mb-6">
                Mã 6 số đã gửi đến <strong className="text-blue-600">{email}</strong>
              </p>
              <div className="mb-6">
                <OTPInput value={otpCode} onChange={setOtpCode} />
              </div>
              <Button onClick={handleVerifyOTP} disabled={loading || otpCode.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold shadow-lg shadow-orange-200 mb-4">
                {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực...</span> : 'Tiếp tục'}
              </Button>
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleResendCode} disabled={resending} className="text-xs text-gray-500 gap-1.5">
                  {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {resending ? 'Đang gửi...' : 'Gửi lại mã'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep('email')} className="text-xs text-gray-500">Đổi email</Button>
              </div>
            </motion.div>
          )}

          {/* Bước 3: Mật khẩu mới */}
          {step === 'password' && (
            <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Đặt mật khẩu mới</h2>
                <p className="text-gray-500 text-sm mt-2">Nhập mật khẩu mới cho tài khoản của bạn</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-white border-gray-200 rounded-lg" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-12 bg-white border-gray-200 rounded-lg" />
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-200">
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</span> : 'Đặt lại mật khẩu'}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Hoàn thành */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thành công!</h2>
              <p className="text-gray-500 text-sm mb-6">Mật khẩu đã được đặt lại. Hãy đăng nhập với mật khẩu mới.</p>
              <Link href="/login">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-200">
                  Đăng nhập ngay
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
