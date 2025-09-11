'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthSession } from '@/lib/auth-compat';
import { useState, useEffect } from 'react';
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
  '12:00': '15:00',
} as const;

const formatTimeRange = (startTime: string): string => {
  const start = startTime.slice(0, 5);
  const end = TIME_RANGE_MAP[start as keyof typeof TIME_RANGE_MAP];
  return end ? `${start} - ${end}` : start;
};

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useAuthSession();

  const items = useCartStore((s) => s.items);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const resetCart = useCartStore((s) => s.reset);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState('');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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


  const confirmOrder = async () => {
    if (!session?.user?.id) {
      setError('ログインが必要です');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 時間枠の有効性を最終チェック
      const validateResponse = await fetch('/api/validate-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: dispatchDate, 
          time: dispatchTime,
          isUserSelection: true // This is the user's current cart selection
        }),
      });

      const validateResult = await validateResponse.json();

      if (!validateResult.valid) {
        setError(validateResult.message);
        setLoading(false);
        // 無効な時間枠の場合、日時選択画面へ誘導
        setTimeout(() => {
          router.push('/dispatch');
        }, 2000);
        return;
      }

      // 注文情報を保存
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          dispatch_date: dispatchDate,
          dispatch_time: dispatchTime,
          user_id: session?.user?.id,
          total_price: total
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.error('注文保存エラー:', orderData);
        }
        setError(orderData.details || orderData.error || '注文情報の保存に失敗しました');
        setLoading(false);
        return;
      }

      // 成功後
      const orderId = orderData.order?.id;  // 注文IDを取得
      resetCart();
      
      // 確認メールを送信
      // 注文IDと注文データをAPIに送信（send-cancellation-emailと同じ方式）
      console.log('Sending confirmation email for order_id:', orderId);

      const emailRes = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,  // 注文IDを送信（優先）
          userId: session?.user?.id,  // フォールバック用
          orderDetails: {
            items,
            dispatchDate: formatDate(dispatchDate || ''),
            dispatchTime: formatTimeRange(dispatchTime || ''),
            total
          }
        }),
      });

      if (!emailRes.ok) {
        const errorData = await emailRes.json();
        console.error('メール送信エラー:', errorData);
      } else {
        console.log('Confirmation email sent successfully');
      }

      router.push('/success');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('注文処理エラー:', error);
      }
      setError('注文処理中にエラーが発生しました');
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

      {/* 受取場所 */}
      <div className="text-gray-700 mb-4">
        <h3 className=" mb-2">▪️お持ち帰り場所</h3>
        〒790-0004 愛媛県松山市大街道3丁目 7-3 1F
      </div>

      {/* 支払い方法 */}
      <div className="text-gray-700 mb-4">
        <h3 className=" mb-2">▪️お支払い方法</h3>
        <p className="mb-2">店頭にてお支払いください</p>
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
                <p className="text-gray-500">¥{item.price.toLocaleString()}(税込) × {item.quantity}</p>
              </div>
              <p className="self-end">¥{(item.price * item.quantity).toLocaleString()}(税込)</p>
            </div>
          ))}
        </div>
      )}
      </div>
      {/* 合計 */}
      {!loading && (
        <div className="flex justify-between text-lg mb-4">
          <p>合計</p>
          <p>¥{total.toLocaleString()}(税込)</p>
        </div>
      )}
      {/* キャンセルポリシーの案内 */}
      <div className="text-xs text-gray-600 mt-4 pb-5 leading-relaxed space-y-1">
        <p>・キャンセルは <strong>2日前まで</strong> でマイページから可能です。</p>
        <p>・前日のキャンセルはお電話（📞{STORE_PHONE_NUMBER}）でご連絡ください。</p>
        <p><strong>・当日どうしても来られなくなった場合は、冷凍での後日のお引き取りをお願い致します。必ずお電話でご連絡下さい。
        </strong></p>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={confirmOrder}
        className="w-full bg-[#887c5d] text-white py-3 rounded hover:bg-[#6e624a] disabled:opacity-50"
        disabled={loading || !session || !!dateError}
      >
        {loading ? '処理中...' : '注文を確定する'}
      </button>
    </main>
  );
}
