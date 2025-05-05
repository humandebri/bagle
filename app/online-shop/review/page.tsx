'use client';

import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReviewPage() {
  const stripe    = useStripe();
  const elements  = useElements();
  const router    = useRouter();
  const { data: session } = useSession();

  const items         = useCartStore((s) => s.items);
  const dispatchDate  = useCartStore((s) => s.dispatchDate);
  const dispatchTime  = useCartStore((s) => s.dispatchTime);
  const resetCart     = useCartStore((s) => s.reset);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const bagFee   = 10;
  const total    = subtotal + bagFee;

  // SupabaseからcustomerIdを取得
  useEffect(() => {
    const fetchCustomerId = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('customerId取得エラー:', error.message);
        setError('お支払い情報の取得に失敗しました');
        return;
      }

      if (data?.stripe_customer_id) {
        setCustomerId(data.stripe_customer_id);
      } else {
        setError('お支払い情報が見つかりませんでした');
      }
    };

    fetchCustomerId();
  }, [session]);

  const pay = async () => {
    if (!stripe || !elements) return;

    setError('');
    setLoading(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('カード情報が入力されていません');
      setLoading(false);
      return;
    }

    if (!customerId) {
      setError('Stripeカスタマー情報が取得できませんでした');
      setLoading(false);
      return;
    }

    // クライアントシークレット取得
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerId }),
    });

    const { clientSecret, error: serverError } = await res.json();

    if (!clientSecret || serverError) {
      setError(serverError || '支払いIntentの作成に失敗しました');
      setLoading(false);
      return;
    }

    // 決済処理
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (result.error) {
      setError(result.error.message || '決済に失敗しました');
      setLoading(false);
      return;
    }

    // 成功後
    resetCart();
    router.push('/online-shop/success');
  };

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">注文確認</h1>

      {/* 受取日時 */}
      <div className="text-gray-700 mb-4">
        <p>受取日時 : {dispatchDate} {dispatchTime}</p>
      </div>

      {/* 商品リスト */}
      <div className="mb-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm border-b pb-2">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-gray-500">¥{item.price.toLocaleString()} × {item.quantity}</p>
            </div>
            <p className="self-end">¥{(item.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
        <div className="flex justify-between text-sm border-b pb-2">
          <p className="font-medium">袋代</p>
          <p>¥{bagFee}</p>
        </div>
      </div>

      {/* 合計 */}
      <div className="flex justify-between text-lg mb-4">
        <p>合計</p>
        <p>¥{total.toLocaleString()}</p>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={pay}
        className="w-full bg-[#887c5d] text-white py-3 rounded hover:bg-[#6e624a] disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '処理中...' : '支払う'}
      </button>
    </main>
  );
}
