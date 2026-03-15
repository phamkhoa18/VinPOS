'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then(() => {
      const { isAuthenticated: auth, user: u } = useAuthStore.getState();
      if (!auth) {
        router.replace('/login');
      } else if (u?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    });
  }, []);

  // Show while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <Image src="/logo/VinPOS_logo.png" alt="VinPOS" width={48} height={48} className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-bold text-gray-900">
            Vin<span className="text-green-600">POS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      </div>
    </div>
  );
}
