'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const { data: session } = useSession();
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
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;

      if (!userId || !userEmail) {
        console.warn('ログインセッションが見つかりません');
        setLoading(false);
        return;
      }

      setEmail(userEmail);

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('プロフィール取得エラー:', error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhone(data.phone ?? '');
        setInitial({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [session]);

  const handleSave = async () => {
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) {
      setMessage('ログイン情報が不足しています');
      return;
    }

    const { error } = await supabase.from('profiles').upsert({
      user_id: userId,
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      phone,
    });

    if (error) {
      console.error('プロフィール保存エラー:', error.message);
      setMessage('保存に失敗しました');
    } else {
      setMessage('プロフィールを保存しました');
      setInitial({ first_name: firstName, last_name: lastName, phone });
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
