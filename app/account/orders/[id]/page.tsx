// app/account/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRouter } from "next/navigation";
import { formatDate, formatTimeRange } from '@/components/DateTimeDisplay';

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  created_at: string;
  items: OrderItem[];
  dispatch_date: string;
  dispatch_time: string;
  total_price: number;
  payment_status: string;
  shipped: boolean;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, items, dispatch_date, dispatch_time, total_price, payment_status, shipped')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('注文詳細取得エラー:', error.message);
        setError('注文の詳細取得に失敗しました');
      } else if (data) {
        setOrder(data as Order);
        // 受取日が現在日時から次の日かどうかをチェック
        const dispatchDate = new Date(data.dispatch_date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        // キャンセル済みの場合は編集不可
        setIsEditable(dispatchDate > tomorrow && data.payment_status !== 'cancelled');
      }

      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="p-6 text-center">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!order) return <div className="p-6 text-center">注文が見つかりません。</div>;

  return (
    <>
    <main className="max-w-xl mx-auto p-6 pb-15 ">
      <h1 className="text-2xl font-bold mb-4">注文詳細</h1>
      <p className="text-sm text-gray-500 mb-2">
        注文ID: {order.id}<br />
        注文日時: {formatDate(order.created_at)} {new Date(order.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {order.payment_status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-600 font-medium">この注文はキャンセルされています。</p>
        </div>
      )}

      {!order.shipped && order.payment_status !== 'cancelled' && (
        <div className="bg-[#887c5d]/10 border border-[#887c5d]/20 rounded p-4 mb-4">
          <p className="text-[#887c5d] font-medium">この注文は受取待ちです。</p>
        </div>
      )}

      {order.shipped && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
          <p className="text-green-600 font-medium">この注文は受取済みです。</p>
        </div>
      )}

      <ul className="mb-4 text-sm text-gray-800 space-y-1">
        {order.items?.map((item, i) => (
          <li key={i}>
            {item.name} × {item.quantity}（¥{item.price.toLocaleString()}）
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 mb-1">
        受取日時: {formatDate(order.dispatch_date)} {formatTimeRange(order.dispatch_time)}
      </p>
      <p className="text-right font-bold">
        合計: ¥{order.total_price.toLocaleString()}
      </p>
      {/* PC用フッター */}
      <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4 justify-center">
        <button
          className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
          onClick={() => router.push(`/account/orders`)}
        >
          戻る
        </button>
        <button
          className={`flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg ${isEditable ? 'hover:bg-gray-600' : 'opacity-50 cursor-not-allowed'}`}
          onClick={() => isEditable && router.push(`/account/orders/${order.id}/edit`)}
          disabled={!isEditable}
        >
          変更
        </button>
      </div>

      {/* スマホ用固定フッター */}
    </main>
    {/* スマホ用固定フッター */}
    <div className="fixed bottom-0 w-full bg-white border-t border-gray-300 flex md:hidden space-x-4 px-6 py-5 z-50">
    <button
      className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
      onClick={() => router.push(`/account/orders`)}
    >
      戻る
    </button>
    <button
      className={`flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg ${isEditable ? 'hover:bg-gray-600' : 'opacity-50 cursor-not-allowed'}`}
      onClick={() => isEditable && router.push(`/account/orders/${order.id}/edit`)}
      disabled={!isEditable}
    >
      変更
    </button>
  </div>


  </>
  );
}
