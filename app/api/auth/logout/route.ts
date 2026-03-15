import { successResponse } from '@/lib/auth';

export async function POST() {
  const response = successResponse({ message: 'Đăng xuất thành công' });
  response.headers.set(
    'Set-Cookie',
    'vinpos-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  return response;
}
