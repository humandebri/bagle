'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, items, dispatch_date, dispatch_time, total_price')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('注文取得エラー:', error.message);
        setError('注文履歴の取得に失敗しました');
      } else if (data) {
        setOrders(data as Order[]);
      }

      setLoading(false);
    };

    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [session, status]);

  if (status === 'loading' || loading) {
    return <div className="p-6 text-center">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  if (!orders.length) {
    return <div className="p-6 text-center text-gray-500">注文履歴がありません。</div>;
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">注文履歴</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="border rounded p-4 bg-white shadow-sm">
            <p className="text-sm text-gray-500 mb-2">
              注文日時: {new Date(order.created_at).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}
            </p>

            <ul className="mb-2 text-sm text-gray-800 space-y-1">
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
          </div>
        ))}
      </div>
    </main>
  );
}
