// app/account/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    <main className="max-w-xl mx-auto p-6">
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
  );
}
