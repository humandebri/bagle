'use client';

import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store'; // ← 追加！
import { useSession } from 'next-auth/react'; // ← 追加


export default function PaymentPage() {
  const { data: session } = useSession(); // ← 追加
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const setPMId = useCartStore((s) => s.setPaymentMethodId); // ← 支払い用に保存

  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

    // ✅ customerId を session から取得して POST
    useEffect(() => {
      const fetchClientSecret = async () => {
        const customerId = session?.user?.id; // ← SupabaseのUUIDなど
  
        if (!customerId) {
          setError('カスタマーIDが見つかりません');
          return;
        }
  
        const res = await fetch('/api/create-setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId }),
        });
  
        const { clientSecret, error } = await res.json();
        if (error) {
          setError(error);
        } else {
          setClientSecret(clientSecret);
        }
      };
  
      if (session) {
        fetchClientSecret();
      }
    }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setError('カード情報が正しく入力されていません');
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (result.error) {
      setError(result.error.message || 'カード登録に失敗しました');
      setLoading(false);
      return;
    }

    // ✅ 支払い時に使うために payment_method ID を保持
    const paymentMethodId = result.setupIntent.payment_method as string;
    setPMId(paymentMethodId); // Zustandに保存
    router.push('/online-shop/review');
  };

  const stripeStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#333',
        '::placeholder': { color: '#aaa' },
      },
      invalid: {
        color: '#e3342f',
      },
    },
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">お支払い</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="block text-sm font-medium text-gray-700">
          カード情報
        </label>

        <div className="rounded-md border border-gray-300 bg-white p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">カード番号</label>
            <CardNumberElement options={stripeStyle} className="w-full" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">有効期限</label>
              <CardExpiryElement options={stripeStyle} className="w-full" />
            </div>

            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">CVC</label>
              <CardCvcElement options={stripeStyle} className="w-full" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[#887c5d] text-white py-3 rounded disabled:opacity-50"
          disabled={!stripe || !clientSecret || loading}
        >
          {loading ? '登録中...' : 'カードを登録'}
        </button>
      </form>
    </main>
  );
}
