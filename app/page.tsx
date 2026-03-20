'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart, Package, BarChart3, Users, Warehouse, Printer,
  CreditCard, QrCode, Smartphone, ArrowRight, CheckCircle2,
  Zap, Shield, Clock, ChevronRight, Star, Globe, Mail, Phone,
  Play, Sparkles, TrendingUp, Receipt, Layers,
  Monitor, TabletSmartphone, MousePointerClick, KeyRound,
} from 'lucide-react';

// Animated counter hook
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { count, ref };
}

// Fade in animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']);
  const headerBorder = useTransform(scrollYProgress, [0, 0.05], ['rgba(0,0,0,0)', 'rgba(226,232,240,1)']);
  const [mobileNav, setMobileNav] = useState(false);

  const features = [
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: 'Bán hàng POS',
      desc: 'Giao diện bán hàng nhanh, hỗ trợ barcode, phím tắt, đa phương thức thanh toán',
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: 'Quản lý sản phẩm',
      desc: 'CRUD đầy đủ, phân loại danh mục, quản lý SKU, barcode, ảnh sản phẩm',
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: <Warehouse className="w-6 h-6" />,
      title: 'Quản lý kho hàng',
      desc: 'Theo dõi tồn kho real-time, nhập/xuất kho, cảnh báo hết hàng tự động',
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Quản lý khách hàng',
      desc: 'Lưu trữ thông tin, tích điểm, lịch sử mua hàng, chăm sóc khách hàng',
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Báo cáo doanh thu',
      desc: 'Biểu đồ trực quan, thống kê theo ngày/tuần/tháng, top sản phẩm bán chạy',
      color: 'from-rose-500 to-rose-600',
      bg: 'bg-rose-50',
    },
    {
      icon: <Printer className="w-6 h-6" />,
      title: 'In hóa đơn',
      desc: 'Tùy chỉnh mẫu phiếu in, hỗ trợ máy in bill 58mm/80mm, in tự động',
      color: 'from-cyan-500 to-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      icon: <KeyRound className="w-6 h-6" />,
      title: 'Phân quyền nhân viên',
      desc: 'Tạo tài khoản nhân viên, chỉ truy cập POS, quản lý ca làm việc',
      color: 'from-indigo-500 to-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      icon: <Receipt className="w-6 h-6" />,
      title: 'Quản lý đơn hàng',
      desc: 'Theo dõi trạng thái đơn, lọc ngày, xuất báo cáo Excel, hoàn trả hàng',
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  const paymentMethods = [
    { icon: <CreditCard className="w-8 h-8" />, label: 'Tiền mặt', desc: 'Tính tiền thừa tự động' },
    { icon: <QrCode className="w-8 h-8" />, label: 'Chuyển khoản', desc: 'QR Code ngân hàng' },
    { icon: <Smartphone className="w-8 h-8" />, label: 'Ví điện tử', desc: 'MoMo, ZaloPay' },
    { icon: <CreditCard className="w-8 h-8" />, label: 'Quẹt thẻ', desc: 'Visa, Mastercard' },
  ];

  const stats = [
    { label: 'Dự án triển khai', value: 200, suffix: '+' },
    { label: 'Khách hàng tin dùng', value: 150, suffix: '+' },
    { label: 'Chuyên gia công nghệ', value: 50, suffix: '+' },
    { label: 'Năm hoạt động', value: 6, suffix: '' },
  ];

  const testimonials = [
    {
      name: 'Nguyễn Minh Tuấn',
      role: 'Chủ cửa hàng điện thoại',
      content: 'VinPOS giúp cửa hàng tôi quản lý dễ dàng hơn rất nhiều. Giao diện đẹp, tốc độ nhanh, nhân viên sử dụng được ngay không cần đào tạo.',
      rating: 5,
    },
    {
      name: 'Trần Thị Mai Lan',
      role: 'Quản lý chuỗi mỹ phẩm',
      content: 'Tính năng phân quyền nhân viên rất tiện, tôi có thể quản lý nhiều chi nhánh mà không lo nhân viên thao tác sai.',
      rating: 5,
    },
    {
      name: 'Lê Hoàng Nam',
      role: 'Chủ shop thời trang',
      content: 'Báo cáo doanh thu real-time giúp tôi nắm bắt kinh doanh mọi lúc mọi nơi. Đội ngũ hỗ trợ cực kỳ nhiệt tình.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ============ HEADER ============ */}
      <motion.header
        style={{ backgroundColor: headerBg, borderBottomColor: headerBorder, borderBottomWidth: '1px' }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-1">
              <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={40} height={40} className="w-10 h-10 object-contain" />
              <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={100} height={28} className="h-8 w-auto object-contain" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {['Tính năng', 'Thanh toán', 'Đánh giá', 'Về chúng tôi'].map((item, i) => (
                <a
                  key={i}
                  href={`#${['features', 'payment', 'testimonials', 'about'][i]}`}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 transition-all"
              >
                Dùng thử miễn phí
              </Link>
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
              <div className="w-5 space-y-1.5">
                <span className={`block h-0.5 bg-current transition-all ${mobileNav ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileNav ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileNav ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>

          {/* Mobile nav */}
          {mobileNav && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="lg:hidden pb-4 border-t border-gray-100"
            >
              <div className="pt-3 space-y-1">
                {['Tính năng', 'Thanh toán', 'Đánh giá', 'Về chúng tôi'].map((item, i) => (
                  <a
                    key={i}
                    href={`#${['features', 'payment', 'testimonials', 'about'][i]}`}
                    onClick={() => setMobileNav(false)}
                    className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {item}
                  </a>
                ))}
                <div className="pt-3 flex gap-2">
                  <Link href="/login" className="flex-1 text-center text-sm font-medium text-gray-700 py-2.5 rounded-lg border border-gray-200">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 py-2.5 rounded-lg">
                    Dùng thử
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-24 lg:pt-32 pb-20 lg:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-100/60 via-blue-50/30 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-100/40 via-violet-50/20 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Giải pháp POS #1 Việt Nam</span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                Quản lý bán hàng{' '}
                <span className="relative">
                  <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    thông minh
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C50 2 150 2 198 6" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" />
                    <defs><linearGradient id="grad" x1="0" y1="0" x2="200" y2="0"><stop stopColor="#2563EB" /><stop offset="1" stopColor="#6366F1" /></linearGradient></defs>
                  </svg>
                </span>
                <br />cùng VinPOS
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-gray-500 leading-relaxed max-w-lg">
                Nền tảng quản lý bán hàng POS hiện đại, tích hợp đầy đủ: sản phẩm, đơn hàng,
                khách hàng, kho hàng, báo cáo và in hóa đơn — tất cả trong một.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  Bắt đầu miễn phí
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Play className="w-4 h-4 text-blue-600" />
                  Xem demo
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                {[
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: 'Miễn phí cài đặt' },
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: 'Không cần thẻ' },
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: 'Hỗ trợ 24/7' },
                ].map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">{item.icon} {item.text}</span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Hero visual */}
            <motion.div
              initial={{ opacity: 0, x: 60, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-1 shadow-2xl shadow-blue-300/30">
                <div className="bg-white rounded-[20px] overflow-hidden">
                  {/* Mock POS header */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/logo/VinPOS_logo.png" alt="" width={24} height={24} className="w-6 h-6" />
                      <span className="text-sm font-bold text-gray-900">VinPOS</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">POS</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-gray-500">Online</span>
                    </div>
                  </div>
                  {/* Mock POS interface */}
                  <div className="flex h-[340px]">
                    {/* Products grid */}
                    <div className="flex-1 p-3 bg-gray-50/50">
                      <div className="flex gap-1.5 mb-3">
                        {['Tất cả', 'Điện thoại', 'Laptop', 'Phụ kiện'].map((c, i) => (
                          <span key={i} className={`text-[9px] px-2 py-1 rounded-md font-medium ${i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{c}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: 'iPhone 15 Pro', price: '34.990.000đ', icon: '📱' },
                          { name: 'MacBook Air', price: '27.990.000đ', icon: '💻' },
                          { name: 'AirPods Pro', price: '6.790.000đ', icon: '🎧' },
                          { name: 'iPad Pro M4', price: '28.990.000đ', icon: '📱' },
                          { name: 'Apple Watch', price: '11.990.000đ', icon: '⌚' },
                          { name: 'Cáp sạc', price: '250.000đ', icon: '🔌' },
                        ].map((p, i) => (
                          <div key={i} className={`bg-white rounded-lg p-2 border text-center transition-all ${i === 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'}`}>
                            <div className="text-xl mb-1">{p.icon}</div>
                            <p className="text-[8px] font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-[9px] font-bold text-blue-600">{p.price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Cart sidebar */}
                    <div className="w-[140px] border-l border-gray-200 bg-white flex flex-col">
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-[9px] font-bold text-gray-900">🛒 Giỏ hàng (2)</p>
                      </div>
                      <div className="flex-1 p-2 space-y-1.5 text-[8px]">
                        <div className="bg-gray-50 rounded p-1.5">
                          <p className="font-medium text-gray-900 truncate">iPhone 15 Pro</p>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400">1x</span>
                            <span className="font-bold text-blue-600">34.990.000đ</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-1.5">
                          <p className="font-medium text-gray-900 truncate">AirPods Pro 2</p>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400">1x</span>
                            <span className="font-bold text-blue-600">6.790.000đ</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <div className="flex justify-between text-[8px] mb-1">
                          <span className="text-gray-500">Tổng cộng</span>
                          <span className="font-extrabold text-blue-700 text-[10px]">41.780.000đ</span>
                        </div>
                        <button className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[8px] font-bold rounded-md">
                          Thanh toán (F2)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -left-6 top-20 bg-white rounded-xl shadow-xl shadow-gray-200/60 p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Doanh thu hôm nay</p>
                    <p className="text-sm font-bold text-gray-900">+142.5M</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="absolute -right-4 bottom-16 bg-white rounded-xl shadow-xl shadow-gray-200/60 p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Đơn hoàn thành</p>
                    <p className="text-sm font-bold text-emerald-600">+48 đơn</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="py-12 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const { count, ref } = useCounter(stat.value);
              return (
                <div key={i} ref={ref} className="text-center">
                  <p className="text-3xl lg:text-4xl font-extrabold text-white">
                    {count}{stat.suffix}
                  </p>
                  <p className="mt-1 text-sm text-blue-200">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-4">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">Tính năng nổi bật</span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl lg:text-4xl font-extrabold text-gray-900">
              Tất cả những gì bạn cần{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                trong một nền tảng
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-gray-500 leading-relaxed">
              VinPOS cung cấp bộ công cụ quản lý bán hàng toàn diện, giúp bạn tập trung vào
              việc phát triển kinh doanh thay vì lo lắng về công nghệ.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ PAYMENT METHODS ============ */}
      <section id="payment" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Thanh toán đa dạng</span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                Hỗ trợ{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  mọi hình thức
                </span>{' '}
                thanh toán
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="mt-4 text-gray-500 leading-relaxed max-w-lg">
                Từ tiền mặt, chuyển khoản QR Code, quẹt thẻ đến ví điện tử —
                VinPOS giúp bạn không bỏ lỡ bất kỳ giao dịch nào.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 grid grid-cols-2 gap-4">
                {paymentMethods.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                      {m.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{m.label}</p>
                      <p className="text-xs text-gray-500">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Payment visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-3xl p-8 lg:p-12 border border-gray-100">
                {/* Payment dialog mockup */}
                <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden max-w-sm mx-auto">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Thanh toán đơn hàng</h3>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Tạm tính (3 sp)</span>
                        <span>42.230.000đ</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-600 mb-2">
                        <span>Giảm giá</span>
                        <span>-450.000đ</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200/50">
                        <span className="font-bold text-blue-800">Tổng thanh toán</span>
                        <span className="text-xl font-extrabold text-blue-700">41.780.000đ</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Phương thức thanh toán</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { icon: '💵', label: 'Tiền mặt', active: true },
                        { icon: '📱', label: 'Chuyển khoản', active: false },
                        { icon: '💳', label: 'Thẻ', active: false },
                      ].map((m, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border text-center text-xs font-medium ${m.active ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                          <span className="text-base block mb-0.5">{m.icon}</span>
                          {m.label}
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn tất đơn hàng
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ MULTI-PLATFORM ============ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl lg:text-4xl font-extrabold text-gray-900">
              Hoạt động trên <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">mọi thiết bị</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-gray-500 leading-relaxed">
              VinPOS được thiết kế responsive, hoạt động mượt mà trên máy tính, tablet và điện thoại.
              Quản lý cửa hàng mọi lúc, mọi nơi.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-6"
          >
            {[
              { icon: <Monitor className="w-8 h-8" />, title: 'Máy tính', desc: 'Giao diện đầy đủ, sidebar quản lý và POS toàn màn hình', color: 'from-blue-500 to-blue-600' },
              { icon: <TabletSmartphone className="w-8 h-8" />, title: 'Tablet', desc: 'Bố cục tối ưu cho màn hình cảm ứng, thao tác nhanh', color: 'from-violet-500 to-purple-600' },
              { icon: <Smartphone className="w-8 h-8" />, title: 'Điện thoại', desc: 'Kiểm tra doanh thu, đơn hàng ngay trên điện thoại', color: 'from-rose-500 to-pink-600' },
            ].map((d, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="relative group bg-white rounded-2xl p-8 text-center border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${d.color} flex items-center justify-center text-white shadow-lg mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                  {d.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{d.title}</h3>
                <p className="text-sm text-gray-500">{d.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section id="testimonials" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 mb-4">
              <Star className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Đánh giá từ khách hàng</span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl lg:text-4xl font-extrabold text-gray-900">
              Được tin dùng bởi{' '}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                hàng trăm cửa hàng
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-10 lg:p-16 overflow-hidden">
            {/* Decorative */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />
            </div>

            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                Sẵn sàng nâng cấp cửa hàng <br />của bạn?
              </h2>
              <p className="mt-4 text-blue-100 text-lg leading-relaxed">
                Bắt đầu sử dụng VinPOS ngay hôm nay — hoàn toàn miễn phí.
                Không cần thẻ tín dụng, không cam kết.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-bold rounded-xl shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:shadow-blue-900/40 hover:bg-blue-50 transition-all text-base"
                >
                  Đăng ký miễn phí
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="https://vincode.xyz/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-base"
                >
                  <Phone className="w-4 h-4" />
                  Liên hệ tư vấn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ABOUT / VINCODE ============ */}
      <section id="about" className="py-20 lg:py-28 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">Powered by VinCode</span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                Phát triển bởi{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  VinCode
                </span>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="mt-4 text-gray-500 leading-relaxed max-w-lg">
                VinCode là công ty công nghệ chuyên cung cấp giải pháp số toàn diện — từ gia công phần mềm,
                lập trình website, phát triển ứng dụng mobile, chatbot AI thông minh đến digital marketing.
                Với đội ngũ 50+ chuyên gia và hơn 200+ dự án thành công, VinCode tự hào là đối tác công nghệ
                tin cậy tại Việt Nam và Úc.
              </motion.p>
              <motion.p variants={fadeUp} custom={3} className="mt-3 text-gray-500 leading-relaxed max-w-lg">
                VinPOS là một trong những sản phẩm flagship của VinCode, mang đến giải pháp quản lý bán hàng
                hiện đại và tối ưu chi phí cho các cửa hàng tại Việt Nam.
              </motion.p>
              <motion.div variants={fadeUp} custom={4} className="mt-6 flex flex-wrap gap-4">
                <a
                  href="https://vincode.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm shadow-lg shadow-indigo-200"
                >
                  <Globe className="w-4 h-4" />
                  Tham quan VinCode
                  <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="https://vincode.xyz/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Liên hệ
                </a>
              </motion.div>
            </motion.div>

            {/* VinCode Services */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: <Layers className="w-5 h-5" />, label: 'Gia Công Phần Mềm', color: 'from-blue-500 to-blue-600' },
                { icon: <Globe className="w-5 h-5" />, label: 'Lập Trình Website', color: 'from-emerald-500 to-emerald-600' },
                { icon: <Smartphone className="w-5 h-5" />, label: 'App Mobile', color: 'from-violet-500 to-purple-600' },
                { icon: <Sparkles className="w-5 h-5" />, label: 'Chatbot AI', color: 'from-amber-500 to-orange-600' },
                { icon: <TrendingUp className="w-5 h-5" />, label: 'Digital Marketing', color: 'from-rose-500 to-pink-600' },
                { icon: <MousePointerClick className="w-5 h-5" />, label: 'Thiết Kế & Branding', color: 'from-cyan-500 to-teal-600' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  className="bg-white rounded-xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                    {s.icon}
                  </div>
                  <p className="text-sm font-bold text-gray-900">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={36} height={36} className="w-9 h-9 object-contain" />
                <Image src="/logo/VinPOS_text.png" alt="VinPOS" width={90} height={24} className="h-6 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Giải pháp quản lý bán hàng POS hiện đại. Sản phẩm của VinCode — Kiến tạo giải pháp công nghệ đột phá.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-4">Sản phẩm</h4>
              <ul className="space-y-2.5">
                {['Bán hàng POS', 'Quản lý sản phẩm', 'Quản lý kho', 'Báo cáo doanh thu', 'In hóa đơn'].map((l, i) => (
                  <li key={i}><span className="text-sm text-gray-500 hover:text-blue-400 cursor-pointer transition-colors">{l}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-4">Công ty</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Về VinCode', href: 'https://vincode.xyz/about' },
                  { label: 'Dự án', href: 'https://vincode.xyz/projects' },
                  { label: 'Blog & Kiến thức', href: 'https://vincode.xyz/' },
                  { label: 'Tuyển dụng', href: 'https://vincode.xyz/' },
                  { label: 'Liên hệ', href: 'https://vincode.xyz/contact' },
                ].map((l, i) => (
                  <li key={i}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-4">Liên hệ</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <a href="tel:0925464646" className="hover:text-blue-400 transition-colors">VN: 0925 46 46 46</a>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <a href="tel:0475383333" className="hover:text-blue-400 transition-colors">AU: 0475 383 333</a>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <a href="mailto:admin@vincode.xyz" className="hover:text-blue-400 transition-colors">admin@vincode.xyz</a>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <a href="https://vincode.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">vincode.xyz</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2020–2026 <a href="https://vincode.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">VinCode</a>. All rights reserved. Kiến tạo giải pháp công nghệ đột phá.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <a href="https://vincode.xyz/" className="hover:text-gray-400 transition-colors">Chính sách bảo mật</a>
              <a href="https://vincode.xyz/" className="hover:text-gray-400 transition-colors">Điều khoản sử dụng</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
