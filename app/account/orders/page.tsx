'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
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
  shipped: boolean;
  payment_status: string;
};

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'shipped' | 'cancelled'>('pending');

  useEffect(() => {
    const fetchOrders = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, items, dispatch_date, dispatch_time, total_price, shipped, payment_status')
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

  const filteredOrders = orders.filter((order) => {
    if (filter === 'shipped') return order.shipped;
    if (filter === 'cancelled') return order.payment_status === 'cancelled';
    return !order.shipped && order.payment_status !== 'cancelled';
  });

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">注文履歴</h1>

      {/* タブ切り替え */}
      <div className="flex mb-6 space-x-4">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded border ${
            filter === 'pending'
              ? 'bg-[#887c5d] text-white'
              : 'bg-white text-gray-700'
          }`}
        >
          受取待
        </button>
        <button
          onClick={() => setFilter('shipped')}
          className={`px-4 py-2 rounded border ${
            filter === 'shipped'
              ? 'bg-[#887c5d] text-white'
              : 'bg-white text-gray-700'
          }`}
        >
          受取済
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 rounded border ${
            filter === 'cancelled'
              ? 'bg-[#887c5d] text-white'
              : 'bg-white text-gray-700'
          }`}
        >
          キャンセル済
        </button>
      </div>

      {/* フィルター結果 */}
      {filteredOrders.length === 0 ? (
        <div className="text-center text-gray-500">
          {filter === 'pending' && '受け取り待ちの注文はありません。'}
          {filter === 'shipped' && '受け取り済みの注文はありません。'}
          {filter === 'cancelled' && 'キャンセル済みの注文はありません。'}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block border rounded p-4 bg-white shadow-sm hover:bg-gray-50 transition"
            >
              <p className="text-sm text-gray-500 mb-2">
                注文日時: {formatDate(order.created_at)} {new Date(order.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>

              <ul className="mb-2 text-sm text-gray-800 space-y-1">
                {order.items?.map((item, i) => (
                  <li key={i}>
                    {item.name} × {item.quantity}（¥{item.price.toLocaleString()}）
                  </li>
                ))}
              </ul>

              <p className="text-sm text-gray-600 mb-1">
                受取日時: {formatDate(order.dispatch_date)} {formatTimeRange(order.dispatch_time)}
              </p>
              <div className="flex justify-between items-center">
                <p className="text-right font-bold">
                  合計: ¥{order.total_price.toLocaleString()}
                </p>
                {order.payment_status === 'cancelled' && (
                  <span className="text-red-600 text-sm font-medium">キャンセル済み</span>
                )}
                {!order.shipped && order.payment_status !== 'cancelled' && (
                  <span className="text-[#887c5d] text-sm font-medium">受取待ち</span>
                )}
                {order.shipped && (
                  <span className="text-green-600 text-sm font-medium">受取済み</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
