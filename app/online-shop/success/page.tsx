
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthSession } from '@/lib/auth-compat';

export default function SuccessPage() {
  const router = useRouter();
  const { data: session } = useAuthSession();

  const items = useCartStore((s) => s.items);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const resetCart = useCartStore((s) => s.reset);
  const [saved, setSaved] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0) + 10;

  useEffect(() => {
    const parseJapaneseDate = (jpDate: string): string => {
      const match = jpDate.match(/^(\d{1,2})月(\d{1,2})日/);
      if (!match) return '';
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    };

    const saveOrder = async () => {
      if (!session?.user?.id || items.length === 0 || saved) return;

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          dispatch_date: parseJapaneseDate(dispatchDate || ''),
          dispatch_time: dispatchTime,
        }),
      });

      if (res.ok) {
        setSaved(true);
        resetCart();
      } else {
        const data = await res.json();
        console.error('注文保存エラー:', data.error || '不明なエラー');
      }
    };

    saveOrder();
  }, [session, items, dispatchDate, dispatchTime, total, saved, resetCart]);

  return (
    <main className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">ご注文ありがとうございます！</h1>
      <p className="text-gray-700 mb-8">
        ご注文を受け付けました。受取日時に店舗までお越しください。
      </p>
      <div className="bg-gray-100 p-4 mb-8 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>お支払いについて：</strong>店頭にて現金でお支払いください。
        </p>
      </div>
      <button
        onClick={() => router.push('/online-shop')}
        className="bg-[#887c5d] text-white px-6 py-3 rounded hover:bg-[#6e624a]"
      >
        トップページに戻る
      </button>
    </main>
  );
}
