// app/account/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRouter } from "next/navigation";

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
};

export default function OrderDetailPage() {
  const router = useRouter();
  const close = () => router.back();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, items, dispatch_date, dispatch_time, total_price')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('注文詳細取得エラー:', error.message);
        setError('注文の詳細取得に失敗しました');
      } else if (data) {
        setOrder(data as Order);
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
        注文日時: {new Date(order.created_at).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}
      </p>

      <ul className="mb-4 text-sm text-gray-800 space-y-1">
        {order.items?.map((item, i) => (
          <li key={i}>
            {item.name} × {item.quantity}（¥{item.price.toLocaleString()}）
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 mb-1">
        受取日時: {order.dispatch_date} {order.dispatch_time}
      </p>
      <p className="text-right font-bold">
        合計: ¥{order.total_price.toLocaleString()}
      </p>
    </main>
    {/* スマホ用固定フッター */}
    <div className="fixed bottom-0 w-full bg-white border-t border-gray-300 flex md:hidden space-x-4 px-6 py-5 z-50">
    <button
      className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
      onClick={close}
    >
      戻る
    </button>
    <button
      className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
      onClick={() => router.push(`/account/orders/${order.id}/edit`)}
    >
      変更
    </button>
  </div>

  {/* PC用フッター */}
  <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4">
    <button
      className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
      onClick={close}
    >
      戻る
    </button>
    <button
      className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
      onClick={() => router.push(`/account/orders/${order.id}/edit`)}
    >
      変更
    </button>
  </div>
  </>
  );
}
