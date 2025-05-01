'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';

export default function SuccessPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const items         = useCartStore((s) => s.items);
  const dispatchDate  = useCartStore((s) => s.dispatchDate);
  const dispatchTime  = useCartStore((s) => s.dispatchTime);
  const resetCart     = useCartStore((s) => s.reset);
  const [saved, setSaved] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0) + 10;

  useEffect(() => {
    const saveOrder = async () => {
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;

      if (!userId || items.length === 0 || saved) return;

      // ① プロフィール取得（UUIDで検索）
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError.message);
      }

      const customerName = profile
        ? `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim()
        : '未登録ユーザー';

      const phone = profile?.phone ?? '';

      // ② 注文データ保存
      const { error: orderError } = await supabase.from('orders').insert({
        user_id: userId,
        items,
        dispatch_date: dispatchDate,
        dispatch_time: dispatchTime,
        total_price: total,
        customer_name: customerName,
        phone,
      });

      if (orderError) {
        console.error('注文保存エラー:', orderError.message);
      } else {
        setSaved(true);
        resetCart();
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
      <button
        onClick={() => router.push('/online-shop')}
        className="bg-[#887c5d] text-white px-6 py-3 rounded hover:bg-[#6e624a]"
      >
        トップページに戻る
      </button>
    </main>
  );
}
