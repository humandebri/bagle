"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  user_id: string;
  created_at: string;
  total_price: number;
  shipped: boolean;
  customer_name?: string;
  dispatch_date?: string;
  dispatch_time?: string;
  payment_status?: string;
}

function formatYen(num: number) {
  return num.toLocaleString("ja-JP", { style: "currency", currency: "JPY" });
}

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('order', sortOrder);
        params.append('sortKey', sortKey);
        params.append('limit', PAGE_SIZE.toString());
        params.append('offset', (page * PAGE_SIZE).toString());
        const res = await fetch(`/api/admin/reservations?${params.toString()}`);
        if (!res.ok) throw new Error("注文一覧の取得に失敗しました");
        const data = await res.json();
        setOrders(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setPage(0);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">注文管理</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('id')}>注文ID</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('customer_name')}>顧客名</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('created_at')}>注文日</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('dispatch_date')}>配送日</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('dispatch_time')}>配送時間</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('total_price')}>合計金額</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('shipped')}>発送状況</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('payment_status')}>状態</th>
                  <th className="px-2 py-1 text-left">詳細</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-4">注文がありません</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="border-b">
                    <td className="px-2 py-1 text-left">{order.id.slice(0, 8)}...</td>
                    <td className="px-2 py-1 text-left">{order.customer_name || '-'}</td>
                    <td className="px-2 py-1 text-left">{order.created_at?.slice(0, 10)}</td>
                    <td className="px-2 py-1 text-left">{order.dispatch_date || '-'}</td>
                    <td className="px-2 py-1 text-left">{order.dispatch_time || '-'}</td>
                    <td className="px-2 py-1 text-left">{formatYen(order.total_price)}</td>
                    <td className="px-2 py-1 text-left">{order.shipped ? '発送済み' : '未発送'}</td>
                    <td className="px-2 py-1 text-left">
                      {order.payment_status === 'cancelled' ? (
                        <span className="text-red-600 font-medium">キャンセル</span>
                      ) : (
                        <span className="text-green-600">有効</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-left">
                      <Link href={`/admin/orders/${order.id}`} className="text-blue-600 underline">詳細</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >←</button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(p => p + 1)}
              disabled={orders.length < PAGE_SIZE}
            >→</button>
          </div>
        </>
      )}
    </div>
  );
} 