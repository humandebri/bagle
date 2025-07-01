'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function SignOutPage() {
  useEffect(() => {
    // 即座にサインアウトしてホームにリダイレクト
    signOut({ callbackUrl: '/' });
  }, []);

  // ローディング画面（一瞬しか表示されない）
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">ログアウトしています...</p>
      </div>
    </div>
  );
}