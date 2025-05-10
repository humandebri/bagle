'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DateTimeDisplay_order } from '@/components/DateTimeDisplay';
import { STORE_PHONE_NUMBER } from '@/lib/constants';

// 日付と時間のフォーマット関数をインポート
const formatDate = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return '';
  }
};

const TIME_RANGE_MAP = {
  '11:00': '11:15',
  '11:15': '11:30',
  '11:30': '11:45',
  '11:45': '12:00',
  '12:00': '13:00',
  '13:00': '14:00',
  '14:00': '15:00',
} as const;

const formatTimeRange = (startTime: string): string => {
  const start = startTime.slice(0, 5);
  const end = TIME_RANGE_MAP[start as keyof typeof TIME_RANGE_MAP];
  return end ? `${start} - ${end}` : start;
};

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const items = useCartStore((s) => s.items);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const resetCart = useCartStore((s) => s.reset);
  const paymentMethodId = useCartStore((s) => s.paymentMethodId);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState('');

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const bagFee = 10;
  const total = subtotal + bagFee;

  // 日付のバリデーション
  useEffect(() => {
    if (!dispatchDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dispatchDate);
    selectedDate.setHours(0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    if (selectedDate < twoDaysLater) {
      setDateError('受取日は2日後以降を選択してください');
    } else {
      setDateError('');
    }
  }, [dispatchDate]);

  // SupabaseからcustomerIdを取得
  useEffect(() => {
    const fetchCustomerId = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('customerId取得エラー:', error.message);
        setError('お支払い情報の取得に失敗しました');
        return;
      }

      if (data?.customer_id) {
        setCustomerId(data.customer_id);
      } else {
        setError('お支払い情報が見つかりませんでした');
      }
    };

    fetchCustomerId();
  }, [session]);

  const pay = async () => {
    if (!customerId || !paymentMethodId) {
      setError('支払い情報が設定されていません');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 支払いIntentを作成
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: total,
          customerId,
          paymentMethodId
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('PaymentIntent作成エラー:', data);
        setError(data.details || data.error || '支払いIntentの作成に失敗しました');
        setLoading(false);
        return;
      }

      const { paymentIntent } = data;

      // 注文情報を保存
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          dispatch_date: dispatchDate,
          dispatch_time: dispatchTime,
          user_id: session?.user?.id,
          paymentIntentId: paymentIntent.id
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        console.error('注文保存エラー:', orderData);
        setError(orderData.details || orderData.error || '注文情報の保存に失敗しました');
        setLoading(false);
        return;
      }

      // 成功後
      resetCart();
      
      // 確認メールを送信
      const emailRes = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          orderDetails: {
            items,
            dispatchDate: formatDate(dispatchDate || ''),
            dispatchTime: formatTimeRange(dispatchTime || ''),
            total
          }
        }),
      });

      if (!emailRes.ok) {
        console.error('メール送信エラー:', await emailRes.json());
      }

      router.push('/online-shop/success');
    } catch (error) {
      console.error('決済処理エラー:', error);
      setError('決済処理中にエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">注文確認</h1>

      {/* 受取日時 */}
      <div className="text-gray-700 mb-4">
        <h3 className=" mb-2">▪️お持ち帰り日時</h3>
        <DateTimeDisplay_order date={dispatchDate || ''} time={dispatchTime || ''} />
        {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
      </div>

      {/* 受取日時 */}
      <div className="text-gray-700 mb-4">
        <h3 className=" mb-2">▪️お持ち帰り場所</h3>
        店舗住所
      </div>

      {/* 商品リスト */}
      <div className="text-gray-700 mb-4 ">
        <h3 className=" mb-2">▪️注文商品</h3>
      {!loading && (
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
      )}
      </div>
      {/* 合計 */}
      {!loading && (
        <div className="flex justify-between text-lg mb-4">
          <p>合計</p>
          <p>¥{total.toLocaleString()}</p>
        </div>
      )}
      {/* キャンセルポリシーの案内 */}
      <div className="text-xs text-gray-600 mt-4 pb-5 leading-relaxed space-y-1">
        <p>・キャンセルは <strong>2日前まで無料</strong> でマイページから可能です。</p>
        <p>・前日のキャンセルはお電話（📞{STORE_PHONE_NUMBER}）でご連絡ください。</p>
        <p><strong>・当日以降のキャンセル・無断キャンセルには、キャンセル料（商品代金の100%）を頂戴します。</strong></p>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={pay}
        className="w-full bg-[#887c5d] text-white py-3 rounded hover:bg-[#6e624a] disabled:opacity-50"
        disabled={loading || !customerId || !paymentMethodId || !!dateError}
      >
        {loading ? '処理中...' : '支払う'}
      </button>
    </main>
  );
}
