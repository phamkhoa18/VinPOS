'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// No longer needed - reset password is done via OTP in forgot-password page
export default function ResetPasswordPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/forgot-password'); }, [router]);
  return null;
}
