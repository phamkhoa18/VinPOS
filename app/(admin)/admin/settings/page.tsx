'use client';

import { Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-gray-900">Cài đặt hệ thống</h1><p className="text-sm text-gray-500">Cấu hình toàn bộ hệ thống VinPOS</p></div>
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-8 text-center">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cài đặt hệ thống</h3>
          <p className="text-sm text-gray-500">Quản lý cấu hình chung, thông báo hệ thống, và các tùy chỉnh nâng cao.</p>
        </CardContent>
      </Card>
    </div>
  );
}
