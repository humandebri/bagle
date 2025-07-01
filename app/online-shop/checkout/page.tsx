'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useAuthSession } from '@/lib/auth-compat';
import { clientSignIn } from '@/lib/next-auth-client';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/lib/supabase';
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
    const userId = session?.user?.id;
    const userMail = session?.user?.email;
    if (!userId) return;
  
    const fetch = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
  
      if (error) {
        console.error('プロフィール取得失敗:', error.message);
        return;
      }
  
      if (data) {
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? userMail ?? '');
      } else {
        setEmail(userMail ?? '');
      }
    };
  
    fetch();
  }, [session]);

  const handleSubmit = async () => {
    if (!validate()) return;
  
    if (!dispatchDate || !dispatchTime) {
      toast.error('日時を選択してください');
      return;
    }
  
    const userId = session?.user?.id;
    const userMail = session?.user?.email;
  
    if (!userId || !userMail) {
      router.push('/online-shop');
      return;
    }
  
    const { error } = await supabase.from('profiles').upsert({
      user_id: userId, // ← Google IDを主キーに
      email: userMail,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
  
    if (error) {
      console.error('プロフィール保存失敗:', error.message);
      return;
    }
  
    router.push('/online-shop/review');
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
          <div className="border-2 p-3 text-center">
            <button onClick={() => router.push(`/online-shop/dispatch`)}>
              {dispatchDate && dispatchTime ? (
                <DateTimeDisplay_order date={dispatchDate} time={dispatchTime} />
              ) : (
                "日時を選択してください"
              )}
            </button>
          </div>
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
