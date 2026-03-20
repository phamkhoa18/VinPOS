'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// No longer needed - verification is done inline via OTP
export default function VerifyEmailPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}
