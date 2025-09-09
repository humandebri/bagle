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
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [bulkShipProcessing, setBulkShipProcessing] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');

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
        if (filterDate) {
          params.append('startDate', filterDate);
          params.append('endDate', filterDate);
        }
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
  }, [page, sortKey, sortOrder, filterDate]);

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

  const handleMarkShipped = async (orderId: string) => {
    if (!orderId) return;
    const confirmed = window.confirm('この注文を受渡済に更新しますか？');
    if (!confirmed) return;

    try {
      setProcessingOrderId(orderId);
      const res = await fetch('/api/admin/complete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error('受渡済の更新に失敗しました');

      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, shipped: true } : o)));
    } catch (e) {
      console.error('Mark shipped error:', e);
      alert('受渡済の更新に失敗しました');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleBulkMarkShipped = async () => {
    if (selectedOrders.length === 0) return;
    const eligibleIds = selectedOrders.filter(id => {
      const o = orders.find(x => x.id === id);
      return o && !o.shipped && o.payment_status !== 'cancelled';
    });

    if (eligibleIds.length === 0) {
      alert('受渡済にできる注文がありません（未受渡・未キャンセルのみ対象）');
      return;
    }

    const confirmed = window.confirm(`選択中 ${selectedOrders.length} 件のうち、${eligibleIds.length} 件を受渡済にします。よろしいですか？`);
    if (!confirmed) return;

    setBulkShipProcessing(true);
    try {
      const results = await Promise.allSettled(
        eligibleIds.map(async (orderId) => {
          const res = await fetch('/api/admin/complete-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });
          if (!res.ok) throw new Error('failed');
          return orderId;
        })
      );

      const successIds = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value);

      if (successIds.length > 0) {
        setOrders(prev => prev.map(o => (successIds.includes(o.id) ? { ...o, shipped: true } : o)));
      }

      if (successIds.length < eligibleIds.length) {
        alert(`一部の注文で更新に失敗しました（成功: ${successIds.length} / 予定: ${eligibleIds.length}）`);
      }
    } catch (e) {
      console.error('Bulk mark shipped error:', e);
      alert('一括受渡済の更新に失敗しました');
    } finally {
      setBulkShipProcessing(false);
    }
  };

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">注文管理</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">お渡し日:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setPage(0); setFilterDate(e.target.value); }}
            className="border border-[#887c5d]/30 rounded-lg px-2 py-1 text-sm"
          />
          {filterDate && (
            <button
              onClick={() => { setFilterDate(''); setPage(0); }}
              className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              クリア
            </button>
          )}
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkMarkShipped}
              disabled={bulkShipProcessing}
              className="bg-indigo-600 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base font-medium"
            >
              {bulkShipProcessing ? '一括更新中...' : `選択を受渡済にする`}
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-medium"
            >
              選択した{selectedOrders.length}件を削除
            </button>
          </div>
        )}
      </div>
      
      {loading ? (
        <p className="text-center py-4">読み込み中...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-4">{error}</p>
      ) : (
        <>
          {/* モバイル用カード表示 */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onChange={selectAllOrders}
                  className="rounded"
                />
                すべて選択
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">並び替え:</label>
                <select
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value);
                    setPage(0);
                  }}
                  className="text-sm border border-[#887c5d]/30 rounded-lg px-2 py-1 bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
                >
                  <option value="created_at">注文日</option>
                  <option value="dispatch_date">お渡し日</option>
                  <option value="total_price">金額</option>
                  <option value="customer_name">顧客名</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-sm border border-[#887c5d]/30 rounded-lg px-2 py-1 hover:bg-[#f5f2ea] transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">注文がありません</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white border rounded-lg shadow-sm p-2">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="mt-1 rounded"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {order.customer_name || '顧客名未設定'}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {order.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.payment_status === 'cancelled' ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">キャンセル</span>
                      ) : order.shipped ? (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">受渡済み</span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">未受渡</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">注文日:</span>
                      <span>{order.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">お渡し日:</span>
                      <span>{order.dispatch_date || '-'} {order.dispatch_time || ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">金額:</span>
                      <span className="font-medium">{formatYen(order.total_price)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {order.payment_status !== 'cancelled' && !order.shipped && (
                      <button
                        onClick={() => handleMarkShipped(order.id)}
                        className="flex-1 bg-indigo-600 text-white text-center py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors font-medium"
                      >
                        受渡済にする
                      </button>
                    )}
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex-1 bg-[#887c5d] text-white text-center py-2 rounded-lg text-sm hover:bg-[#6e634b] transition-colors font-medium"
                    >
                      詳細
                    </Link>
                    <button
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="flex-1 bg-white text-red-500 border border-red-500 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PC用テーブル表示 */}
          <div className="hidden lg:block overflow-x-auto">
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
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('id')}>
                    注文ID {sortKey === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customer_name')}>
                    顧客名 {sortKey === 'customer_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  {/* 注文日は表では非表示に変更 */}
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dispatch_date')}>
                    お渡し日 {sortKey === 'dispatch_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dispatch_time')}>
                    受渡時間 {sortKey === 'dispatch_time' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_price')}>
                    合計金額 {sortKey === 'total_price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('shipped')}>
                    受渡状況 {sortKey === 'shipped' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('payment_status')}>
                    状態 {sortKey === 'payment_status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-1 text-left">受渡操作</th>
                  <th className="px-2 py-1 text-left">詳細</th>
                  <th className="px-2 py-1 text-left">削除</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4">注文がありません</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                      />
                    </td>
                    <td className="px-2 py-1 text-left">{order.id.slice(0, 8)}...</td>
                    <td className="px-2 py-1 text-left">{order.customer_name || '-'}</td>
                    {/* 注文日は表では非表示に変更 */}
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
                      {order.payment_status !== 'cancelled' && !order.shipped ? (
                        <button
                          onClick={() => handleMarkShipped(order.id)}
                          disabled={processingOrderId === order.id}
                          className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
                        >
                          {processingOrderId === order.id ? '更新中...' : '受渡済にする'}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-left">
                      <Link href={`/admin/orders/${order.id}`} className="text-[#887c5d] hover:text-[#6e634b] underline transition-colors">詳細</Link>
                    </td>
                    <td className="px-2 py-1 text-left">
                      <button
                        onClick={() => setDeleteConfirmId(order.id)}
                        className="text-red-600 hover:text-red-700 hover:underline transition-colors"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* ページネーション */}
          <div className="flex justify-center sm:justify-end gap-2 mt-4">
            <button
              className="px-3 py-2 border border-[#887c5d]/30 rounded-lg disabled:opacity-50 text-sm sm:text-base hover:bg-[#f5f2ea] transition-colors font-medium"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← 前へ
            </button>
            <span className="px-3 py-1 text-sm sm:text-base">
              ページ {page + 1}
            </span>
            <button
              className="px-3 py-2 border border-[#887c5d]/30 rounded-lg disabled:opacity-50 text-sm sm:text-base hover:bg-[#f5f2ea] transition-colors font-medium"
              onClick={() => setPage(p => p + 1)}
              disabled={orders.length < PAGE_SIZE}
            >
              次へ →
            </button>
          </div>
        </>
      )}

      {/* 個別削除確認ダイアログ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-4">削除確認</h2>
            <p className="mb-6 text-sm sm:text-base">
              注文ID: {deleteConfirmId.slice(0, 8)}... を削除してもよろしいですか？
              <br />
              <span className="text-red-600 text-xs sm:text-sm">この操作は取り消せません。</span>
            </p>
            <div className="flex gap-3 sm:gap-4 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 sm:px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base font-medium"
              >
                いいえ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-medium"
              >
                はい、削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括削除確認ダイアログ */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-4">一括削除確認</h2>
            <p className="mb-6 text-sm sm:text-base">
              選択した{selectedOrders.length}件の注文を削除してもよろしいですか？
              <br />
              <span className="text-red-600 text-xs sm:text-sm">この操作は取り消せません。</span>
            </p>
            <div className="flex gap-3 sm:gap-4 justify-end">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-3 sm:px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base font-medium"
              >
                いいえ
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-medium"
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
