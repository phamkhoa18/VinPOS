'use client';

import { Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminShopsPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-gray-900">Quản lý cửa hàng</h1><p className="text-sm text-gray-500">Quản lý tất cả cửa hàng trong hệ thống</p></div>
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Quản lý cửa hàng</h3>
          <p className="text-sm text-gray-500">Tính năng quản lý đa cửa hàng sẽ được phát triển trong phiên bản tiếp theo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
