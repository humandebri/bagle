'use client';

import { useAuthSession } from '@/lib/auth-compat';
import { clientSignIn, clientSignOut } from '@/lib/next-auth-client';
import { FcGoogle } from 'react-icons/fc'; 
import { PowerIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function Account() {
  const router = useRouter();
  const { data: session, status } = useAuthSession();

  if (status === 'loading') {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto p-8">
        <h1 className="text-2xl text-gray-400 mb-6">マイページ</h1>
        <p className="mb-4">ログインして注文履歴を確認したり、アカウント情報を管理しましょう。</p>
        <button 
          onClick={() => clientSignIn()}
          className="w-full py-3 bg-white border border-gray-300 shadow-sm text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
        >
          <FcGoogle className="w-5 h-5" />
          Googleでログイン
        </button>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl text-gray-400">マイページ</h1>
  
        <button
          className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-sky-100 hover:text-[#887c5d]"
          onClick={() => clientSignOut()}
        >
          <PowerIcon className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full text-left p-6 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 cursor-pointer flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl mb-1 text-blue-700">管理者ページへ</h2>
              <p className="text-sm text-blue-600">商品や注文の管理を行います。</p>
            </div>
            <ArrowRightIcon className="w-6 h-6 text-blue-700" />
          </button>
        )}

        <button
          onClick={() => router.push('/account/orders')}
          className="w-full text-left p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <h2 className="text-xl mb-4 text-gray-400">注文情報</h2>
        </button>

        <button
          onClick={() => router.push('/account/profile')}
          className="w-full text-left p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <h2 className="text-xl mb-4 text-gray-400">アカウント情報</h2>
        </button>
      </div>
    </div>
  );
}

