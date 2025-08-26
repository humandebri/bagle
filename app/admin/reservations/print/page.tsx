'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  user_id: string;
  dispatch_date: string;
  dispatch_time: string;
  shipped: boolean;
  items: OrderItem[];
  total_price: number;
  customer_name: string | null;
  phone: string | null;
  created_at: string;
  payment_status?: string;
};

function PrintPageContent() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;

    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/admin/reservations/print?date=${date}`);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [date]);

  useEffect(() => {
    // ページロード後に自動的に印刷ダイアログを表示
    if (!loading && orders.length > 0) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, orders]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="p-8 text-center">
        <p>日付が指定されていません。</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <p>{format(new Date(date), 'yyyy年MM月dd日', { locale: ja })}の予約はありません。</p>
      </div>
    );
  }

  // アイテムごとの合計を計算
  const itemTotals = orders
    .filter(order => order.payment_status !== 'cancelled')
    .reduce((acc, order) => {
      order.items.forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
      });
      return acc;
    }, {} as Record<string, number>);

  // 時間順にソート
  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = a.dispatch_time || '00:00';
    const timeB = b.dispatch_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="print:m-0 print:p-4 p-8">
      {/* 印刷時のスタイル */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-inside: avoid;
          }
          table {
            font-size: 12px;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          予約一覧 - {format(new Date(date), 'yyyy年MM月dd日(E)', { locale: ja })}
        </h1>
        <div className="text-sm text-gray-600">
          印刷日時: {format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
        </div>
      </div>

      {/* 商品合計 */}
      <div className="mb-6 p-4 border rounded page-break">
        <h2 className="text-lg font-bold mb-3">商品合計</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(itemTotals)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, quantity]) => (
              <div key={name} className="flex justify-between border-b pb-1">
                <span>{name}</span>
                <span className="font-bold">{quantity}個</span>
              </div>
            ))}
        </div>
        <div className="mt-3 pt-2 border-t text-right">
          <span className="font-bold">
            合計: {Object.values(itemTotals).reduce((sum, qty) => sum + qty, 0)}個
          </span>
        </div>
      </div>

      {/* 予約一覧テーブル */}
      <div className="page-break">
        <h2 className="text-lg font-bold mb-3">予約詳細</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">受渡時間</th>
              <th className="border p-2 text-left">お客様名</th>
              <th className="border p-2 text-left">電話番号</th>
              <th className="border p-2 text-left">商品</th>
              <th className="border p-2 text-right">金額</th>
              <th className="border p-2 text-center">状態</th>
              <th className="border p-2 text-center">チェック</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => (
              <tr 
                key={order.id} 
                className={order.payment_status === 'cancelled' ? 'bg-gray-100 text-gray-500' : ''}
              >
                <td className="border p-2">
                  {order.dispatch_time ? format(new Date(`2000-01-01T${order.dispatch_time}`), 'HH:mm') : '-'}
                </td>
                <td className="border p-2">
                  {order.payment_status === 'cancelled' && (
                    <span className="line-through">{order.customer_name || '未設定'}</span>
                  )}
                  {order.payment_status !== 'cancelled' && (
                    <span>{order.customer_name || '未設定'}</span>
                  )}
                </td>
                <td className="border p-2">{order.phone || '-'}</td>
                <td className="border p-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className={order.payment_status === 'cancelled' ? 'line-through' : ''}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                </td>
                <td className="border p-2 text-right">
                  <span className={order.payment_status === 'cancelled' ? 'line-through' : ''}>
                    ¥{order.total_price.toLocaleString()}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  {order.payment_status === 'cancelled' ? (
                    <span className="text-red-600 font-bold">キャンセル</span>
                  ) : order.shipped ? (
                    <span className="text-green-600">受渡済</span>
                  ) : (
                    <span>未受渡</span>
                  )}
                </td>
                <td className="border p-2 text-center">
                  {order.payment_status !== 'cancelled' && !order.shipped && (
                    <div className="w-6 h-6 border-2 border-gray-400 inline-block"></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 印刷ボタン（画面表示時のみ） */}
      <div className="no-print mt-8 flex gap-4 justify-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          印刷する
        </button>
        <button
          onClick={() => window.close()}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PrintPageContent />
    </Suspense>
  );
}