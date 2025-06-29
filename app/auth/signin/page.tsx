'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  useEffect(() => {
    // エラーがない場合のみ自動リダイレクト
    if (!error) {
      signIn('google', { callbackUrl });
    }
  }, [callbackUrl, error]);

  // エラーがある場合のみ表示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">ログインに失敗しました</p>
          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            もう一度試す
          </button>
        </div>
      </div>
    );
  }

  // ローディング画面（自動リダイレクト時）
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Googleにリダイレクトしています...</p>
      </div>
    </div>
  );
}