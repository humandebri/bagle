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
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

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

  const handleDelete = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      
      // 削除成功後、リストを更新
      setOrders(orders.filter(order => order.id !== orderId));
      setDeleteConfirmId(null);
    } catch (error) {
      alert('注文の削除に失敗しました');
      console.error('Delete error:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      const res = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds: selectedOrders }),
      });
      if (!res.ok) throw new Error('一括削除に失敗しました');
      
      // 削除成功後、リストを更新
      setOrders(orders.filter(order => !selectedOrders.includes(order.id)));
      setSelectedOrders([]);
      setBulkDeleteConfirm(false);
    } catch (error) {
      alert('注文の一括削除に失敗しました');
      console.error('Bulk delete error:', error);
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">注文管理</h1>
        {selectedOrders.length > 0 && (
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            選択した{selectedOrders.length}件を削除
          </button>
        )}
      </div>
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
                  <th className="px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={selectAllOrders}
                    />
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('id')}>注文ID</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('customer_name')}>顧客名</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('created_at')}>注文日</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('dispatch_date')}>お渡し日</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('dispatch_time')}>受渡時間</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('total_price')}>合計金額</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('shipped')}>受渡状況</th>
                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('payment_status')}>状態</th>
                  <th className="px-2 py-1 text-left">詳細</th>
                  <th className="px-2 py-1 text-left">削除</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4">注文がありません</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="border-b">
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                      />
                    </td>
                    <td className="px-2 py-1 text-left">{order.id.slice(0, 8)}...</td>
                    <td className="px-2 py-1 text-left">{order.customer_name || '-'}</td>
                    <td className="px-2 py-1 text-left">{order.created_at?.slice(0, 10)}</td>
                    <td className="px-2 py-1 text-left">{order.dispatch_date || '-'}</td>
                    <td className="px-2 py-1 text-left">{order.dispatch_time || '-'}</td>
                    <td className="px-2 py-1 text-left">{formatYen(order.total_price)}</td>
                    <td className="px-2 py-1 text-left">{order.shipped ? '受渡済み' : '未受渡'}</td>
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
                    <td className="px-2 py-1 text-left">
                      <button
                        onClick={() => setDeleteConfirmId(order.id)}
                        className="text-red-600 hover:underline"
                      >
                        削除
                      </button>
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

      {/* 個別削除確認ダイアログ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">削除確認</h2>
            <p className="mb-6">
              注文ID: {deleteConfirmId.slice(0, 8)}... を削除してもよろしいですか？
              <br />
              <span className="text-red-600 text-sm">この操作は取り消せません。</span>
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                いいえ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                はい、削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括削除確認ダイアログ */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">一括削除確認</h2>
            <p className="mb-6">
              選択した{selectedOrders.length}件の注文を削除してもよろしいですか？
              <br />
              <span className="text-red-600 text-sm">この操作は取り消せません。</span>
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                いいえ
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                はい、削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 