'use client';

import { useState, useEffect } from 'react';
import { useAuthSession } from '@/lib/auth-compat';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, status } = useAuthSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [initial, setInitial] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (status === 'loading') return;
      
      if (status === 'unauthenticated' || !session?.user) {
        setLoading(false);
        return;
      }

      try {
        // サーバーサイドAPIを使用してプロフィールを取得
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/signin');
            return;
          }
          throw new Error('プロフィールの取得に失敗しました');
        }

        const data = await response.json();
        
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? session.user.email ?? '');
        setInitial({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
        });
      } catch {
        // エラーの詳細はログに出力しない（本番環境のため）
        setMessage('プロフィールの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, status, router]);

  const handleSave = async () => {
    if (!session?.user) {
      setMessage('ログインが必要です');
      return;
    }

    try {
      // サーバーサイドAPIを使用してプロフィールを更新
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存に失敗しました');
      }

      const result = await response.json();
      
      setMessage('プロフィールを保存しました');
      setInitial({ first_name: firstName, last_name: lastName, phone });
    } catch (error) {
      // エラーの詳細はログに出力しない（本番環境のため）
      setMessage(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const isChanged =
    firstName !== initial.first_name ||
    lastName !== initial.last_name ||
    phone !== initial.phone;

  const close = () => router.back();

  return (
    <>
      <main className="max-w-md mx-auto p-8">
        <h1 className="text-2xl mb-6">プロフィール編集</h1>

        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <InputField label="姓" value={lastName} onChange={setLastName} />
            <InputField label="名" value={firstName} onChange={setFirstName} />
            <InputField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              type="tel"
              placeholder="090-1234-5678"
            />
            <div>
              <label className="block mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border px-4 py-2 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* PC用フッター */}
            <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4">
              <button
                onClick={close}
                className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !isChanged}
                className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600 disabled:opacity-50"
              >
                保存
              </button>
            </div>

            {message && <p className="mt-4 text-center text-[#887c5d]">{message}</p>}
          </form>
        )}
      </main>

      {/* モバイル用フッター */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-300 flex md:hidden space-x-4 px-6 py-3 z-10">
        <button
          onClick={close}
          className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !isChanged}
          className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border px-4 py-2 rounded"
      />
    </div>
  );
}
