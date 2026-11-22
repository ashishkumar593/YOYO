'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AdminRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      router.replace('/dashboard/admin');
    } else {
      router.replace('/admin/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground font-mono text-xs">
      Verifying Platform Operator Clearance...
    </div>
  );
}
