'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart-store';

export default function CheckoutPage() {
  const dispatchDate = useCartStore((state) => state.dispatchDate);
  const dispatchTime = useCartStore((state) => state.dispatchTime);
  const items = useCartStore((state) => state.items);

  // フォーム入力管理
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 注文確定時のハンドラ
  const handleSubmit = () => {
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

    // 👉 ここで将来的にはSupabase保存などに接続する
    // 今は仮でconsole.logだけ

    // 注文確定後に遷移させる予定なら、router.push('/thank-you') とか
  };

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
              className="w-full border px-4 py-2 rounded"
              placeholder="例：太郎"
            />
          </div>

          <div>
            <label className="block mb-1">姓</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="例：山田"
            />
          </div>

          <div>
            <label className="block mb-1">電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="例：090-1234-5678"
            />
          </div>

          <div>
            <label className="block mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="例：example@email.com"
            />
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
