'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart-store';
import { useSession, signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';


export default function CheckoutPage() {
  const dispatchDate = useCartStore((state) => state.dispatchDate);
  const dispatchTime = useCartStore((state) => state.dispatchTime);
  const items = useCartStore((state) => state.items);

  const { data: session, status } = useSession();
  const router = useRouter();
  // フォーム入力管理
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const validate = () => {
    const newErrors = { firstName: '', lastName: '', phone: '', email: '' };
    let valid = true;
  
    if (!firstName) {
      newErrors.firstName = '名を入力してください';
      valid = false;
    }
    if (!lastName) {
      newErrors.lastName = '姓を入力してください';
      valid = false;
    }
    if (!phone) {
      newErrors.phone = '電話番号を入力してください';
      valid = false;
    } else if (!/^0\d{1,4}-\d{1,4}-\d{3,4}$/.test(phone)) {
      newErrors.phone = '正しい電話番号の形式で入力してください（例: 090-1234-5678）';
      valid = false;
    }
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '正しいメールアドレスの形式で入力してください';
      valid = false;
    }
  
    setErrors(newErrors);
    return valid;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.email) return;
  
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email')
        .eq('email', session.user.email)
        .maybeSingle();
  
      if (error) {
        console.error('プロフィール取得失敗:', error.message);
        return;
      }
  
      if (data) {
        // 空欄でなければ state をセット
        if (data.first_name) setFirstName(data.first_name);
        if (data.last_name) setLastName(data.last_name);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
      }
    };
  
    fetchProfile();
  }, [session]);

  // 注文確定時のハンドラ
  const handleSubmit = async () => {
    if (!validate()) return;
  
    // プロフィール情報も保存（上書きまたは新規）
    const { error: profileError } = await supabase.from('profiles').upsert({
      email: session.user.email,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
  
    if (profileError) {
      console.error('プロフィール保存に失敗:', profileError.message);
      return;
    }
  
    const orderData = {
      firstName,
      lastName,
      phone,
      email,
      dispatchDate,
      dispatchTime,
      cartItems: items,
    };
  
    console.log('送信データ:', orderData);
    
    // 最後に遷移処理を追加（決済ページへ）
    router.push('/online-shop/payment'); 
    // → 注文の保存や遷移処理があればここで追加
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-7rem)] px-6 py-10 bg-white">
        <h1 className="text-2xl text-gray-400 mb-6">ログインしてください</h1>
        <p className="mb-4">ログインして注文を続けましょう。</p>
        <button 
          onClick={() => signIn('google')}
          className="w-full py-3 bg-white border border-gray-300 shadow-sm text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
        >
          <FcGoogle className="text-2xl" />
          <span>Googleでログイン</span>
        </button>
      </main>
    );
  }
  return (
    <main className="min-h-[calc(100vh-7rem)] px-6 py-10 bg-white">
      <h1 className="text-3xl mb-8">注文手続き</h1>

      {/* --- お持ち帰り情報 --- */}
      <section className="mb-10">
        <div className="space-y-2 text-gray-700">
          <p>受取場所</p>
          <p>店舗</p>
          <p className='pt-2'>日時: {dispatchDate} {dispatchTime}</p>
        </div>
      </section>

      {/* --- 連絡先情報 --- */}
      <section className="mb-10">
        <h2 className="text-xl mb-4">連絡先情報</h2>
        <div className="space-y-6">
        <div>
          <label className="block mb-1">名</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={`w-full border px-4 py-2 rounded ${errors.firstName ? 'border-red-500' : ''}`}
            placeholder="例：太郎"
            aria-invalid={!!errors.firstName}
            aria-describedby="firstName-error"
          />
          {errors.firstName && (
            <p id="firstName-error" className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>


        <div>
          <label className="block mb-1">姓</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={`w-full border px-4 py-2 rounded ${errors.lastName ? 'border-red-500' : ''}`}
            placeholder="例：山田"
            aria-invalid={!!errors.lastName}
            aria-describedby="lastName-error"
          />
          {errors.lastName && (
            <p id="lastName-error" className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>


        <div>
          <label className="block mb-1">電話番号</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full border px-4 py-2 rounded ${errors.phone ? 'border-red-500' : ''}`}
            placeholder="例：090-1234-5678"
            aria-invalid={!!errors.phone}
            aria-describedby="phone-error"
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>


        <div>
          <label className="block mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full border px-4 py-2 rounded ${errors.email ? 'border-red-500' : ''}`}
            placeholder="例：example@email.com"
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        </div>
      </section>

      {/* --- 注文確定ボタン --- */}

      <div className="w-full max-w-md px-6 py-7 bg-white md:hidden">
        <button
          onClick={handleSubmit}
          className="w-full py-5 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          次へ
        </button>
      </div>
    </main>
  );
}
