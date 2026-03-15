'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Store, ShieldCheck, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ users: number; shops: number }>({ users: 0, shops: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/users?limit=1').then((r) => r.json()),
    ]).then(([uData]) => {
      setStats({ users: uData.total || 0, shops: 0 });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const cards = [
    { title: 'Tổng người dùng', value: stats.users, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700' },
    { title: 'Cửa hàng hoạt động', value: '—', icon: <Store className="w-5 h-5" />, color: 'bg-green-50 text-green-700' },
    { title: 'Quản trị viên', value: '1', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-gray-900">Quản trị hệ thống</h1><p className="text-sm text-gray-500">Tổng quan toàn hệ thống VinPOS</p></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center`}>{c.icon}</div>
                <div><p className="text-sm text-gray-500">{c.title}</p><p className="text-2xl font-bold text-gray-900">{c.value}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Admin Dashboard</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Quản lý toàn bộ hệ thống: người dùng, cửa hàng, phân quyền. 
            Sử dụng menu bên trái để điều hướng.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
