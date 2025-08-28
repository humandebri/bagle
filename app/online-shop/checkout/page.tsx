'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useAuthSession } from '@/lib/auth-compat';
import { clientSignIn } from '@/lib/next-auth-client';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';
import {  DateTimeDisplay_order } from '@/components/DateTimeDisplay';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const router       = useRouter();
  const { data: session, status } = useAuthSession();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({
    firstName: '', lastName: '', phone: '', email: '',
  });

  const validate = () => {
    const e = { firstName: '', lastName: '', phone: '', email: '' };
    let ok = true;
  
    if (!firstName) {
      e.firstName = '名を入力してください';
      ok = false;
    }
  
    if (!lastName) {
      e.lastName = '姓を入力してください';
      ok = false;
    }
  
    if (!phone || !/^\d+$/.test(phone)) {
      e.phone = '数字のみを入力してください（例: 09012345678）';
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'メール形式が不正です';
      ok = false;
    }
  
    setErrors(e);
    return ok;
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) return;
  
    const fetchProfile = async () => {
      try {
        // サーバーサイドAPIを使用してプロフィールを取得
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
          // エラーの詳細は表示しない
          return;
        }
  
        const data = await response.json();
        
        if (data) {
          setFirstName(data.first_name ?? '');
          setLastName(data.last_name ?? '');
          setPhone(data.phone ?? '');
          setEmail(data.email ?? session.user?.email ?? '');
        } else {
          setEmail(session.user?.email ?? '');
        }
      } catch {
        // エラーの詳細はログに出力しない（本番環境のため）
        setEmail(session.user?.email ?? '');
      }
    };
  
    fetchProfile();
  }, [session, status]);

  const handleSubmit = async () => {
    if (!validate()) return;
  
    if (!dispatchDate || !dispatchTime) {
      toast.error('日時を選択してください');
      return;
    }
    
    // 時間枠の有効性をチェック
    try {
      const response = await fetch('/api/validate-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: dispatchDate, 
          time: dispatchTime,
          isUserSelection: true // This is the user's current cart selection
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        toast.error("選択された時間枠は利用できません", {
          description: result.message,
        });
        // 無効な時間枠の場合、日時選択画面へ誘導
        router.push('/online-shop/dispatch');
        return;
      }
    } catch {
      toast.error("エラーが発生しました", {
        description: "もう一度お試しください。",
      });
      return;
    }
  
    if (!session?.user?.id) {
      router.push('/online-shop');
      return;
    }
  
    // サーバーサイドAPIを使用してプロフィールを保存
    try {
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
        toast.error('プロフィールの保存に失敗しました');
        return;
      }
  
      router.push('/online-shop/review');
    } catch {
      toast.error('プロフィールの保存に失敗しました');
    }
  };
  

  if (status === 'loading') {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-7rem)] px-6 py-10 bg-white">
        <h1 className="text-2xl text-gray-400 mb-6">ログインしてください</h1>
        <button
          onClick={() => clientSignIn()}
          className="w-full py-3 bg-white border border-gray-300 shadow-sm text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
        >
          <FcGoogle className="text-2xl" />
          <span>Googleでログイン</span>
        </button>
      </main>
    );
  }

  return (
    <>
      <main className="pb-20 md:pb-5 min-h-[calc(100vh-7rem)] px-6 py-5 bg-white">
        <h1 className="text-3xl pb-4">注文手続き</h1>

        <section className="pb-5 text-gray-700 space-y-2">
          <p className="text-lg">受取場所 : </p>
          <p>店舗</p>
          <p className="text-lg">受取日時 : </p>
          <button 
            onClick={() => router.push(`/online-shop/dispatch`)}
            className="w-full border-2 p-3 text-center hover:bg-gray-50 transition-colors"
          >
            {dispatchDate && dispatchTime ? (
              <DateTimeDisplay_order date={dispatchDate} time={dispatchTime} />
            ) : (
              "日時を選択してください"
            )}
          </button>
        </section>

        <section className="pb-5">
          <h2 className="text-lg pb-5">連絡先情報</h2>
          <div className="space-y-6">
            <InputField label="姓" value={lastName} onChange={setLastName} error={errors.lastName} placeholder="例：山田" />
            <InputField label="名" value={firstName} onChange={setFirstName} error={errors.firstName} placeholder="例：太郎" />
            <InputField label="電話番号" value={phone} onChange={setPhone} error={errors.phone} placeholder="例：09012345678(ハイフンなし)" type="tel" />
            <InputField label="メールアドレス" value={email} onChange={setEmail} error={errors.email} placeholder="例：example@email.com" type="email" />
          </div>
        </section>
      </main>

      {/* スマートフォン用の固定ボタン */}
      <div className="fixed bottom-0 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          次へ
        </button>
      </div>

      {/* PC用のボタン */}
      <div className="hidden md:block px-6 py-3">
        <button
          onClick={handleSubmit}
          className="w-full max-w-md py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          次へ
        </button>
      </div>
    </>
  );
}

function InputField({
  label, value, onChange, error, placeholder, type = 'text'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border px-4 py-2 rounded ${error ? 'border-red-500' : ''}`}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
