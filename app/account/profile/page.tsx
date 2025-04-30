'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // ← lib/supabase.ts を使っている前提
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


export default function ProfilePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const { data: session } = useSession();
  
  const router = useRouter();

  const [initialProfile, setInitialProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });


  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.email) {
        console.warn('セッションが見つかりません。ログインしていない可能性があります。');
        setLoading(false);
        return;
      }
  
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email')
        .eq('email', session.user.email) // ← emailで照合
        .maybeSingle();
  
      if (error) {
        console.error('プロフィール取得エラー:', error.message);
      }
  
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');

        setInitialProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
  
      setLoading(false);
    };
  
    fetchProfile();
  }, [session]);

  const close = () => router.back();

  const handleSave = async () => {
    if (!session?.user?.email) {
      setMessage('ログイン情報がありません');
      return;
    }

    const { error } = await supabase.from('profiles').upsert({
      email: session.user.email,         // メールアドレスを一意識別子とする
      first_name: firstName,
      last_name: lastName,
      phone,
    });

    if (error) {
      console.error('保存に失敗しました:', error.message);
      setMessage('プロフィールの保存に失敗しました');
    } else {
      setMessage('プロフィールを保存しました');
      // ✅ 保存成功後、初期値を現在の内容で上書き
      setInitialProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        email, // ← email も念のため
      });
      // router.push('/account'); // ← 保存後に遷移するパスに変更可能
    }  
  };

  // フォームの入力がない場合ボタンを無効化
  const isChanged =
  firstName !== initialProfile.first_name ||
  lastName !== initialProfile.last_name ||
  phone !== initialProfile.phone ||
  email !== initialProfile.email;


  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-2xl mb-6">プロフィール編集</h1>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block mb-1">名</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="太郎"
            />
          </div>
          <div>
            <label className="block mb-1">姓</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="山田"
            />
          </div>
          <div>
            <label className="block mb-1">電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="090-1234-5678"
            />
          </div>
          <div>
            <label className="block mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="example@email.com"
            />
          </div>

                  {/* スマホ用固定フッター */}
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-300 flex md:hidden space-x-4 px-6 py-5 z-10">
          <button
            className="flex-1 py-4 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
            onClick={close}
          >
            キャンセル
          </button>
          <button
              className={`
                flex-1 py-4
                bg-[#887c5d] text-gray-200 text-lg
                hover:bg-gray-600
                mr-12
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            onClick={handleSave}
            disabled={loading || !isChanged}
          >
            保存
          </button>
        </div>

        {/* PC用フッター */}
        <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4">
          <button
            className="flex-1 py-5 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
            onClick={close}
          >
            キャンセル
          </button>
          <button
            className="flex-1 py-5 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
            onClick={handleSave}
            disabled={loading || !isChanged}
          >
            保存
          </button>
        </div>
          {message && <p className="text text-[#887c5d]">{message}</p>}
        </form>
      )}
    </main>
  );
}
