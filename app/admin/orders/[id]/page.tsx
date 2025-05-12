"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

interface Order {
  id: string;
  user_id: string;
  created_at: string;
  total_price: number;
  payment_status: string;
  shipped: boolean;
  customer_name?: string;
  dispatch_date?: string;
  dispatch_time?: string;
  items?: OrderItem[];
}

function formatYen(num: number) {
  return num.toLocaleString("ja-JP", { style: "currency", currency: "JPY" });
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/reservations?id=${id}`);
        if (!res.ok) throw new Error("注文詳細の取得に失敗しました");
        const data = await res.json();
        setOrder(Array.isArray(data) ? data[0] : data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  return (
    <div className="p-6">
      <button className="mb-4 text-blue-600 underline" onClick={() => router.back()}>&larr; 戻る</button>
      <h1 className="text-2xl font-bold mb-6">注文詳細</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : order ? (
        <div className="bg-white rounded shadow p-6">
          <div className="mb-4">
            <div><span className="font-semibold">注文ID:</span> {order.id}</div>
            <div><span className="font-semibold">顧客名:</span> {order.customer_name || '-'}</div>
            <div><span className="font-semibold">注文日:</span> {order.created_at?.slice(0, 10)}</div>
            <div><span className="font-semibold">配送日:</span> {order.dispatch_date || '-'}</div>
            <div><span className="font-semibold">配送時間:</span> {order.dispatch_time || '-'}</div>
            <div><span className="font-semibold">合計金額:</span> {formatYen(order.total_price)}</div>
            <div><span className="font-semibold">決済状況:</span> {
              order.payment_status === 'confirmed'
                ? '成功'
                : (order.payment_status === 'canceled' || order.payment_status === 'cancelled')
                  ? 'キャンセル'
                  : '未決済'
            }</div>
            <div><span className="font-semibold">発送状況:</span> {order.shipped ? '発送済み' : '未発送'}</div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">注文内容</h2>
            {order.items && order.items.length > 0 ? (
              <table className="min-w-full text-sm mb-4">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">商品名</th>
                    <th className="px-2 py-1 text-left">数量</th>
                    <th className="px-2 py-1 text-left">単価</th>
                    <th className="px-2 py-1 text-left">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: OrderItem, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-2 py-1 text-left">{item.name}</td>
                      <td className="px-2 py-1 text-left">{item.quantity}</td>
                      <td className="px-2 py-1 text-left">{formatYen(item.price)}</td>
                      <td className="px-2 py-1 text-left">{formatYen(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>注文内容がありません</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
} 